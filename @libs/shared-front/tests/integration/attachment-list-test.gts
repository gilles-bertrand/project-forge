import { describe, expect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, triggerEvent } from '@ember/test-helpers';
import Service from '@ember/service';
import AttachmentList from '#src/components/attachment-list.gts';
import { MAX_UPLOAD_BYTES } from '#src/services/attachments.ts';
import type {
  Attachment,
  AttachmentOwnerType,
} from '#src/schemas/attachments.ts';
import { initializeTestApp, TestApp } from '../app.ts';

// Plain (un-branded) view of the attachment fields, so test literals don't
// have to satisfy WarpDrive's `[Type]` symbol on `Attachment`.
type AttachmentFields = {
  id: string;
  ownerType: AttachmentOwnerType;
  ownerId: string;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  createdAt: string;
};

function att(over: Partial<AttachmentFields>): Attachment {
  return {
    id: 'a1',
    ownerType: 'task',
    ownerId: 't1',
    name: 'file',
    url: '/uploads/file',
    mimeType: 'application/octet-stream',
    sizeBytes: 10,
    uploadedById: 'u1',
    createdAt: '',
    ...over,
  } as Attachment;
}

interface UploadOpts {
  onProgress?: (percent: number) => void;
}

// In-memory stand-in for the real AttachmentsService: no network, records
// what the component asked it to upload so we can assert the drag-and-drop
// and client-side size-guard wiring without a mock server.
class FakeAttachments extends Service {
  loadResult: Attachment[] = [];
  uploadedFiles: File[] = [];
  progressReported = false;

  loadByOwner(): Promise<Attachment[]> {
    return Promise.resolve(this.loadResult);
  }

  upload(
    _ownerType: AttachmentOwnerType,
    _ownerId: string,
    file: File,
    options: UploadOpts = {}
  ): Promise<Attachment> {
    this.uploadedFiles.push(file);
    if (options.onProgress) {
      this.progressReported = true;
      options.onProgress(42);
    }
    return Promise.resolve(
      att({
        id: `created-${file.name}`,
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      })
    );
  }

  remove(): Promise<void> {
    return Promise.resolve();
  }
}

async function setup(owner: import('@ember/owner').default) {
  await initializeTestApp(owner, 'en-us');
  owner.register('service:attachments', FakeAttachments);
  return owner.lookup('service:attachments') as unknown as FakeAttachments;
}

function dropFile(file: File) {
  const dt = new DataTransfer();
  dt.items.add(file);
  return triggerEvent('[data-test-attachment-dropzone]', 'drop', {
    dataTransfer: dt,
  });
}

describe('Integration | AttachmentList | P4 upload UX', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'previews images and PDFs inline',
    async function ({ context }) {
      const svc = await setup(context.owner);
      svc.loadResult = [
        att({ id: 'img', name: 'photo.png', mimeType: 'image/png' }),
        att({ id: 'doc', name: 'spec.pdf', mimeType: 'application/pdf' }),
        att({ id: 'bin', name: 'blob.zip', mimeType: 'application/zip' }),
      ];

      await render(
        <template><AttachmentList @ownerType="task" @ownerId="t1" /></template>
      );

      expect(
        document.querySelector('[data-test-attachment-preview-image]')
      ).toBeTruthy();
      expect(
        document.querySelector('[data-test-attachment-preview-pdf]')
      ).toBeTruthy();
      // A non-previewable type gets a row but no preview block.
      expect(
        document.querySelector('[data-test-attachment-row="bin"]')
      ).toBeTruthy();
      expect(
        document.querySelector('[data-test-attachment-preview="bin"]')
      ).toBeFalsy();
    }
  );

  renderingTest(
    'rejects a file larger than the max upload size on drop',
    async function ({ context }) {
      const svc = await setup(context.owner);

      await render(
        <template><AttachmentList @ownerType="task" @ownerId="t1" /></template>
      );

      const tooBig = new File(
        [new Uint8Array(MAX_UPLOAD_BYTES + 1024)],
        'huge.bin',
        { type: 'application/octet-stream' }
      );
      await dropFile(tooBig);

      expect(
        document.querySelector('[data-test-attachment-list-error]')
      ).toBeTruthy();
      expect(svc.uploadedFiles.length).toBe(0);
    }
  );

  renderingTest(
    'uploads a dropped file (with progress) and shows the new row',
    async function ({ context }) {
      const svc = await setup(context.owner);

      await render(
        <template><AttachmentList @ownerType="task" @ownerId="t1" /></template>
      );

      const file = new File([new Uint8Array(2048)], 'ok.png', {
        type: 'image/png',
      });
      await dropFile(file);

      expect(svc.uploadedFiles.length).toBe(1);
      expect(svc.uploadedFiles[0]?.name).toBe('ok.png');
      expect(svc.progressReported).toBe(true);
      expect(
        document.querySelector('[data-test-attachment-row="created-ok.png"]')
      ).toBeTruthy();
    }
  );
});
