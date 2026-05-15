import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type { Store } from '@warp-drive/core';
import type { Task } from '#src/schemas/tasks.ts';

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
}

declare module '@ember/service' {
  interface Registry {
    tasks: TasksService;
  }
}
