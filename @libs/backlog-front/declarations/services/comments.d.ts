import Service from '@ember/service';
import type { Store } from '@warp-drive/core';
import type { Comment, CommentKind, CommentOwnerType } from '#src/schemas/comments.ts';
export interface NewCommentPayload {
    userId: string;
    content: string;
    type?: CommentKind;
    metadata?: Record<string, unknown> | null;
}
export default class CommentsService extends Service {
    store: Store;
    loading: boolean;
    loadByOwner(ownerType: CommentOwnerType, ownerId: string): Promise<Comment[]>;
    create(ownerType: CommentOwnerType, ownerId: string, payload: NewCommentPayload): Promise<Comment>;
    remove(commentId: string): Promise<void>;
}
declare module '@ember/service' {
    interface Registry {
        comments: CommentsService;
    }
}
//# sourceMappingURL=comments.d.ts.map