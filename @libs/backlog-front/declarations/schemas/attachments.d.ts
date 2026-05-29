import { type WithLegacy } from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';
declare const AttachmentSchema: import("@warp-drive/core/types/schema/fields").LegacyResourceSchema;
export default AttachmentSchema;
export type AttachmentOwnerType = 'task' | 'epic' | 'user-story' | 'project';
export interface Attachment extends WithLegacy<{
    [Type]: 'attachments';
}> {
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
//# sourceMappingURL=attachments.d.ts.map