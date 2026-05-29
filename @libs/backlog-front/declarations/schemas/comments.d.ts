import { type WithLegacy } from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';
declare const CommentSchema: import("@warp-drive/core/types/schema/fields").LegacyResourceSchema;
export default CommentSchema;
export type CommentOwnerType = 'task' | 'epic' | 'user-story' | 'project';
export type CommentKind = 'comment' | 'status-change' | 'mention' | 'attachment' | 'system';
export interface Comment extends WithLegacy<{
    [Type]: 'comments';
}> {
    id: string;
    ownerType: CommentOwnerType;
    ownerId: string;
    userId: string;
    content: string;
    type: CommentKind;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}
//# sourceMappingURL=comments.d.ts.map