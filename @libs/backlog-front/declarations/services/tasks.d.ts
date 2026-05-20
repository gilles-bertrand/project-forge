import Service from '@ember/service';
import type { Store } from '@warp-drive/core';
import type { Task, TaskStatus, TaskType, TaskNature, TaskPriority } from '#src/schemas/tasks.ts';
export interface NewTaskPayload {
    title: string;
    description?: string;
    status?: TaskStatus;
    type: TaskType;
    nature: TaskNature;
    priority: TaskPriority;
    points: number;
    estimatedHours?: number | null;
    projectId: string;
    userStoryId?: string | null;
    sprintId?: string | null;
    createdById?: string;
}
export interface TaskComment {
    id: string;
    taskId: string;
    authorId: string;
    content: string;
    createdAt: string;
}
export interface TaskHistoryEvent {
    id: string;
    taskId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedById: string;
    createdAt: string;
}
export interface TaskAssignee {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}
export default class TasksService extends Service {
    store: Store;
    backlog: Task[];
    all: Task[];
    loading: boolean;
    loadAllByProject(projectId: string): Promise<Task[]>;
    loadBacklog(projectId: string): Promise<Task[]>;
    loadByUserStory(userStoryId: string): Promise<Task[]>;
    findById(id: string): Promise<Task>;
    create(payload: NewTaskPayload): Promise<Task>;
    update(id: string, partial: Partial<NewTaskPayload>, opts?: {
        refresh?: boolean;
    }): Promise<Task>;
    loadComments(taskId: string): Promise<TaskComment[]>;
    loadHistory(taskId: string): Promise<TaskHistoryEvent[]>;
    loadAssignees(taskId: string): Promise<TaskAssignee[]>;
}
declare module '@ember/service' {
    interface Registry {
        tasks: TasksService;
    }
}
//# sourceMappingURL=tasks.d.ts.map