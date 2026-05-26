import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import type SprintsService from '../services/sprints.ts';
import type { SprintData, ClosePreviewData, CloseAction, StopSprintMeta } from '../services/sprints.ts';

interface CloseSprintModalSignature {
  Args: {
    sprint: SprintData;
    onClose: () => void;
    onClosed: (meta: StopSprintMeta) => void;
  };
}

export default class CloseSprintModal extends Component<CloseSprintModalSignature> {
  @service declare sprints: SprintsService;

  @tracked preview: ClosePreviewData | null = null;
  @tracked loading = true;
  @tracked submitting = false;
  @tracked error = '';
  @tracked selectedAction: CloseAction = 'send-to-backlog';
  @tracked targetSprintId = '';

  constructor(owner: unknown, args: CloseSprintModalSignature['Args']) {
    super(owner as never, args);
    void this.loadPreview();
  }

  private async loadPreview(): Promise<void> {
    try {
      this.preview = await this.sprints.closePreview(this.args.sprint.id);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Erreur lors du chargement';
    } finally {
      this.loading = false;
    }
  }

  get hasUnfinished(): boolean {
    if (!this.preview) return false;
    return this.preview.unfinishedTasks.length + this.preview.unfinishedStories.length > 0;
  }

  get totalUnfinished(): number {
    if (!this.preview) return 0;
    return this.preview.unfinishedTasks.length + this.preview.unfinishedStories.length;
  }

  get canConfirm(): boolean {
    if (this.submitting || this.loading) return false;
    if (this.hasUnfinished && this.selectedAction === 'move-to-existing' && !this.targetSprintId) {
      return false;
    }
    return true;
  }

  get isBacklog(): boolean { return this.selectedAction === 'send-to-backlog'; }
  get isExisting(): boolean { return this.selectedAction === 'move-to-existing'; }
  get isNext(): boolean { return this.selectedAction === 'move-to-next'; }

  @action onActionChange(e: Event) {
    this.selectedAction = (e.target as HTMLInputElement).value as CloseAction;
  }

  @action onTargetChange(e: Event) {
    this.targetSprintId = (e.target as HTMLSelectElement).value;
  }

  @action async confirm() {
    if (!this.canConfirm) return;
    this.submitting = true;
    this.error = '';
    try {
      const payload = this.hasUnfinished
        ? {
            action: this.selectedAction,
            ...(this.selectedAction === 'move-to-existing' ? { targetSprintId: this.targetSprintId } : {}),
          }
        : undefined;
      const { meta } = await this.sprints.stop(this.args.sprint.id, this.args.sprint.projectId, payload);
      this.args.onClosed(meta);
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Erreur lors de la clôture';
    } finally {
      this.submitting = false;
    }
  }

  <template>
    <dialog class="modal modal-open" data-test-close-sprint-modal>
      <div class="modal-box max-w-lg bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{t "sprints.modal.close.title"}}</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            {{on "click" @onClose}}
          >✕</button>
        </div>

        {{#if this.loading}}
          <div class="flex justify-center py-8">
            <span class="loading loading-spinner loading-md"></span>
          </div>
        {{else if this.error}}
          <div class="alert alert-error text-sm">{{this.error}}</div>
        {{else if this.hasUnfinished}}
          <div class="flex flex-col gap-4">
            <p class="text-sm opacity-80">
              {{t "sprints.modal.close.hasUnfinished" count=this.totalUnfinished}}
            </p>

            <div class="flex flex-col gap-2 max-h-32 overflow-y-auto text-xs opacity-70">
              {{#each this.preview.unfinishedTasks as |task|}}
                <span>📋 {{task.title}} <span class="badge badge-xs">{{task.status}}</span></span>
              {{/each}}
              {{#each this.preview.unfinishedStories as |story|}}
                <span>📖 {{story.title}} <span class="badge badge-xs">{{story.status}}</span></span>
              {{/each}}
            </div>

            <div class="flex flex-col gap-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  class="radio radio-sm"
                  name="close-action"
                  value="send-to-backlog"
                  checked={{this.isBacklog}}
                  {{on "change" this.onActionChange}}
                />
                <span class="text-sm">{{t "sprints.modal.close.choiceBacklog"}}</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  class="radio radio-sm"
                  name="close-action"
                  value="move-to-existing"
                  checked={{this.isExisting}}
                  {{on "change" this.onActionChange}}
                />
                <span class="text-sm">{{t "sprints.modal.close.choiceExisting"}}</span>
              </label>

              {{#if this.isExisting}}
                <select
                  class="select select-bordered select-sm w-full ml-6"
                  {{on "change" this.onTargetChange}}
                >
                  <option value="">{{t "sprints.modal.close.selectSprint"}}</option>
                  {{#each this.preview.availableNextSprints as |s|}}
                    <option value={{s.id}}>{{s.name}}</option>
                  {{/each}}
                </select>
              {{/if}}

              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  class="radio radio-sm"
                  name="close-action"
                  value="move-to-next"
                  checked={{this.isNext}}
                  {{on "change" this.onActionChange}}
                />
                <span class="text-sm">{{t "sprints.modal.close.choiceNext"}}</span>
              </label>
            </div>
          </div>
        {{else}}
          <p class="text-sm opacity-80 py-2">{{t "sprints.modal.close.noUnfinished"}}</p>
        {{/if}}

        {{#if this.error}}
          <div class="alert alert-error text-sm mt-3">{{this.error}}</div>
        {{/if}}

        <div class="modal-action mt-4">
          <button
            type="button"
            class="btn"
            disabled={{this.submitting}}
            {{on "click" @onClose}}
          >{{t "sprints.modal.close.cancel"}}</button>
          <button
            type="button"
            class="btn btn-error"
            disabled={{if this.canConfirm false true}}
            {{on "click" this.confirm}}
          >
            {{if this.submitting
              (t "sprints.actions.closing")
              (t "sprints.modal.close.confirm")}}
          </button>
        </div>
      </div>
      <button
        type="button"
        class="modal-backdrop"
        aria-label={{t "sprints.modal.close.cancel"}}
        {{on "click" @onClose}}
      ></button>
    </dialog>
  </template>
}
