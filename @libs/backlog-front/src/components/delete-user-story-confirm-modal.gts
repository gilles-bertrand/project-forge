import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import type { UserStory } from '../schemas/user-stories.ts';

interface DeleteUserStoryConfirmModalSignature {
  Args: {
    userStory: UserStory;
    taskCount: number;
    onConfirm: () => Promise<void>;
    onClose: () => void;
  };
}

export default class DeleteUserStoryConfirmModal extends Component<DeleteUserStoryConfirmModalSignature> {
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
      if (!this.isDestroying && !this.isDestroyed) {
        this.submitting = false;
      }
    }
  }

  <template>
    <dialog class="modal modal-open" data-test-delete-user-story-confirm-modal>
      <div class="modal-box max-w-md bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{t
              "user-story-map.deleteUSConfirmTitle"
            }}</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "user-story-map.deleteUSCloseAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        <p class="mb-4 text-sm opacity-80">
          {{t
            "user-story-map.deleteUSConfirmBody"
            title=@userStory.title
            count=@taskCount
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
          >{{t "user-story-map.deleteUSCancel"}}</button>
          <button
            type="button"
            class="btn btn-error"
            disabled={{this.submitting}}
            {{on "click" this.confirm}}
          >
            {{#if this.submitting}}
              <span class="loading loading-spinner loading-xs"></span>
              {{t "user-story-map.deleteUSSubmitting"}}
            {{else}}
              {{t "user-story-map.deleteUSConfirmAction"}}
            {{/if}}
          </button>
        </div>
      </div>
      <button
        type="button"
        class="modal-backdrop"
        aria-label={{t "user-story-map.deleteUSCloseAria"}}
        {{on "click" @onClose}}
      ></button>
    </dialog>
  </template>
}
