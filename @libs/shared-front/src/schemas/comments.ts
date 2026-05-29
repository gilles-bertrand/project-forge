import {
  withDefaults,
  type WithLegacy,
} from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';

const CommentSchema = withDefaults({
  type: 'comments',
  fields: [
    { name: 'ownerType', kind: 'attribute' },
    { name: 'ownerId', kind: 'attribute' },
    { name: 'userId', kind: 'attribute' },
    { name: 'content', kind: 'attribute' },
    { name: 'type', kind: 'attribute' },
    { name: 'metadata', kind: 'attribute' },
    { name: 'createdAt', kind: 'attribute' },
  ],
});

export default CommentSchema;

export type CommentOwnerType = 'task' | 'epic' | 'user-story' | 'project';

export type CommentKind =
  | 'comment'
  | 'status-change'
  | 'mention'
  | 'attachment'
  | 'system';

export interface Comment extends WithLegacy<{ [Type]: 'comments' }> {
  id: string;
  ownerType: CommentOwnerType;
  ownerId: string;
  userId: string;
  content: string;
  type: CommentKind;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
