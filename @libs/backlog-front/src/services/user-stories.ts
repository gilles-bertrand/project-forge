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
  StoryPriority,
} from '#src/schemas/user-stories.ts';

export type NewUserStoryPayload = {
  title: string;
  description: string;
  projectId: string;
  epicId: string | null;
  status?: StoryStatus;
  points?: StoryPoints | null;
  priority?: StoryPriority;
  notes?: string | null;
  color?: string | null;
  rank?: number;
  value?: number | null;
  tags?: string[];
};

export interface UpdateUserStoryPayload {
  title?: string;
  description?: string;
  status?: StoryStatus;
  points?: StoryPoints | null;
  priority?: StoryPriority;
  epicId?: string | null;
  notes?: string | null;
  color?: string | null;
  rank?: number;
  value?: number | null;
  tags?: string[];
}

export class InvalidStoryTransitionError extends Error {
  readonly code = 'INVALID_STORY_TRANSITION';
  readonly from: StoryStatus | null;
  readonly to: StoryStatus | null;

  constructor(
    message: string,
    from: StoryStatus | null,
    to: StoryStatus | null
  ) {
    super(message);
    this.name = 'InvalidStoryTransitionError';
    this.from = from;
    this.to = to;
  }
}

type JsonApiError = {
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  meta?: { from?: StoryStatus; to?: StoryStatus };
};

function extractInvalidTransition(
  raw: unknown,
  fallbackTo: StoryStatus | null
): InvalidStoryTransitionError | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const errors = (raw as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return null;
  for (const err of errors as JsonApiError[]) {
    if (err.code === 'INVALID_STORY_TRANSITION') {
      return new InvalidStoryTransitionError(
        err.detail ?? err.title ?? 'Invalid story transition',
        err.meta?.from ?? null,
        err.meta?.to ?? fallbackTo
      );
    }
  }
  return null;
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
    // Default status for new stories follows the iceScrum sandbox flow.
    const payload: NewUserStoryPayload = {
      status: 'suggested',
      priority: 'Moyenne',
      ...data,
    };
    const us = this.store.createRecord<UserStory>('user-stories', payload);
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
    try {
      await this.store.request({
        url: `/api/v1/user-stories/${id}`,
        method: 'PATCH',
        body: JSON.stringify({
          data: { type: 'user-stories', id, attributes: attrs },
        }),
      });
    } catch (err: unknown) {
      // WarpDrive surfaces non-2xx as a thrown error whose `content` (when
      // present) holds the JSON:API error document. Translate the backend's
      // 422 INVALID_STORY_TRANSITION into a typed error UIs can present.
      const content = (err as { content?: unknown }).content;
      const typed = extractInvalidTransition(content, attrs.status ?? null);
      if (typed) throw typed;
      throw err;
    }
    await this.loadByProject(projectId);
  }

  async setStatus(
    id: string,
    projectId: string,
    status: StoryStatus
  ): Promise<void> {
    await this.update(id, projectId, { status });
  }

  async delete(id: string, projectId: string): Promise<void> {
    // authFetch required: WarpDrive adds Content-Type on DELETE which Fastify v5 rejects (415)
    const res = await authFetch(`/api/v1/user-stories/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Delete user-story failed: ${String(res.status)}`);
    }
    await this.loadByProject(projectId);
  }
}

declare module '@ember/service' {
  interface Registry {
    'user-stories': UserStoriesService;
  }
}
