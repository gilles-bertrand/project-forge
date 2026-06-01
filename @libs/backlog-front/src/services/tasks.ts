import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type { Store } from '@warp-drive/core';
import { authFetchJson } from '@libs/shared-front/utils/auth-fetch';
import type {
  Task,
  TaskStatus,
  TaskType,
  TaskNature,
  TaskPriority,
} from '#src/schemas/tasks.ts';
import type { MemberLite } from '#src/components/assignee-avatar-stack.gts';

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

// Forme réelle renvoyée par GET /tasks/:id/assignees (serializer task-assignees).
export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  assignedAt: string;
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

  async update(
    id: string,
    partial: Partial<NewTaskPayload>,
    opts: { refresh?: boolean } = { refresh: true }
  ): Promise<Task> {
    const { content } = await this.store.request<{ data: Task }>({
      url: `/api/v1/tasks/${id}`,
      method: 'PATCH',
      body: JSON.stringify({
        data: { type: 'tasks', id, attributes: partial },
      }),
    });
    if (opts.refresh !== false) {
      const existing = this.all.find((t) => t.id === id);
      if (existing) {
        await this.loadAllByProject(existing.projectId);
      }
    }
    return content.data;
  }

  // Sub-resources (comments, history, assignees). On utilise authFetchJson pour
  // attacher le Bearer token (sinon 401 silencieux). Comments + Attachments ont
  // désormais des schémas WarpDrive ; passer par le service polymorphique
  // `comments` / `attachments` pour de nouveaux call sites.
  async loadComments(taskId: string): Promise<TaskComment[]> {
    const json = await authFetchJson<{
      data: Array<{ id: string; attributes: Omit<TaskComment, 'id'> }>;
    }>(`/api/v1/tasks/${taskId}/comments`);
    if (!json) return [];
    return (json.data ?? []).map((c) => ({ id: c.id, ...c.attributes }));
  }

  async loadHistory(taskId: string): Promise<TaskHistoryEvent[]> {
    const json = await authFetchJson<{
      data: Array<{ id: string; attributes: Omit<TaskHistoryEvent, 'id'> }>;
    }>(`/api/v1/tasks/${taskId}/history`);
    if (!json) return [];
    return (json.data ?? []).map((h) => ({ id: h.id, ...h.attributes }));
  }

  async loadAssignees(taskId: string): Promise<TaskAssignee[]> {
    const json = await authFetchJson<{
      data: Array<{ id: string; attributes: Omit<TaskAssignee, 'id'> }>;
    }>(`/api/v1/tasks/${taskId}/assignees`);
    if (!json) return [];
    return (json.data ?? []).map((a) => ({ id: a.id, ...a.attributes }));
  }

  async addAssignee(taskId: string, userId: string): Promise<void> {
    await this.store.request({
      url: `/api/v1/tasks/${taskId}/assignees`,
      method: 'POST',
      body: JSON.stringify({
        data: { type: 'task-assignees', attributes: { userId } },
      }),
    });
  }

  async removeAssignee(taskId: string, userId: string): Promise<void> {
    await this.store.request({
      url: `/api/v1/tasks/${taskId}/assignees/${userId}`,
      method: 'DELETE',
    });
  }

  // Membres du projet (source des assignés possibles). backlog-front ne dépend pas
  // de projects-front : on requête l'endpoint members directement via authFetchJson.
  async loadProjectMembers(projectId: string): Promise<MemberLite[]> {
    const json = await authFetchJson<{
      data: Array<{
        attributes: {
          userId: string;
          firstName: string | null;
          lastName: string | null;
          color: string | null;
        };
      }>;
    }>(`/api/v1/projects/${projectId}/members`);
    if (!json) return [];
    return (json.data ?? [])
      .filter((m) => m.attributes.firstName && m.attributes.lastName)
      .map((m) => ({
        id: m.attributes.userId,
        firstName: m.attributes.firstName!,
        lastName: m.attributes.lastName!,
        color: m.attributes.color,
      }));
  }

  // Applique l'état désiré d'assignés (diff add/remove) à partir de l'état courant.
  async syncAssignees(
    taskId: string,
    desiredIds: string[],
    currentIds: string[]
  ): Promise<void> {
    const toAdd = desiredIds.filter((id) => !currentIds.includes(id));
    const toRemove = currentIds.filter((id) => !desiredIds.includes(id));
    await Promise.all([
      ...toAdd.map((id) => this.addAssignee(taskId, id)),
      ...toRemove.map((id) => this.removeAssignee(taskId, id)),
    ]);
  }
}

declare module '@ember/service' {
  interface Registry {
    tasks: TasksService;
  }
}
