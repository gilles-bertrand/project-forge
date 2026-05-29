import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { authFetch, authFetchJson } from '@libs/shared-front/utils/auth-fetch';

export type StoryDependencyType = 'blocks' | 'relates-to';

export interface StoryDependency {
  id: string;
  fromStoryId: string;
  toStoryId: string;
  type: StoryDependencyType;
  createdAt: string;
}

export interface StoryDependencies {
  outgoing: StoryDependency[];
  incoming: StoryDependency[];
}

type RawDependency = { id: string; attributes: Omit<StoryDependency, 'id'> };

function flatten(raw: RawDependency): StoryDependency {
  return { id: raw.id, ...raw.attributes };
}

export class StoryDependencyError extends Error {}

export default class StoryDependenciesService extends Service {
  @tracked loading = false;

  async loadByStory(storyId: string): Promise<StoryDependencies> {
    this.loading = true;
    try {
      const json = await authFetchJson<{
        data: { outgoing: RawDependency[]; incoming: RawDependency[] };
      }>(`/api/v1/user-stories/${storyId}/dependencies`);
      return {
        outgoing: (json?.data.outgoing ?? []).map(flatten),
        incoming: (json?.data.incoming ?? []).map(flatten),
      };
    } finally {
      this.loading = false;
    }
  }

  async create(
    fromStoryId: string,
    toStoryId: string,
    type: StoryDependencyType
  ): Promise<StoryDependency> {
    const res = await authFetch(
      `/api/v1/user-stories/${fromStoryId}/dependencies`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { type: 'story-dependencies', attributes: { toStoryId, type } },
        }),
      }
    );
    const json = (await res.json().catch(() => null)) as {
      data?: RawDependency;
      errors?: Array<{ detail?: string; code?: string }>;
    } | null;
    if (!res.ok || !json?.data) {
      const detail = json?.errors?.[0]?.detail ?? `HTTP ${String(res.status)}`;
      throw new StoryDependencyError(detail);
    }
    return flatten(json.data);
  }

  async remove(dependencyId: string): Promise<void> {
    const res = await authFetch(`/api/v1/story-dependencies/${dependencyId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new StoryDependencyError(
        `Dependency deletion failed: ${String(res.status)}`
      );
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    'story-dependencies': StoryDependenciesService;
  }
}
