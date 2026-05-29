import Service from '@ember/service';
import type { Store } from '@warp-drive/core';
import type { Attachment, AttachmentOwnerType } from '#src/schemas/attachments.ts';
export default class AttachmentsService extends Service {
    store: Store;
    loading: boolean;
    loadByOwner(ownerType: AttachmentOwnerType, ownerId: string): Promise<Attachment[]>;
    upload(ownerType: AttachmentOwnerType, ownerId: string, file: File): Promise<Attachment | null>;
    remove(attachmentId: string): Promise<void>;
}
declare module '@ember/service' {
    interface Registry {
        attachments: AttachmentsService;
    }
}
//# sourceMappingURL=attachments.d.ts.map