import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { cacheKeyFor, type Store } from '@warp-drive/core';
import { createRecord } from '@warp-drive/utilities/json-api';
import { authFetch } from '@libs/shared-front/utils/auth-fetch';
import type { Epic } from '#src/schemas/epics.ts';

export type NewEpicPayload = {
  title: string;
  description: string;
  projectId: string;
  status: Epic['status'];
};

export type UpdateEpicPayload = {
  title?: string;
  description?: string;
  status?: Epic['status'];
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

  async update(
    id: string,
    projectId: string,
    attrs: UpdateEpicPayload
  ): Promise<Epic> {
    // Follow the existing tasks.update() pattern: no explicit Content-Type
    // header — the projects-front comments document that
    // `application/vnd.api+json` is broken in Fastify v5, and adding an
    // explicit `application/json` collides with WarpDrive's default header.
    const { content } = await this.store.request<{ data: Epic }>({
      url: `/api/v1/epics/${id}`,
      method: 'PATCH',
      body: JSON.stringify({
        data: { id, type: 'epics', attributes: attrs },
      }),
    });
    await this.loadByProject(projectId);
    return content.data;
  }

  async delete(id: string, projectId: string): Promise<void> {
    // Use authFetch instead of store.request — body-less DELETE through
    // WarpDrive's Fetch handler gets `Content-Type: application/json`
    // appended, producing a multi-value header that Fastify v5 rejects with
    // 415. Same rationale as projects-front/sprints-front/time-tracking-front.
    const res = await authFetch(`/api/v1/epics/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      throw Object.assign(new Error(`delete failed: ${String(res.status)}`), {
        status: res.status,
      });
    }
    await this.loadByProject(projectId);
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
