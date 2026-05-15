import { type WithLegacy } from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';
declare const TaskSchema: import("@warp-drive/core/types/schema/fields").LegacyResourceSchema;
export default TaskSchema;
export type TaskStatus = 'todo' | 'in-progress' | 'testing' | 'uat' | 'done';
export type TaskType = 'Frontend' | 'Backend' | 'Database' | 'UX' | 'Analyse' | 'DevOps' | 'API' | 'Security' | 'Testing';
export type TaskNature = 'Bug' | 'Feature' | 'Maintenance' | 'Hotfix' | 'Refacto' | 'Techdebt' | 'Spike' | 'Review' | 'Deployment' | 'Infra';
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
//# sourceMappingURL=tasks.d.ts.map