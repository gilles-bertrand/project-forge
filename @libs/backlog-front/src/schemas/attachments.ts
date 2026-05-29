import {
  withDefaults,
  type WithLegacy,
} from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';

const AttachmentSchema = withDefaults({
  type: 'attachments',
  fields: [
    { name: 'ownerType', kind: 'attribute' },
    { name: 'ownerId', kind: 'attribute' },
    { name: 'name', kind: 'attribute' },
    { name: 'url', kind: 'attribute' },
    { name: 'mimeType', kind: 'attribute' },
    { name: 'sizeBytes', kind: 'attribute' },
    { name: 'uploadedById', kind: 'attribute' },
    { name: 'createdAt', kind: 'attribute' },
  ],
});

export default AttachmentSchema;

export type AttachmentOwnerType = 'task' | 'epic' | 'user-story' | 'project';

export interface Attachment extends WithLegacy<{ [Type]: 'attachments' }> {
  id: string;
  ownerType: AttachmentOwnerType;
  ownerId: string;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  createdAt: string;
}
