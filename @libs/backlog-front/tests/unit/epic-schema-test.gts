import { describe, expect, test } from 'vitest';
import EpicSchema from '#src/schemas/epics.ts';

describe('Schema | Epics | Unit', () => {
  test('EpicSchema has type "epics"', () => {
    expect(EpicSchema.type).toBe('epics');
  });

  test('EpicSchema declares all expected attributes', () => {
    const fieldNames = EpicSchema.fields.map((f) => f.name);
    expect(fieldNames).toContain('title');
    expect(fieldNames).toContain('description');
    expect(fieldNames).toContain('projectId');
    expect(fieldNames).toContain('status');
    expect(fieldNames).toContain('createdAt');
    expect(fieldNames).toContain('updatedAt');
  });

  test('all fields are attributes (no relations in P5)', () => {
    const kinds = new Set(EpicSchema.fields.map((f) => f.kind));
    expect(kinds.has('attribute')).toBe(true);
  });
});
