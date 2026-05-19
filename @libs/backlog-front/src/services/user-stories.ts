import Service from '@ember/service';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { cacheKeyFor, type Store } from '@warp-drive/core';
import { createRecord } from '@warp-drive/utilities/json-api';
import type { UserStory } from '#src/schemas/user-stories.ts';

export type NewUserStoryPayload = {
  title: string;
  description: string;
  projectId: string;
  epicId: string | null;
  status: UserStory['status'];
  points: UserStory['points'];
  priority: number;
};

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
}

declare module '@ember/service' {
  interface Registry {
    'user-stories': UserStoriesService;
  }
}
