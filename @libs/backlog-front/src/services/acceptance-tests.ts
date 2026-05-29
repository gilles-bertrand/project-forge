import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type { Store } from '@warp-drive/core';
import type {
  AcceptanceTest,
  AcceptanceTestState,
} from '#src/schemas/acceptance-tests.ts';

export interface NewAcceptanceTestPayload {
  name: string;
  description?: string;
  state?: AcceptanceTestState;
  rank?: number;
  createdById?: string | null;
}

export interface UpdateAcceptanceTestPayload {
  name?: string;
  description?: string;
  state?: AcceptanceTestState;
  rank?: number;
}

export default class AcceptanceTestsService extends Service {
  @service declare store: Store;

  @tracked loading = false;

  async loadByStory(userStoryId: string): Promise<AcceptanceTest[]> {
    this.loading = true;
    try {
      const { content } = await this.store.request<{
        data: AcceptanceTest[];
        meta?: { total: number };
      }>({
        url: `/api/v1/user-stories/${userStoryId}/acceptance-tests`,
        method: 'GET',
        cacheOptions: { reload: true },
      });
      return content.data ?? [];
    } finally {
      this.loading = false;
    }
  }

  async create(
    userStoryId: string,
    payload: NewAcceptanceTestPayload
  ): Promise<AcceptanceTest> {
    const { content } = await this.store.request<{ data: AcceptanceTest }>({
      url: `/api/v1/user-stories/${userStoryId}/acceptance-tests`,
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'acceptance-tests',
          attributes: {
            name: payload.name,
            description: payload.description ?? '',
            state: payload.state ?? 'to-check',
            rank: payload.rank ?? 0,
            createdById: payload.createdById ?? null,
          },
        },
      }),
    });
    return content.data;
  }

  async update(
    id: string,
    payload: UpdateAcceptanceTestPayload
  ): Promise<AcceptanceTest> {
    const { content } = await this.store.request<{ data: AcceptanceTest }>({
      url: `/api/v1/acceptance-tests/${id}`,
      method: 'PATCH',
      body: JSON.stringify({
        data: { type: 'acceptance-tests', id, attributes: payload },
      }),
    });
    return content.data;
  }

  async remove(id: string): Promise<void> {
    await this.store.request<{ data: null }>({
      url: `/api/v1/acceptance-tests/${id}`,
      method: 'DELETE',
    });
  }
}

declare module '@ember/service' {
  interface Registry {
    'acceptance-tests': AcceptanceTestsService;
  }
}
