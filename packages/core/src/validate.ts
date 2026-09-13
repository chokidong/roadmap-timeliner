import { hasOwn, isObject } from './json.js';
import type { Issue, JsonObject, JsonValue, RoadmapDocument, ValidationMode, ValidationResult } from './types.js';
import { Ajv2020 } from 'ajv/dist/2020.js';
import * as formatsModule from 'ajv-formats';
import schema from '../../../roadmap.schema.json' with { type: 'json' };

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const COLOR = /^#[0-9A-Fa-f]{6}$/;
const PATTERNS = new Set(['solid', 'diagonal', 'horizontal', 'vertical', 'dot', 'grid', 'gradient']);
const BORDERS = new Set(['solid', 'dashed', 'dotted', 'none']);
const PRIORITIES = new Set(['none', 'low', 'medium', 'high', 'critical']);
const SCALES = new Set(['auto', 'week', 'month', 'quarter']);
const SHAPES = new Set(['flag', 'diamond', 'pin', 'rocket', 'star', 'check', 'circle', 'heart', 'fire', 'zap', 'shield', 'tag', 'square', 'triangle']);
const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats: (instance: Ajv2020) => void = ((formatsModule as unknown as { default?: (instance: Ajv2020) => void }).default ?? formatsModule) as (instance: Ajv2020) => void;
addFormats(ajv);
const strictSchema = ajv.compile(schema);

function calendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function compareDates(left: string, right: string): number {
  return left.localeCompare(right);
}

function pointer(...parts: (string | number)[]): string {
  return '/' + parts.map(String).map(part => part.replaceAll('~', '~0').replaceAll('/', '~1')).join('/');
}

export function validateDocument(input: unknown, mode: ValidationMode = 'strict'): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const add = (path: string, code: string, message: string, severity: 'error' | 'warning' = 'error') =>
    (severity === 'error' ? errors : warnings).push({ path, code, message, severity });
  const checkObject = (value: unknown, path: string): value is JsonObject => {
    if (!isObject(value)) { add(path, 'INVALID_TYPE', 'Object expected.'); return false; }
    return true;
  };
  const checkString = (value: unknown, path: string, code = 'INVALID_TYPE'): value is string => {
    if (typeof value !== 'string') { add(path, code, 'String expected.'); return false; }
    return true;
  };
  const checkArray = (value: unknown, path: string): value is JsonValue[] => {
    if (!Array.isArray(value)) { add(path, 'INVALID_TYPE', 'Array expected.'); return false; }
    return true;
  };
  const require = (value: JsonObject, fields: string[], path: string) => fields.forEach(field => {
    if (!hasOwn(value, field)) add(path, `MISSING_${field.toUpperCase()}`, `Required field '${field}' is missing.`);
  });
  const optionalString = (value: JsonObject, field: string, path: string) => {
    if (hasOwn(value, field) && typeof value[field] !== 'string') add(pointer(path.slice(1), field), 'INVALID_TYPE', 'String expected.');
  };

  if (mode === 'strict' && !strictSchema(input)) {
    for (const schemaError of strictSchema.errors ?? []) {
      add(schemaError.instancePath || '/', `SCHEMA_${schemaError.keyword.toUpperCase()}`, schemaError.message ?? 'Schema validation failed.');
    }
  }

  if (!checkObject(input, '/')) return { valid: false, errors, warnings };
  require(input, ['version', 'roadmap'], '/');
  if (input.version !== '1.0') add('/version', 'INVALID_VERSION', "Version must be '1.0'.");
  if (!checkObject(input.roadmap, '/roadmap')) return { valid: false, errors, warnings };
  const roadmap = input.roadmap;
  require(roadmap, ['id', 'title', 'statuses', 'badges', 'categories', 'milestones'], '/roadmap');
  if (!checkString(roadmap.id, '/roadmap/id') || !ID.test(roadmap.id)) add('/roadmap/id', 'INVALID_ID', 'ID must use letters, numbers, hyphens, or underscores.');
  if (!checkString(roadmap.title, '/roadmap/title') || !roadmap.title.trim()) add('/roadmap/title', 'INVALID_NAME', 'Title is required.');
  optionalString(roadmap, 'subtitle', '/roadmap');
  optionalString(roadmap, 'description', '/roadmap');
  optionalString(roadmap, 'startDate', '/roadmap');
  optionalString(roadmap, 'endDate', '/roadmap');
  if (hasOwn(roadmap, 'startDate') && !calendarDate(roadmap.startDate)) add('/roadmap/startDate', 'INVALID_DATE', 'Calendar date expected.');
  if (hasOwn(roadmap, 'endDate') && !calendarDate(roadmap.endDate)) add('/roadmap/endDate', 'INVALID_DATE', 'Calendar date expected.');
  if (calendarDate(roadmap.startDate) && calendarDate(roadmap.endDate) && compareDates(roadmap.startDate, roadmap.endDate) > 0) add('/roadmap', 'START_AFTER_END', 'Start date must not be after end date.');
  if (hasOwn(roadmap, 'rangeLocked') && typeof roadmap.rangeLocked !== 'boolean') add('/roadmap/rangeLocked', 'INVALID_TYPE', 'Boolean expected.');
  if (roadmap.rangeLocked === true && (!calendarDate(roadmap.startDate) || !calendarDate(roadmap.endDate))) add('/roadmap', 'LOCKED_RANGE_REQUIRES_DATES', 'Locked range requires startDate and endDate.');
  if (hasOwn(roadmap, 'locale') && roadmap.locale !== 'ko' && roadmap.locale !== 'en') add('/roadmap/locale', 'INVALID_LOCALE', 'Locale must be ko or en.');
  if (hasOwn(roadmap, 'scale') && (typeof roadmap.scale !== 'string' || !SCALES.has(roadmap.scale))) add('/roadmap/scale', 'INVALID_SCALE', 'Unsupported scale.');

  if (!checkArray(roadmap.statuses, '/roadmap/statuses') || !checkArray(roadmap.badges, '/roadmap/badges') || !checkArray(roadmap.categories, '/roadmap/categories') || !checkArray(roadmap.milestones, '/roadmap/milestones')) return { valid: false, errors, warnings };
  const statusIds = new Set<string>();
  roadmap.statuses.forEach((value, index) => {
    const path = pointer('roadmap', 'statuses', index);
    if (!checkObject(value, path)) return;
    require(value, ['id', 'name', 'color', 'pattern', 'border'], path);
    if (typeof value.id !== 'string' || !ID.test(value.id)) add(pointer('roadmap', 'statuses', index, 'id'), 'INVALID_ID', 'Invalid status ID.');
    else if (statusIds.has(value.id)) add(path, 'DUPLICATE_ID', 'Duplicate status ID.'); else statusIds.add(value.id);
    if (typeof value.name !== 'string' || !value.name.trim()) add(pointer('roadmap', 'statuses', index, 'name'), 'INVALID_NAME', 'Status name is required.');
    if (typeof value.color !== 'string' || !COLOR.test(value.color)) add(pointer('roadmap', 'statuses', index, 'color'), 'INVALID_COLOR', 'Hex color expected.');
    if (typeof value.pattern !== 'string' || !PATTERNS.has(value.pattern)) add(pointer('roadmap', 'statuses', index, 'pattern'), 'INVALID_PATTERN', 'Unsupported pattern.');
    if (hasOwn(value, 'progressPattern') && (typeof value.progressPattern !== 'string' || !PATTERNS.has(value.progressPattern))) add(pointer('roadmap', 'statuses', index, 'progressPattern'), 'INVALID_PATTERN', 'Unsupported progress pattern.');
    if (typeof value.border !== 'string' || !BORDERS.has(value.border)) add(pointer('roadmap', 'statuses', index, 'border'), 'INVALID_BORDER', 'Unsupported border.');
  });
  const badgeIds = new Set<string>();
  roadmap.badges.forEach((value, index) => {
    const path = pointer('roadmap', 'badges', index);
    if (!checkObject(value, path)) return;
    require(value, ['id', 'type', 'color'], path);
    if (typeof value.id !== 'string' || !ID.test(value.id)) add(pointer('roadmap', 'badges', index, 'id'), 'INVALID_ID', 'Invalid badge ID.');
    else if (badgeIds.has(value.id)) add(path, 'DUPLICATE_ID', 'Duplicate badge ID.'); else badgeIds.add(value.id);
    if (value.type !== 'shape' && value.type !== 'text') add(pointer('roadmap', 'badges', index, 'type'), 'INVALID_BADGE_TYPE', 'Badge type must be shape or text.');
    if (value.type === 'shape' && (typeof value.shape !== 'string' || !SHAPES.has(value.shape))) add(pointer('roadmap', 'badges', index, 'shape'), 'INVALID_SHAPE', 'Shape is required.');
    if (value.type === 'text' && (typeof value.text !== 'string' || !value.text.trim())) add(pointer('roadmap', 'badges', index, 'text'), 'INVALID_TEXT', 'Text is required.');
  });

  const contentIds = new Set<string>();
  roadmap.categories.forEach((category, categoryIndex) => {
    const categoryPath = pointer('roadmap', 'categories', categoryIndex);
    if (!checkObject(category, categoryPath)) return;
    require(category, ['id', 'name', 'color', 'items'], categoryPath);
    if (typeof category.id !== 'string' || !ID.test(category.id)) add(pointer('roadmap', 'categories', categoryIndex, 'id'), 'INVALID_ID', 'Invalid category ID.');
    else if (contentIds.has(category.id)) add(categoryPath, 'DUPLICATE_ID', 'Duplicate category or item ID.'); else contentIds.add(category.id);
    if (typeof category.name !== 'string' || !category.name.trim()) add(pointer('roadmap', 'categories', categoryIndex, 'name'), 'INVALID_NAME', 'Category name is required.');
    if (typeof category.color !== 'string' || !COLOR.test(category.color)) add(pointer('roadmap', 'categories', categoryIndex, 'color'), 'INVALID_COLOR', 'Hex color expected.');
    if (!checkArray(category.items, pointer('roadmap', 'categories', categoryIndex, 'items'))) return;
    category.items.forEach((item, itemIndex) => {
      const itemPath = pointer('roadmap', 'categories', categoryIndex, 'items', itemIndex);
      if (!checkObject(item, itemPath)) return;
      require(item, ['id', 'name'], itemPath);
      if (typeof item.id !== 'string' || !ID.test(item.id)) add(pointer('roadmap', 'categories', categoryIndex, 'items', itemIndex, 'id'), 'INVALID_ID', 'Invalid item ID.');
      else if (contentIds.has(item.id)) add(itemPath, 'DUPLICATE_ID', 'Duplicate category or item ID.'); else contentIds.add(item.id);
      if (typeof item.name !== 'string' || !item.name.trim()) add(pointer('roadmap', 'categories', categoryIndex, 'items', itemIndex, 'name'), 'INVALID_NAME', 'Item name is required.');
      const hasStart = hasOwn(item, 'start'), hasEnd = hasOwn(item, 'end');
      if (hasStart !== hasEnd) add(itemPath, 'DATE_PAIR_REQUIRED', 'start and end must be provided together.');
      if (hasStart && !calendarDate(item.start)) add(pointer('roadmap', 'categories', categoryIndex, 'items', itemIndex, 'start'), 'INVALID_DATE', 'Calendar date expected.');
      if (hasEnd && !calendarDate(item.end)) add(pointer('roadmap', 'categories', categoryIndex, 'items', itemIndex, 'end'), 'INVALID_DATE', 'Calendar date expected.');
      if (calendarDate(item.start) && calendarDate(item.end) && compareDates(item.start, item.end) > 0) add(itemPath, 'START_AFTER_END', 'Start date must not be after end date.');
      if (hasOwn(item, 'statusId') && (typeof item.statusId !== 'string' || !statusIds.has(item.statusId))) add(pointer('roadmap', 'categories', categoryIndex, 'items', itemIndex, 'statusId'), 'INVALID_STATUS_REF', 'Unknown status ID.');
      if (hasOwn(item, 'priority') && (typeof item.priority !== 'string' || !PRIORITIES.has(item.priority))) add(pointer('roadmap', 'categories', categoryIndex, 'items', itemIndex, 'priority'), 'INVALID_PRIORITY', 'Unsupported priority.');
      if (hasOwn(item, 'progress') && (!Number.isInteger(item.progress) || (item.progress as number) < 0 || (item.progress as number) > 100)) add(pointer('roadmap', 'categories', categoryIndex, 'items', itemIndex, 'progress'), 'INVALID_PROGRESS', 'Progress must be an integer from 0 to 100.');
      if (hasOwn(item, 'link') && typeof item.link !== 'string') add(pointer('roadmap', 'categories', categoryIndex, 'items', itemIndex, 'link'), 'INVALID_TYPE', 'Link must be a string.');
      if (hasOwn(item, 'badges')) {
        if (!Array.isArray(item.badges)) add(pointer('roadmap', 'categories', categoryIndex, 'items', itemIndex, 'badges'), 'INVALID_TYPE', 'Badges must be an array.');
        else {
          const seen = new Set<string>();
          item.badges.forEach(badge => {
            if (typeof badge !== 'string' || !badgeIds.has(badge)) add(itemPath, 'INVALID_BADGE_REF', 'Unknown badge ID.');
            if (typeof badge === 'string' && seen.has(badge)) add(itemPath, 'DUPLICATE_BADGE', 'Duplicate badge ID.');
            if (typeof badge === 'string') seen.add(badge);
          });
        }
      }
    });
  });
  const milestoneIds = new Set<string>();
  roadmap.milestones.forEach((milestone, index) => {
    const path = pointer('roadmap', 'milestones', index);
    if (!checkObject(milestone, path)) return;
    require(milestone, ['id', 'name', 'date'], path);
    if (typeof milestone.id !== 'string' || !ID.test(milestone.id)) add(pointer('roadmap', 'milestones', index, 'id'), 'INVALID_ID', 'Invalid milestone ID.');
    else if (milestoneIds.has(milestone.id)) add(path, 'DUPLICATE_ID', 'Duplicate milestone ID.'); else milestoneIds.add(milestone.id);
    if (typeof milestone.name !== 'string' || !milestone.name.trim()) add(pointer('roadmap', 'milestones', index, 'name'), 'INVALID_NAME', 'Milestone name is required.');
    if (!calendarDate(milestone.date)) add(pointer('roadmap', 'milestones', index, 'date'), 'INVALID_DATE', 'Calendar date expected.');
  });

  if (mode === 'compatible') {
    // Unknown fields are intentionally retained. Compatibility warnings can be added without rejecting files.
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function assertRoadmapDocument(input: unknown, mode: ValidationMode = 'strict'): RoadmapDocument {
  const result = validateDocument(input, mode);
  if (!result.valid) throw new Error(result.errors.map(issue => `${issue.code} at ${issue.path}`).join('; '));
  return input as RoadmapDocument;
}
