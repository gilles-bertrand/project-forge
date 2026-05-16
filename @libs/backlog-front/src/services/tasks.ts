import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type { Store } from '@warp-drive/core';
import type {
  Task,
  TaskType,
  TaskNature,
  TaskPriority,
} from '#src/schemas/tasks.ts';

export interface NewTaskPayload {
  title: string;
  description?: string;
  type: TaskType;
  nature: TaskNature;
  priority: TaskPriority;
  points: number;
  estimatedHours?: number | null;
  projectId: string;
  userStoryId?: string | null;
  sprintId?: string | null;
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
  @service declare store: Store;

  @tracked backlog: Task[] = [];
  @tracked all: Task[] = [];
  @tracked loading = false;

  // Charge toutes les tasks du projet (pour USM — toutes les tasks, y compris en sprint).
  async loadAllByProject(projectId: string): Promise<Task[]> {
    this.loading = true;
    try {
      const { content } = await this.store.request<{ data: Task[] }>({
        url: `/api/v1/projects/${projectId}/tasks`,
        method: 'GET',
        cacheOptions: { reload: true },
      });
      this.all = content.data;
      return this.all;
    } finally {
      this.loading = false;
    }
  }

  // La route backend ne supporte pas ?filter[sprintId]=null — filtre côté client.
  async loadBacklog(projectId: string): Promise<Task[]> {
    this.loading = true;
    try {
      const { content } = await this.store.request<{ data: Task[] }>({
        url: `/api/v1/projects/${projectId}/tasks`,
        method: 'GET',
        cacheOptions: { reload: true },
      });
      this.backlog = content.data.filter((t) => !t.sprintId);
      return this.backlog;
    } finally {
      this.loading = false;
    }
  }

  async loadByUserStory(userStoryId: string): Promise<Task[]> {
    const { content } = await this.store.request<{ data: Task[] }>({
      url: `/api/v1/user-stories/${userStoryId}/tasks`,
      method: 'GET',
    });
    return content.data;
  }

  async findById(id: string): Promise<Task> {
    const { content } = await this.store.request<{ data: Task }>({
      url: `/api/v1/tasks/${id}`,
      method: 'GET',
    });
    return content.data;
  }

  async create(payload: NewTaskPayload): Promise<Task> {
    const { content } = await this.store.request<{ data: Task }>({
      url: `/api/v1/tasks/`,
      method: 'POST',
      body: JSON.stringify({ data: { type: 'tasks', attributes: payload } }),
    });
    await this.loadAllByProject(payload.projectId);
    return content.data;
  }

  async update(id: string, partial: Partial<NewTaskPayload>): Promise<Task> {
    const { content } = await this.store.request<{ data: Task }>({
      url: `/api/v1/tasks/${id}`,
      method: 'PATCH',
      body: JSON.stringify({
        data: { type: 'tasks', id, attributes: partial },
      }),
    });
    const existing = this.all.find((t) => t.id === id);
    if (existing) {
      await this.loadAllByProject(existing.projectId);
    }
    return content.data;
  }

  async loadComments(taskId: string): Promise<TaskComment[]> {
    const { content } = await this.store.request<{ data: TaskComment[] }>({
      url: `/api/v1/tasks/${taskId}/comments`,
      method: 'GET',
    });
    return content.data;
  }

  async loadHistory(taskId: string): Promise<TaskHistoryEvent[]> {
    const { content } = await this.store.request<{ data: TaskHistoryEvent[] }>({
      url: `/api/v1/tasks/${taskId}/history`,
      method: 'GET',
    });
    return content.data;
  }

  async loadAssignees(taskId: string): Promise<TaskAssignee[]> {
    const { content } = await this.store.request<{ data: TaskAssignee[] }>({
      url: `/api/v1/tasks/${taskId}/assignees`,
      method: 'GET',
    });
    return content.data;
  }
}

declare module '@ember/service' {
  interface Registry {
    tasks: TasksService;
  }
}
