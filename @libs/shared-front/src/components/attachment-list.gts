import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { t } from 'ember-intl';
import type AttachmentsService from '#src/services/attachments.ts';
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
 * project): lists files with a download link, uploads via multipart and
 * deletes. `uploadedById` is derived server-side from the JWT.
 */
export default class AttachmentList extends Component<AttachmentListSignature> {
  @service declare attachments: AttachmentsService;

  @tracked items: Attachment[] = [];
  @tracked loading = true;
  @tracked uploading = false;
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

  humanSize = (bytes: number): string => {
    if (bytes < 1024) return `${String(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  @action async onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.uploading) return;
    this.uploading = true;
    this.error = '';
    try {
      const created = await this.attachments.upload(
        this.args.ownerType,
        this.args.ownerId,
        file
      );
      if (created) this.items = [...this.items, created];
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      input.value = '';
      if (!this.isDestroying && !this.isDestroyed) this.uploading = false;
    }
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
        <ul class="space-y-1">
          {{#each this.items as |attachment|}}
            <li
              class="flex items-center gap-2 text-sm bg-base-100 rounded px-2 py-1"
              data-test-attachment-row={{attachment.id}}
            >
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
            </li>
          {{/each}}
        </ul>
      {{/if}}

      <label
        class="btn btn-sm btn-outline mt-2 {{if this.uploading 'btn-disabled'}}"
        data-test-attachment-upload-label
      >
        {{#if this.uploading}}
          {{t "shared.attachments.uploading"}}
        {{else}}
          {{t "shared.attachments.upload"}}
        {{/if}}
        <input
          type="file"
          class="hidden"
          disabled={{this.uploading}}
          data-test-attachment-upload-input
          {{on "change" this.onFileChange}}
        />
      </label>

      {{#if this.error}}
        <div
          class="alert alert-error text-xs mt-2"
          data-test-attachment-list-error
        >{{this.error}}</div>
      {{/if}}
    </section>
  </template>
}
