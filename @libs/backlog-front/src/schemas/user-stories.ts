import {
  withDefaults,
  type WithLegacy,
} from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';

const UserStorySchema = withDefaults({
  type: 'user-stories',
  fields: [
    { name: 'title', kind: 'attribute' },
    { name: 'description', kind: 'attribute' },
    { name: 'notes', kind: 'attribute' },
    { name: 'color', kind: 'attribute' },
    { name: 'projectId', kind: 'attribute' },
    { name: 'epicId', kind: 'attribute' },
    { name: 'sprintId', kind: 'attribute' },
    { name: 'status', kind: 'attribute' },
    { name: 'points', kind: 'attribute' },
    { name: 'priority', kind: 'attribute' },
    { name: 'rank', kind: 'attribute' },
    { name: 'value', kind: 'attribute' },
    { name: 'createdById', kind: 'attribute' },
    { name: 'tags', kind: 'attribute' },
    { name: 'createdAt', kind: 'attribute' },
    { name: 'updatedAt', kind: 'attribute' },
  ],
});

export default UserStorySchema;

export type StoryStatus =
  | 'suggested'
  | 'accepted'
  | 'estimated'
  | 'planned'
  | 'in-progress'
  | 'done';
export type StoryPriority = 'Basse' | 'Moyenne' | 'Haute' | 'Critique';
export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13 | 21;

export type UserStory = WithLegacy<{
  title: string;
  description: string;
  notes: string | null;
  color: string | null;
  projectId: string;
  epicId: string | null;
  sprintId: string | null;
  status: StoryStatus;
  points: StoryPoints | null;
  priority: StoryPriority;
  rank: number;
  value: number | null;
  createdById: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  [Type]: 'user-stories';
}>;
