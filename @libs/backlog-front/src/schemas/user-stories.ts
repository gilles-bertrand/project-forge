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
    { name: 'projectId', kind: 'attribute' },
    { name: 'epicId', kind: 'attribute' },
    { name: 'status', kind: 'attribute' },
    { name: 'points', kind: 'attribute' },
    { name: 'priority', kind: 'attribute' },
    { name: 'createdAt', kind: 'attribute' },
    { name: 'updatedAt', kind: 'attribute' },
  ],
});

export default UserStorySchema;

export type StoryStatus = 'todo' | 'in-progress' | 'done';
export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13 | 21;

export type UserStory = WithLegacy<{
  title: string;
  description: string;
  projectId: string;
  epicId: string | null;
  status: StoryStatus;
  points: StoryPoints;
  priority: number;
  createdAt: string;
  updatedAt: string;
  [Type]: 'user-stories';
}>;
