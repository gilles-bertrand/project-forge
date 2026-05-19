import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { cacheKeyFor, type Store } from '@warp-drive/core';
import { createRecord } from '@warp-drive/utilities/json-api';
import type { Epic } from '#src/schemas/epics.ts';

export type NewEpicPayload = {
  title: string;
  description: string;
  projectId: string;
  status: Epic['status'];
};

export default class EpicsService extends Service {
  @service declare store: Store;

  @tracked list: Epic[] = [];
  @tracked loading = false;

  async loadByProject(projectId: string): Promise<Epic[]> {
    this.loading = true;
    try {
      const { content } = await this.store.request<{ data: Epic[] }>({
        url: `/api/v1/projects/${projectId}/epics`,
        method: 'GET',
        cacheOptions: { reload: true },
      });
      this.list = content.data;
      return this.list;
    } finally {
      this.loading = false;
    }
  }

  async findById(id: string): Promise<Epic> {
    const { content } = await this.store.request<{ data: Epic }>({
      url: `/api/v1/epics/${id}`,
      method: 'GET',
    });
    return content.data;
  }

  async create(data: NewEpicPayload): Promise<Epic> {
    const epic = this.store.createRecord<Epic>('epics', data);
    const request = createRecord(epic);
    request.body = JSON.stringify({
      data: this.store.cache.peek(cacheKeyFor(epic)),
    });
    await this.store.request<{ data: Epic }>(request);
    await this.loadByProject(data.projectId);
    return this.list[this.list.length - 1]!;
  }
}

declare module '@ember/service' {
  interface Registry {
    epics: EpicsService;
  }
}
