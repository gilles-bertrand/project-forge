import { describe, expect, test } from 'vitest';
import UserStorySchema from '#src/schemas/user-stories.ts';

describe('Schema | UserStories | Unit', () => {
  test('UserStorySchema has type "user-stories"', () => {
    expect(UserStorySchema.type).toBe('user-stories');
  });

  test('UserStorySchema declares all expected attributes', () => {
    const fieldNames = UserStorySchema.fields.map((f) => f.name);
    expect(fieldNames).toContain('title');
    expect(fieldNames).toContain('description');
    expect(fieldNames).toContain('projectId');
    expect(fieldNames).toContain('epicId');
    expect(fieldNames).toContain('status');
    expect(fieldNames).toContain('points');
    expect(fieldNames).toContain('priority');
    expect(fieldNames).toContain('createdAt');
    expect(fieldNames).toContain('updatedAt');
  });

  test('all fields are attributes (relations to P6+)', () => {
    const kinds = new Set(UserStorySchema.fields.map((f) => f.kind));
    expect(kinds.has('attribute')).toBe(true);
  });
});
