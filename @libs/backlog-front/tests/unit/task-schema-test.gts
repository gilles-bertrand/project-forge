import { describe, expect, test } from 'vitest';
import TaskSchema from '#src/schemas/tasks.ts';

describe('Schema | Tasks | Unit', () => {
  test('TaskSchema has type "tasks"', () => {
    expect(TaskSchema.type).toBe('tasks');
  });

  test('TaskSchema declares all expected attributes', () => {
    const fieldNames = TaskSchema.fields.map((f) => f.name);
    expect(fieldNames).toContain('number');
    expect(fieldNames).toContain('title');
    expect(fieldNames).toContain('description');
    expect(fieldNames).toContain('status');
    expect(fieldNames).toContain('type');
    expect(fieldNames).toContain('nature');
    expect(fieldNames).toContain('priority');
    expect(fieldNames).toContain('points');
    expect(fieldNames).toContain('projectId');
    expect(fieldNames).toContain('userStoryId');
    expect(fieldNames).toContain('epicId');
    expect(fieldNames).toContain('sprintId');
    expect(fieldNames).toContain('createdById');
    expect(fieldNames).toContain('createdAt');
    expect(fieldNames).toContain('updatedAt');
  });

  test('all fields are attributes (relations to P6+)', () => {
    const kinds = new Set(TaskSchema.fields.map((f) => f.kind));
    expect(kinds.has('attribute')).toBe(true);
  });
});
