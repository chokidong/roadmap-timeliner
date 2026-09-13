import { clone, isObject } from './json.js';
import type { ApplyResult, Issue, JsonObject, JsonValue, PatchOperation, RoadmapDocument } from './types.js';
import { validateDocument } from './validate.js';

type ItemLocation = { category: JsonObject; index: number; item: JsonObject };

function findItem(document: RoadmapDocument, itemId: string): ItemLocation | undefined {
  const categories = document.roadmap.categories;
  if (!Array.isArray(categories)) return undefined;
  for (const category of categories) {
    if (!isObject(category) || !Array.isArray(category.items)) continue;
    const index = category.items.findIndex(item => isObject(item) && item.id === itemId);
    if (index >= 0 && isObject(category.items[index])) return { category, index, item: category.items[index] as JsonObject };
  }
  return undefined;
}

function findCategory(document: RoadmapDocument, categoryId: string): JsonObject | undefined {
  const categories = document.roadmap.categories;
  return Array.isArray(categories) ? categories.find(category => isObject(category) && category.id === categoryId) as JsonObject | undefined : undefined;
}

const issue = (code: string, message: string): Issue => ({ path: '/', code, message, severity: 'error' });

export function applyOperations(document: RoadmapDocument, operations: PatchOperation[]): ApplyResult {
  const next = clone(document);
  const summary: string[] = [];
  for (const operation of operations) {
    if (operation.op === 'add') {
      const category = findCategory(next, operation.categoryId);
      if (!category || !Array.isArray(category.items)) return { ok: false, issues: [issue('CATEGORY_NOT_FOUND', `Category '${operation.categoryId}' was not found.`)] };
      category.items.push(clone(operation.item)); summary.push(`Added ${String(operation.item.name ?? operation.item.id)}.`);
      continue;
    }
    if (operation.op === 'delete-status') {
      const statuses = next.roadmap.statuses;
      if (!Array.isArray(statuses) || !statuses.some(status => isObject(status) && status.id === operation.statusId)) return { ok: false, issues: [issue('STATUS_NOT_FOUND', `Status '${operation.statusId}' was not found.`)] };
      next.roadmap.statuses = statuses.filter(status => !isObject(status) || status.id !== operation.statusId);
      const categories = next.roadmap.categories;
      if (Array.isArray(categories)) categories.forEach(category => {
        if (isObject(category) && Array.isArray(category.items)) category.items.forEach(item => {
          if (isObject(item) && item.statusId === operation.statusId) delete item.statusId;
        });
      });
      summary.push(`Deleted status ${operation.statusId} and cleared its item references.`);
      continue;
    }
    const location = findItem(next, operation.itemId);
    if (!location) return { ok: false, issues: [issue('ITEM_NOT_FOUND', `Item '${operation.itemId}' was not found.`)] };
    if (operation.op === 'remove') { location.category.items = (location.category.items as JsonValue[]).filter((_, index) => index !== location.index); summary.push(`Removed ${operation.itemId}.`); continue; }
    if (operation.op === 'move') {
      const target = findCategory(next, operation.categoryId);
      if (!target || !Array.isArray(target.items)) return { ok: false, issues: [issue('CATEGORY_NOT_FOUND', `Category '${operation.categoryId}' was not found.`)] };
      location.category.items = (location.category.items as JsonValue[]).filter((_, index) => index !== location.index);
      target.items.push(location.item); summary.push(`Moved ${operation.itemId} to ${operation.categoryId}.`); continue;
    }
    if (operation.op === 'update') {
      if (operation.set) Object.assign(location.item, clone(operation.set));
      operation.unset?.forEach(field => delete location.item[field]);
      summary.push(`Updated ${operation.itemId}.`);
    }
  }
  const result = validateDocument(next, 'compatible');
  return result.valid ? { ok: true, document: next, summary } : { ok: false, issues: result.errors };
}
