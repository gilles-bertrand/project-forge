import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { authFetch, authFetchJson } from '#src/utils/auth-fetch.ts';
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

type RawAttachment = { id: string; attributes: Omit<Attachment, 'id'> };

// Flatten { id, type, attributes } → { id, ...attributes } so `.name`,
// `.sizeBytes`, `.url` are readable directly (raw nested shape rendered NaN).
function flatten(raw: RawAttachment): Attachment {
  return { id: raw.id, ...raw.attributes };
}

export default class AttachmentsService extends Service {
  @tracked loading = false;

  async loadByOwner(
    ownerType: AttachmentOwnerType,
    ownerId: string
  ): Promise<Attachment[]> {
    this.loading = true;
    try {
      const json = await authFetchJson<{ data: RawAttachment[] }>(
        `/api/v1/${OWNER_SEGMENT[ownerType]}/${ownerId}/attachments`
      );
      return (json?.data ?? []).map(flatten);
    } finally {
      this.loading = false;
    }
  }

  // Upload multipart via authFetch — store.request ne gère pas FormData.
  // L'endpoint `/upload` stocke le binaire et dérive `uploadedById` du JWT.
  async upload(
    ownerType: AttachmentOwnerType,
    ownerId: string,
    file: File
  ): Promise<Attachment | null> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await authFetch(
      `/api/v1/${OWNER_SEGMENT[ownerType]}/${ownerId}/attachments/upload`,
      { method: 'POST', body: formData }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data: RawAttachment };
    return flatten(json.data);
  }

  async remove(attachmentId: string): Promise<void> {
    const res = await authFetch(`/api/v1/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Attachment deletion failed: ${String(res.status)}`);
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    attachments: AttachmentsService;
  }
}
