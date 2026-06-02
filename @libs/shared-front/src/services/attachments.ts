import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import {
  authFetch,
  authFetchJson,
  readAccessToken,
} from '#src/utils/auth-fetch.ts';
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

// Mirror of the backend @fastify/multipart limit (25 MB, single file) so the
// UI can reject oversize files before wasting an upload round-trip.
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

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

  // Upload multipart via XHR (not fetch): only XHR exposes upload.onprogress,
  // which an accurate progress bar needs. store.request can't do FormData
  // either. The `/upload` endpoint stores the binary and derives
  // `uploadedById` from the JWT, so we attach the same Bearer as authFetch.
  async upload(
    ownerType: AttachmentOwnerType,
    ownerId: string,
    file: File,
    options: UploadOptions = {}
  ): Promise<Attachment | null> {
    const url = `/api/v1/${OWNER_SEGMENT[ownerType]}/${ownerId}/attachments/upload`;
    const token = readAccessToken();
    const formData = new FormData();
    formData.append('file', file);

    return new Promise<Attachment | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (options.onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            options.onProgress?.(Math.round((e.loaded / e.total) * 100));
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText) as {
              data: RawAttachment;
            };
            resolve(flatten(json.data));
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
      xhr.addEventListener('error', () => {
        resolve(null);
      });
      xhr.addEventListener('abort', () => {
        resolve(null);
      });

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      xhr.send(formData);
    });
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
