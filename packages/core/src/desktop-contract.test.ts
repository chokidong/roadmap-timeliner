import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import schema from '../../../roadmap.schema.json' with { type: 'json' };
import { validateDocument } from './validate.js';
import { ROADMAP_PATTERNS, ROADMAP_STYLES, ROADMAP_SCALES, ROADMAP_THEMES, ROADMAP_SHAPES, ROADMAP_BORDERS, ROADMAP_PRIORITIES } from './types.js';

// Execute the actual standalone desktop implementation, without starting its UI.
const html = readFileSync(new URL('../../../roadmap.html', import.meta.url), 'utf8');
const section = (from: string, to: string) => html.slice(html.indexOf(from), html.indexOf(to));
const desktop = runInNewContext(`
  let lang='en';
  ${section('const MS_SHAPES=', 'function shapeSVG')}
  ${section('const uid=', '/* ─────────────────────────────────────\n   TEMPLATES')}
  ${section('function buildTemplate(', '/* ─────────────────────────────────────\n   STATE')}
  ${section('function validate(', 'function validId(')}
  ({buildTemplate,validate,normalizePattern,MS_SHAPES,BDG_SHAPES,THEME_PALETTES})
`);
const fixture = () => JSON.parse(JSON.stringify(desktop.buildTemplate('product')));
const get = (document: any, path: string[]) => path.reduce((value, key) => value[key], document);
const defs = schema.$defs;
const targets: [string[], any][] = [
  [[], schema], [['roadmap'], defs.roadmap],
  [['roadmap','theme'], defs.roadmap.properties.theme],
  [['roadmap','statuses','0'], defs.status], [['roadmap','badges','0'], defs.badge],
  [['roadmap','badges','0','color'], defs.badge.properties.color],
  [['roadmap','categories','0'], defs.category], [['roadmap','categories','0','items','0'], defs.item],
  [['roadmap','milestones','0'], defs.milestone],
  [['roadmap','milestones','0','marker'], defs.milestone.properties.marker],
  [['roadmap','milestones','0','line'], defs.milestone.properties.line]
];

describe('desktop document contract', () => {
  it.each(['blank','product','tech','startup'])('accepts the desktop %s template in both modes', name => {
    const document = JSON.parse(JSON.stringify(desktop.buildTemplate(name)));
    expect(desktop.validate(document).valid).toBe(true);
    expect(validateDocument(document, 'strict').errors).toEqual([]);
    expect(validateDocument(document, 'compatible').errors).toEqual([]);
  });
  it('keeps public enums and desktop shape/pattern support aligned with the schema', () => {
    const pairs = [
      [ROADMAP_PATTERNS, defs.pattern.enum], [ROADMAP_STYLES, defs.roadmap.properties.style.enum],
      [ROADMAP_SCALES, defs.roadmap.properties.scale.enum], [ROADMAP_THEMES, defs.roadmap.properties.theme.properties.preset.enum],
      [ROADMAP_SHAPES, defs.shape.enum], [ROADMAP_BORDERS, defs.status.properties.border.enum],
      [ROADMAP_PRIORITIES, defs.item.properties.priority.enum],
      [desktop.MS_SHAPES, defs.shape.enum], [desktop.BDG_SHAPES, defs.shape.enum],
      [Object.keys(desktop.THEME_PALETTES), ROADMAP_THEMES]
    ];
    for (const [actual, expected] of pairs) expect(Array.from(actual)).toEqual(Array.from(expected));
    for (const pattern of ROADMAP_PATTERNS) {
      expect(desktop.normalizePattern(pattern)).toBe(pattern);
      const document = fixture();
      Object.assign(document.roadmap.statuses[0], { pattern, progressPattern: pattern });
      expect(desktop.validate(document).valid).toBe(true);
      expect(validateDocument(document).valid).toBe(true);
    }
  });
  for (const [path, definition] of targets) {
    it.each(Object.keys(definition.properties))(`rejects invalid /${path.join('/')}/%s in desktop and core`, field => {
      const document = fixture();
      get(document, path)[field] = null;
      expect(desktop.validate(document).valid).toBe(false);
      expect(validateDocument(document, 'strict').valid).toBe(false);
      expect(validateDocument(document, 'compatible').valid).toBe(false);
    });
    it(`preserves unknown fields at /${path.join('/')} only in compatible mode`, () => {
      const document = fixture();
      get(document, path).futureDisplay = { preserve: true };
      const before = JSON.stringify(document);
      expect(desktop.validate(document).valid).toBe(true);
      expect(validateDocument(document, 'compatible').valid).toBe(true);
      expect(validateDocument(document, 'strict').valid).toBe(false);
      expect(JSON.stringify(document)).toBe(before);
    });
  }
  it.each([
    [['roadmap','statuses','0','opacity'], 1.1],
    [['roadmap','categories','0','order'], -1],
    [['roadmap','categories','0','items','0','progress'], 101],
    [['roadmap','categories','0','items','0','fillColor'], 'red'],
    [['roadmap','milestones','0','marker','size'], 0],
    [['roadmap','milestones','0','line','style'], 'none'],
    [['roadmap','theme','preset'], 'unknown'],
    [['roadmap','theme','override'], { arbitrary: true }],
  ] as [string[], unknown][])('rejects unsupported value at %j', (path, value) => {
    const document = fixture();
    get(document, path.slice(0,-1))[path.at(-1)!] = value;
    expect(desktop.validate(document).valid).toBe(false);
    expect(validateDocument(document, 'compatible').valid).toBe(false);
  });
  it('packages the exact desktop document schema', () => {
    const packed = JSON.parse(readFileSync(new URL('../../agent-kit/skills/roadmap-timeliner/references/roadmap.schema.json', import.meta.url), 'utf8'));
    expect(packed).toEqual(schema);
  });
});
