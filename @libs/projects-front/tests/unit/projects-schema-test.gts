import { describe, expect, test } from 'vitest';
import ProjectSchema from '#src/schemas/projects.ts';

describe('Schema | Projects | Unit', () => {
  test('ProjectSchema has type "projects"', () => {
    expect(ProjectSchema.type).toBe('projects');
  });

  test('ProjectSchema declares all expected attributes', () => {
    const fieldNames = ProjectSchema.fields.map((f) => f.name);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('description');
    expect(fieldNames).toContain('status');
    expect(fieldNames).toContain('responsibleId');
    expect(fieldNames).toContain('createdById');
    expect(fieldNames).toContain('createdAt');
    expect(fieldNames).toContain('updatedAt');
    expect(fieldNames).toContain('sprintDurationDays');
    expect(fieldNames).toContain('defaultVelocityPoints');
  });

  test('all fields are attributes (no relations declared in P4)', () => {
    const kinds = new Set(ProjectSchema.fields.map((f) => f.kind));
    // P4 declares responsibleId as plain attribute (string FK)
    // Relations to users/members are deferred to P5+
    expect(kinds.has('attribute')).toBe(true);
  });
});
