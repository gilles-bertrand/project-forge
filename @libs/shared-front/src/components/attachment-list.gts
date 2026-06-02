import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { t } from 'ember-intl';
import type IntlService from 'ember-intl/services/intl';
import type AttachmentsService from '#src/services/attachments.ts';
import { MAX_UPLOAD_BYTES } from '#src/services/attachments.ts';
import type {
  Attachment,
  AttachmentOwnerType,
} from '#src/schemas/attachments.ts';

interface AttachmentListSignature {
  Element: HTMLElement;
  Args: {
    ownerType: AttachmentOwnerType;
    ownerId: string;
  };
}

/**
 * Polymorphic attachment list for any owner (task / epic / user-story /
 * project): lists files with a download link, uploads via multipart (with an
 * accurate progress bar and drag-and-drop) and deletes. Images and PDFs are
 * previewed inline. `uploadedById` is derived server-side from the JWT.
 */
export default class AttachmentList extends Component<AttachmentListSignature> {
  @service declare attachments: AttachmentsService;
  @service declare intl: IntlService;

  @tracked items: Attachment[] = [];
  @tracked loading = true;
  @tracked uploading = false;
  @tracked progress = 0;
  @tracked dragOver = false;
  @tracked error = '';

  constructor(owner: unknown, args: AttachmentListSignature['Args']) {
    super(owner as never, args);
    void this.load();
  }

  private async load() {
    this.loading = true;
    try {
      this.items = await this.attachments.loadByOwner(
        this.args.ownerType,
        this.args.ownerId
      );
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
      this.items = [];
    } finally {
      if (!this.isDestroying && !this.isDestroyed) this.loading = false;
    }
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  get maxSizeLabel(): string {
    return this.humanSize(MAX_UPLOAD_BYTES);
  }

  humanSize = (bytes: number): string => {
    if (bytes < 1024) return `${String(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  isImage = (mimeType: string): boolean => mimeType.startsWith('image/');

  isPdf = (mimeType: string): boolean => mimeType === 'application/pdf';

  hasPreview = (attachment: Attachment): boolean =>
    this.isImage(attachment.mimeType) || this.isPdf(attachment.mimeType);

  // Shared by the file input and the drop zone. Validates size client-side
  // (mirror of the backend 25 MB limit) before spending an upload round-trip.
  private async uploadFile(file: File) {
    if (this.uploading) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      this.error = this.intl.t('shared.attachments.tooLarge', {
        max: this.maxSizeLabel,
      });
      return;
    }
    this.uploading = true;
    this.progress = 0;
    this.error = '';
    try {
      const created = await this.attachments.upload(
        this.args.ownerType,
        this.args.ownerId,
        file,
        {
          onProgress: (percent) => {
            if (!this.isDestroying && !this.isDestroyed)
              this.progress = percent;
          },
        }
      );
      if (created) {
        this.items = [...this.items, created];
      } else {
        this.error = this.intl.t('shared.attachments.uploadFailed');
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      if (!this.isDestroying && !this.isDestroyed) {
        this.uploading = false;
        this.progress = 0;
      }
    }
  }

  @action async onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.uploadFile(file);
    input.value = '';
  }

  @action onDragOver(e: DragEvent) {
    e.preventDefault();
    if (!this.uploading) this.dragOver = true;
  }

  @action onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.dragOver = false;
  }

  @action async onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) await this.uploadFile(file);
  }

  @action async removeItem(attachment: Attachment) {
    this.error = '';
    try {
      await this.attachments.remove(attachment.id);
      this.items = this.items.filter((a) => a.id !== attachment.id);
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  <template>
    <section data-test-attachment-list ...attributes>
      {{#if this.loading}}
        <p class="text-sm italic opacity-60" data-test-attachment-list-loading>
          {{t "shared.attachments.loading"}}
        </p>
      {{else if this.isEmpty}}
        <p class="text-sm opacity-60 italic" data-test-attachment-list-empty>
          {{t "shared.attachments.empty"}}
        </p>
      {{else}}
        <ul class="space-y-2">
          {{#each this.items as |attachment|}}
            <li
              class="bg-base-100 rounded px-2 py-1"
              data-test-attachment-row={{attachment.id}}
            >
              <div class="flex items-center gap-2 text-sm">
                <a
                  href={{attachment.url}}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="link link-primary truncate flex-1"
                  aria-label={{t "shared.attachments.downloadAria"}}
                  data-test-attachment-download
                >{{attachment.name}}</a>
                <span class="text-xs opacity-60">{{this.humanSize
                    attachment.sizeBytes
                  }}</span>
                <button
                  type="button"
                  class="btn btn-xs btn-ghost text-error"
                  aria-label={{t "shared.attachments.deleteAria"}}
                  data-test-attachment-delete
                  {{on "click" (fn this.removeItem attachment)}}
                >✕</button>
              </div>
              {{#if (this.hasPreview attachment)}}
                <div
                  class="mt-1"
                  data-test-attachment-preview={{attachment.id}}
                >
                  {{#if (this.isImage attachment.mimeType)}}
                    <img
                      src={{attachment.url}}
                      alt={{attachment.name}}
                      class="max-h-40 rounded border border-base-300"
                      loading="lazy"
                      data-test-attachment-preview-image
                    />
                  {{else}}
                    <embed
                      src={{attachment.url}}
                      type="application/pdf"
                      class="w-full h-40 rounded border border-base-300"
                      data-test-attachment-preview-pdf
                    />
                  {{/if}}
                </div>
              {{/if}}
            </li>
          {{/each}}
        </ul>
      {{/if}}

      {{! Drop zone doubles as the upload trigger (label wraps the input). }}
      <label
        class="flex flex-col items-center justify-center gap-1 mt-2 px-3 py-4 rounded border-2 border-dashed cursor-pointer transition-colors
          {{if this.dragOver 'border-primary bg-primary/10' 'border-base-300'}}
          {{if this.uploading 'opacity-60 pointer-events-none' ''}}"
        data-test-attachment-dropzone
        {{on "dragover" this.onDragOver}}
        {{on "dragleave" this.onDragLeave}}
        {{on "drop" this.onDrop}}
      >
        <span class="text-sm font-medium" data-test-attachment-upload-label>
          {{#if this.uploading}}
            {{t "shared.attachments.uploading"}}
          {{else}}
            {{t "shared.attachments.upload"}}
          {{/if}}
        </span>
        <span class="text-xs opacity-60">
          {{t "shared.attachments.dropHint" max=this.maxSizeLabel}}
        </span>
        <input
          type="file"
          class="hidden"
          disabled={{this.uploading}}
          data-test-attachment-upload-input
          {{on "change" this.onFileChange}}
        />
      </label>

      {{#if this.uploading}}
        <progress
          class="progress progress-primary w-full mt-2"
          value={{this.progress}}
          max="100"
          aria-label={{t "shared.attachments.progressAria"}}
          data-test-attachment-progress
        >{{this.progress}}%</progress>
      {{/if}}

      {{#if this.error}}
        <div
          class="alert alert-error text-xs mt-2"
          data-test-attachment-list-error
        >{{this.error}}</div>
      {{/if}}
    </section>
  </template>
}
