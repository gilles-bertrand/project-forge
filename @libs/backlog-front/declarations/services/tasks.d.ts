import Service from '@ember/service';
import type { Store } from '@warp-drive/core';
import type { Task, TaskStatus, TaskType, TaskNature, TaskPriority } from '#src/schemas/tasks.ts';
import type { MemberLite } from '#src/components/assignee-avatar-stack';
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
    ownerType: string;
    ownerId: string;
    type: string;
    description: string;
    userId: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}
export interface TaskAssignee {
    id: string;
    taskId: string;
    userId: string;
    assignedAt: string;
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
    addAssignee(taskId: string, userId: string): Promise<void>;
    removeAssignee(taskId: string, userId: string): Promise<void>;
    loadProjectMembers(projectId: string): Promise<MemberLite[]>;
    syncAssignees(taskId: string, desiredIds: string[], currentIds: string[]): Promise<void>;
}
declare module '@ember/service' {
    interface Registry {
        tasks: TasksService;
    }
}
//# sourceMappingURL=tasks.d.ts.map