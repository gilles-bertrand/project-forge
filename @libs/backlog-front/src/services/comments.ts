import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type { Store } from '@warp-drive/core';
import type {
  Comment,
  CommentKind,
  CommentOwnerType,
} from '#src/schemas/comments.ts';

const OWNER_SEGMENT: Record<CommentOwnerType, string> = {
  task: 'tasks',
  epic: 'epics',
  'user-story': 'user-stories',
  project: 'projects',
};

export interface NewCommentPayload {
  userId: string;
  content: string;
  type?: CommentKind;
  metadata?: Record<string, unknown> | null;
}

export default class CommentsService extends Service {
  @service declare store: Store;

  @tracked loading = false;

  async loadByOwner(
    ownerType: CommentOwnerType,
    ownerId: string
  ): Promise<Comment[]> {
    this.loading = true;
    try {
      const { content } = await this.store.request<{
        data: Comment[];
        meta?: { total: number };
      }>({
        url: `/api/v1/${OWNER_SEGMENT[ownerType]}/${ownerId}/comments`,
        method: 'GET',
        cacheOptions: { reload: true },
      });
      return content.data ?? [];
    } finally {
      this.loading = false;
    }
  }

  async create(
    ownerType: CommentOwnerType,
    ownerId: string,
    payload: NewCommentPayload
  ): Promise<Comment> {
    const { content } = await this.store.request<{ data: Comment }>({
      url: `/api/v1/${OWNER_SEGMENT[ownerType]}/${ownerId}/comments`,
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'comments',
          attributes: {
            userId: payload.userId,
            content: payload.content,
            type: payload.type ?? 'comment',
            metadata: payload.metadata ?? null,
          },
        },
      }),
    });
    return content.data;
  }

  async remove(commentId: string): Promise<void> {
    await this.store.request<{ data: null }>({
      url: `/api/v1/comments/${commentId}`,
      method: 'DELETE',
    });
  }
}

declare module '@ember/service' {
  interface Registry {
    comments: CommentsService;
  }
}
