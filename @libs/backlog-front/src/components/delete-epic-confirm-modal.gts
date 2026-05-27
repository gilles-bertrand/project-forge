import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import type { Epic } from '../schemas/epics.ts';

interface DeleteEpicConfirmModalSignature {
  Args: {
    epic: Epic;
    orphanCount: number;
    onConfirm: () => Promise<void>;
    onClose: () => void;
  };
}

export default class DeleteEpicConfirmModal extends Component<DeleteEpicConfirmModalSignature> {
  @tracked submitting = false;
  @tracked error = '';

  @action async confirm() {
    if (this.submitting) return;
    this.submitting = true;
    this.error = '';
    try {
      await this.args.onConfirm();
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      // The parent may unmount this modal as soon as `onConfirm()` resolves
      // (setting `deleteEpicTarget = null`). Mutating tracked state on a
      // destroyed component triggers a Glimmer dev assertion / warning.
      if (!this.isDestroying && !this.isDestroyed) {
        this.submitting = false;
      }
    }
  }

  <template>
    <dialog class="modal modal-open" data-test-delete-epic-confirm-modal>
      <div class="modal-box max-w-md bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{t
              "user-story-map.deleteEpicConfirmTitle"
            }}</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "user-story-map.deleteEpicCloseAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        <p class="mb-4 text-sm opacity-80">
          {{t
            "user-story-map.deleteEpicConfirmBody"
            title=@epic.title
            count=@orphanCount
          }}
        </p>

        {{#if this.error}}
          <div class="alert alert-error text-sm mb-4">{{this.error}}</div>
        {{/if}}

        <div class="modal-action">
          <button
            type="button"
            class="btn"
            disabled={{this.submitting}}
            {{on "click" @onClose}}
          >{{t "user-story-map.deleteEpicCancel"}}</button>
          <button
            type="button"
            class="btn btn-error"
            disabled={{this.submitting}}
            {{on "click" this.confirm}}
          >
            {{#if this.submitting}}
              <span class="loading loading-spinner loading-xs"></span>
              {{t "user-story-map.deleteEpicSubmitting"}}
            {{else}}
              {{t "user-story-map.deleteEpicConfirmAction"}}
            {{/if}}
          </button>
        </div>
      </div>
      <button
        type="button"
        class="modal-backdrop"
        aria-label={{t "user-story-map.deleteEpicCloseAria"}}
        {{on "click" @onClose}}
      ></button>
    </dialog>
  </template>
}
