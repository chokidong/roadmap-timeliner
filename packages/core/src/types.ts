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

export type RoadmapDocument = {
  version: '1.0';
  roadmap: JsonObject;
};

export type PatchOperation =
  | { op: 'add'; categoryId: string; item: JsonObject }
  | { op: 'update'; itemId: string; set?: JsonObject; unset?: string[] }
  | { op: 'move'; itemId: string; categoryId: string }
  | { op: 'remove'; itemId: string }
  | { op: 'delete-status'; statusId: string };

export type ApplyResult =
  | { ok: true; document: RoadmapDocument; summary: string[] }
  | { ok: false; issues: Issue[] };
