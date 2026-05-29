import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { authFetch, authFetchJson } from '#src/utils/auth-fetch.ts';
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

type RawComment = { id: string; attributes: Omit<Comment, 'id'> };

// JSON:API resources arrive as { id, type, attributes }. Flatten to the same
// shape `loadByOwner` returns so callers can read `.userId`, `.content`, etc.
// uniformly (mixing flat + nested shapes is what caused blank/NaN renders).
function flatten(raw: RawComment): Comment {
  return { id: raw.id, ...raw.attributes };
}

export default class CommentsService extends Service {
  @tracked loading = false;

  async loadByOwner(
    ownerType: CommentOwnerType,
    ownerId: string
  ): Promise<Comment[]> {
    this.loading = true;
    try {
      const json = await authFetchJson<{ data: RawComment[] }>(
        `/api/v1/${OWNER_SEGMENT[ownerType]}/${ownerId}/comments`
      );
      return (json?.data ?? []).map(flatten);
    } finally {
      this.loading = false;
    }
  }

  async create(
    ownerType: CommentOwnerType,
    ownerId: string,
    payload: NewCommentPayload
  ): Promise<Comment> {
    const json = await authFetchJson<{ data: RawComment }>(
      `/api/v1/${OWNER_SEGMENT[ownerType]}/${ownerId}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      }
    );
    if (!json) throw new Error('Comment creation failed');
    return flatten(json.data);
  }

  async update(commentId: string, content: string): Promise<Comment> {
    const json = await authFetchJson<{ data: RawComment }>(
      `/api/v1/comments/${commentId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { type: 'comments', id: commentId, attributes: { content } },
        }),
      }
    );
    if (!json) throw new Error('Comment update failed');
    return flatten(json.data);
  }

  async remove(commentId: string): Promise<void> {
    const res = await authFetch(`/api/v1/comments/${commentId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Comment deletion failed: ${String(res.status)}`);
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    comments: CommentsService;
  }
}
