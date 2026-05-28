import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type { Store } from '@warp-drive/core';
import { authFetch } from '@libs/shared-front/utils/auth-fetch';
import type {
  Attachment,
  AttachmentOwnerType,
} from '#src/schemas/attachments.ts';

const OWNER_SEGMENT: Record<AttachmentOwnerType, string> = {
  task: 'tasks',
  epic: 'epics',
  'user-story': 'user-stories',
  project: 'projects',
};

export default class AttachmentsService extends Service {
  @service declare store: Store;

  @tracked loading = false;

  async loadByOwner(
    ownerType: AttachmentOwnerType,
    ownerId: string
  ): Promise<Attachment[]> {
    this.loading = true;
    try {
      const { content } = await this.store.request<{
        data: Attachment[];
        meta?: { total: number };
      }>({
        url: `/api/v1/${OWNER_SEGMENT[ownerType]}/${ownerId}/attachments`,
        method: 'GET',
        cacheOptions: { reload: true },
      });
      return content.data ?? [];
    } finally {
      this.loading = false;
    }
  }

  // Upload utilise authFetch (multipart) — store.request ne gère pas FormData en JSON:API.
  async upload(
    ownerType: AttachmentOwnerType,
    ownerId: string,
    file: File,
    uploadedById: string
  ): Promise<Attachment | null> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedById', uploadedById);
    const res = await authFetch(
      `/api/v1/${OWNER_SEGMENT[ownerType]}/${ownerId}/attachments`,
      { method: 'POST', body: formData }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data: Attachment };
    return json.data;
  }

  async remove(attachmentId: string): Promise<void> {
    await this.store.request<{ data: null }>({
      url: `/api/v1/attachments/${attachmentId}`,
      method: 'DELETE',
    });
  }
}

declare module '@ember/service' {
  interface Registry {
    attachments: AttachmentsService;
  }
}
