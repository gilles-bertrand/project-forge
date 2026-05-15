import {
  withDefaults,
  type WithLegacy,
} from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';

const TaskSchema = withDefaults({
  type: 'tasks',
  fields: [
    { name: 'number', kind: 'attribute' },
    { name: 'title', kind: 'attribute' },
    { name: 'description', kind: 'attribute' },
    { name: 'status', kind: 'attribute' },
    { name: 'type', kind: 'attribute' },
    { name: 'nature', kind: 'attribute' },
    { name: 'priority', kind: 'attribute' },
    { name: 'points', kind: 'attribute' },
    { name: 'estimatedHours', kind: 'attribute' },
    { name: 'projectId', kind: 'attribute' },
    { name: 'userStoryId', kind: 'attribute' },
    { name: 'epicId', kind: 'attribute' },
    { name: 'sprintId', kind: 'attribute' },
    { name: 'createdById', kind: 'attribute' },
    { name: 'dueDate', kind: 'attribute' },
    { name: 'createdAt', kind: 'attribute' },
    { name: 'updatedAt', kind: 'attribute' },
  ],
});

export default TaskSchema;

export type TaskStatus = 'todo' | 'in-progress' | 'testing' | 'uat' | 'done';
export type TaskType =
  | 'Frontend'
  | 'Backend'
  | 'Database'
  | 'UX'
  | 'Analyse'
  | 'DevOps'
  | 'API'
  | 'Security'
  | 'Testing';
export type TaskNature =
  | 'Bug'
  | 'Feature'
  | 'Maintenance'
  | 'Hotfix'
  | 'Refacto'
  | 'Techdebt'
  | 'Spike'
  | 'Review'
  | 'Deployment'
  | 'Infra';
export type TaskPriority = 'Basse' | 'Moyenne' | 'Haute' | 'Critique';

export type Task = WithLegacy<{
  number: number;
  title: string;
  description: string;
  status: TaskStatus;
  type: TaskType;
  nature: TaskNature;
  priority: TaskPriority;
  points: number;
  estimatedHours: number | null;
  projectId: string;
  userStoryId: string | null;
  epicId: string | null;
  sprintId: string | null;
  createdById: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  [Type]: 'tasks';
}>;
