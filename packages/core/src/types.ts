export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type ValidationMode = 'strict' | 'compatible';
export type Severity = 'error' | 'warning';

export type Issue = {
  path: string;
  code: string;
  severity: Severity;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: Issue[];
  warnings: Issue[];
};

export const ROADMAP_PATTERNS = ['solid', 'diagonal', 'horizontal', 'vertical', 'dot', 'grid', 'gradient', 'diagonal-lines', 'horizontal-lines', 'vertical-lines', 'grid-lines'] as const;
export type RoadmapPattern = typeof ROADMAP_PATTERNS[number];

export const ROADMAP_STYLES = ['default', 'card'] as const;
export const ROADMAP_SCALES = ['auto', 'week', 'month', 'quarter'] as const;
export const ROADMAP_THEMES = ['default', 'violet', 'ocean', 'forest', 'sunset', 'macaron', 'rainbow', 'darkchic'] as const;
export const ROADMAP_SHAPES = ['flag', 'diamond', 'pin', 'rocket', 'star', 'check', 'circle', 'heart', 'fire', 'zap', 'shield', 'tag', 'square', 'triangle'] as const;
export const ROADMAP_BORDERS = ['solid', 'dashed', 'dotted', 'none'] as const;
export const ROADMAP_PRIORITIES = ['none', 'low', 'medium', 'high', 'critical'] as const;
export type RoadmapStyle = typeof ROADMAP_STYLES[number];
export type RoadmapScale = typeof ROADMAP_SCALES[number];
export type RoadmapThemePreset = typeof ROADMAP_THEMES[number];
export type RoadmapShape = typeof ROADMAP_SHAPES[number];
export type RoadmapBorder = typeof ROADMAP_BORDERS[number];
export type RoadmapPriority = typeof ROADMAP_PRIORITIES[number];

// JsonObject intersections retain unknown fields on compatible imports.
// Strict generation still rejects extra keys through roadmap.schema.json.
export type RoadmapStatus = JsonObject & {
  id: string; name: string; color: string;
  pattern: RoadmapPattern; progressPattern?: RoadmapPattern;
  border: RoadmapBorder; completed?: boolean; opacity?: number; metadata?: JsonObject;
};
export type RoadmapItem = JsonObject & {
  id: string; name: string; subtitles?: string[]; description?: string;
  start?: string; end?: string; statusId?: string; priority?: RoadmapPriority;
  badges?: string[]; progress?: number; fillColor?: string; link?: string; metadata?: JsonObject;
};
export type RoadmapCategory = JsonObject & {
  id: string; name: string; color: string; subtitle?: string; link?: string;
  order?: number; items: RoadmapItem[]; metadata?: JsonObject;
};
export type RoadmapBadge = JsonObject & {
  id: string; color: JsonObject & { type: 'solid'; value: string };
} & ({ type: 'shape'; shape: RoadmapShape; text?: string } | { type: 'text'; text: string; shape?: RoadmapShape });
export type RoadmapMilestone = JsonObject & {
  id: string; name: string; date: string; description?: string;
  marker?: JsonObject & { shape?: RoadmapShape; color?: string; size?: number };
  line?: JsonObject & { visible?: boolean; style?: Exclude<RoadmapBorder, 'none'>; color?: string };
  labelPosition?: 'top'; metadata?: JsonObject;
};
export type Roadmap = JsonObject & {
  id: string; title: string; subtitle?: string; description?: string;
  startDate?: string; endDate?: string; rangeLocked?: boolean;
  locale?: 'ko' | 'en'; scale?: RoadmapScale; style?: RoadmapStyle;
  showToday?: boolean; showStatusLegend?: boolean; darkMode?: boolean;
  theme?: JsonObject & { preset: RoadmapThemePreset; override?: Record<string, never> };
  statuses: RoadmapStatus[]; badges: RoadmapBadge[];
  categories: RoadmapCategory[]; milestones: RoadmapMilestone[]; metadata?: JsonObject;
};
export type RoadmapDocument = { version: '1.0'; roadmap: Roadmap };

export type PatchOperation =
  | { op: 'add'; categoryId: string; item: JsonObject }
  | { op: 'update'; itemId: string; set?: JsonObject; unset?: string[] }
  | { op: 'move'; itemId: string; categoryId: string }
  | { op: 'remove'; itemId: string }
  | { op: 'delete-status'; statusId: string };

export type ApplyResult =
  | { ok: true; document: RoadmapDocument; summary: string[] }
  | { ok: false; issues: Issue[] };
