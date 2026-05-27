import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { cacheKeyFor, type Store } from '@warp-drive/core';
import { createRecord } from '@warp-drive/utilities/json-api';
import { authFetch } from '@libs/shared-front/utils/auth-fetch';
import type {
  UserStory,
  StoryStatus,
  StoryPoints,
} from '#src/schemas/user-stories.ts';

export type NewUserStoryPayload = {
  title: string;
  description: string;
  projectId: string;
  epicId: string | null;
  status: UserStory['status'];
  points: UserStory['points'];
  priority: number;
};

export interface UpdateUserStoryPayload {
  title?: string;
  description?: string;
  status?: StoryStatus;
  points?: StoryPoints | null;
  priority?: number;
  epicId?: string | null;
}

export default class UserStoriesService extends Service {
  @service declare store: Store;

  @tracked list: UserStory[] = [];
  @tracked loading = false;

  async loadByProject(projectId: string): Promise<UserStory[]> {
    this.loading = true;
    try {
      const { content } = await this.store.request<{ data: UserStory[] }>({
        url: `/api/v1/projects/${projectId}/user-stories`,
        method: 'GET',
        cacheOptions: { reload: true },
      });
      this.list = content.data;
      return this.list;
    } finally {
      this.loading = false;
    }
  }

  async loadByEpic(epicId: string): Promise<UserStory[]> {
    const { content } = await this.store.request<{ data: UserStory[] }>({
      url: `/api/v1/epics/${epicId}/user-stories`,
      method: 'GET',
    });
    return content.data;
  }

  async findById(id: string): Promise<UserStory> {
    const { content } = await this.store.request<{ data: UserStory }>({
      url: `/api/v1/user-stories/${id}`,
      method: 'GET',
    });
    return content.data;
  }

  async create(data: NewUserStoryPayload): Promise<UserStory> {
    const us = this.store.createRecord<UserStory>('user-stories', data);
    const request = createRecord(us);
    request.body = JSON.stringify({
      data: this.store.cache.peek(cacheKeyFor(us)),
    });
    await this.store.request<{ data: UserStory }>(request);
    await this.loadByProject(data.projectId);
    return this.list[this.list.length - 1]!;
  }

  async update(
    id: string,
    projectId: string,
    attrs: UpdateUserStoryPayload
  ): Promise<void> {
    await this.store.request({
      url: `/api/v1/user-stories/${id}`,
      method: 'PATCH',
      body: JSON.stringify({
        data: { type: 'user-stories', id, attributes: attrs },
      }),
    });
    await this.loadByProject(projectId);
  }

  async delete(id: string, projectId: string): Promise<void> {
    // authFetch required: WarpDrive adds Content-Type on DELETE which Fastify v5 rejects (415)
    await authFetch(`/api/v1/user-stories/${id}`, { method: 'DELETE' });
    await this.loadByProject(projectId);
  }
}

declare module '@ember/service' {
  interface Registry {
    'user-stories': UserStoriesService;
  }
}
