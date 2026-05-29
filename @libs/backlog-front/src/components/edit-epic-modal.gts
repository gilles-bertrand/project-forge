import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t, type IntlService } from 'ember-intl';
import type Owner from '@ember/owner';
import type EpicsService from '../services/epics.ts';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type { Epic, EpicStatus, EpicType } from '../schemas/epics.ts';
import CommentThread from '@libs/shared-front/components/comment-thread';
import AttachmentList from '@libs/shared-front/components/attachment-list';

interface EditEpicModalSignature {
  Args: {
    epic: Epic;
    onClose: () => void;
  };
}

const STATUS_VALUES: EpicStatus[] = ['todo', 'in-progress', 'done'];
const TYPE_VALUES: EpicType[] = ['functional', 'architectural'];
const DEFAULT_COLOR = '#6B7280';

export default class EditEpicModal extends Component<EditEpicModalSignature> {
  @service declare epics: EpicsService;
  @service('current-user') declare currentUser: CurrentUserService;
  @service declare intl: IntlService;

  @tracked title = '';
  @tracked description = '';
  @tracked status: EpicStatus = 'todo';
  @tracked color: string = DEFAULT_COLOR;
  @tracked type: EpicType = 'functional';
  @tracked submitting = false;
  @tracked error = '';

  constructor(owner: Owner, args: EditEpicModalSignature['Args']) {
    super(owner, args);
    this.title = args.epic.title;
    this.description = args.epic.description;
    this.status = args.epic.status;
    this.color = args.epic.color ?? DEFAULT_COLOR;
    this.type = args.epic.type ?? 'functional';
  }

  get statusOptions(): { value: EpicStatus; label: string }[] {
    return STATUS_VALUES.map((value) => ({
      value,
      label: this.intl.t(`backlog.status.${value}`),
    }));
  }

  get typeOptions(): { value: EpicType; label: string }[] {
    return TYPE_VALUES.map((value) => ({
      value,
      label: this.intl.t(`backlog.epicType.${value}`),
    }));
  }

  get currentUserId(): string | null {
    return this.currentUser.user?.id ?? null;
  }

  get canSubmit(): boolean {
    return this.title.trim().length > 0 && !this.submitting;
  }

  get cannotSubmit(): boolean {
    return !this.canSubmit;
  }

  isStatusSelected = (v: EpicStatus): boolean => this.status === v;
  isTypeSelected = (v: EpicType): boolean => this.type === v;

  @action onTitleInput(e: Event) {
    this.title = (e.target as HTMLInputElement).value;
  }

  @action onDescriptionInput(e: Event) {
    this.description = (e.target as HTMLTextAreaElement).value;
  }

  @action onStatusChange(e: Event) {
    this.status = (e.target as HTMLSelectElement).value as EpicStatus;
  }

  @action onTypeChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value as EpicType;
    if (TYPE_VALUES.includes(v)) {
      this.type = v;
    }
  }

  @action onColorInput(e: Event) {
    this.color = (e.target as HTMLInputElement).value;
  }

  @action async submit(e: Event) {
    e.preventDefault();
    if (!this.canSubmit) return;
    this.submitting = true;
    this.error = '';
    try {
      const epicId = this.args.epic.id;
      const projectId = this.args.epic.projectId;
      if (!epicId || !projectId) return;
      await this.epics.update(epicId, projectId, {
        title: this.title.trim(),
        description: this.description.trim(),
        status: this.status,
        color: this.color,
        type: this.type,
      });
      this.args.onClose();
    } catch (err: unknown) {
      this.error =
        err instanceof Error
          ? err.message
          : this.intl.t('backlog.modal.editEpic.errorFallback');
    } finally {
      // `onClose()` unmounts this modal. Avoid mutating tracked state on a
      // destroyed component (Glimmer dev assertion).
      if (!this.isDestroying && !this.isDestroyed) {
        this.submitting = false;
      }
    }
  }

  <template>
    <dialog class="modal modal-open" data-test-edit-epic-modal>
      <div class="modal-box max-w-xl lg:max-w-5xl bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{t
              "backlog.modal.editEpic.title"
            }}</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "backlog.modal.editEpic.closeAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <form {{on "submit" this.submit}} class="flex flex-col gap-4">
            <div>
              <label class="label text-sm font-medium" for="edit-epic-title">
                {{t "backlog.modal.editEpic.name"}}
                *
              </label>
              <input
                id="edit-epic-title"
                type="text"
                class="input input-bordered w-full"
                value={{this.title}}
                {{on "input" this.onTitleInput}}
                required
              />
            </div>

            <div>
              <label
                class="label text-sm font-medium"
                for="edit-epic-description"
              >
                {{t "backlog.modal.editEpic.description"}}
              </label>
              <textarea
                id="edit-epic-description"
                class="textarea textarea-bordered w-full h-24"
                {{on "input" this.onDescriptionInput}}
              >{{this.description}}</textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label text-sm font-medium" for="edit-epic-status">
                  {{t "backlog.modal.editEpic.status"}}
                </label>
                <select
                  id="edit-epic-status"
                  class="select select-bordered w-full"
                  {{on "change" this.onStatusChange}}
                >
                  {{#each this.statusOptions as |opt|}}
                    <option
                      value={{opt.value}}
                      selected={{this.isStatusSelected opt.value}}
                    >
                      {{opt.label}}
                    </option>
                  {{/each}}
                </select>
              </div>

              <div>
                <label class="label text-sm font-medium" for="edit-epic-type">
                  {{t "backlog.modal.editEpic.type"}}
                </label>
                <select
                  id="edit-epic-type"
                  class="select select-bordered w-full"
                  {{on "change" this.onTypeChange}}
                >
                  {{#each this.typeOptions as |opt|}}
                    <option
                      value={{opt.value}}
                      selected={{this.isTypeSelected opt.value}}
                    >{{opt.label}}</option>
                  {{/each}}
                </select>
              </div>
            </div>

            <div>
              <label class="label text-sm font-medium" for="edit-epic-color">
                {{t "backlog.modal.editEpic.color"}}
              </label>
              <div class="flex items-center gap-3">
                <input
                  id="edit-epic-color"
                  type="color"
                  class="input input-bordered h-10 w-16 cursor-pointer p-1"
                  value={{this.color}}
                  {{on "input" this.onColorInput}}
                />
                <span class="text-xs opacity-70 font-mono">{{this.color}}</span>
              </div>
            </div>

            {{#if this.error}}
              <div class="alert alert-error text-sm">{{this.error}}</div>
            {{/if}}

            <div class="modal-action mt-2">
              <button
                type="button"
                class="btn"
                disabled={{this.submitting}}
                {{on "click" @onClose}}
              >{{t "backlog.modal.editEpic.cancel"}}</button>
              <button
                type="submit"
                class="btn btn-primary"
                disabled={{this.cannotSubmit}}
              >
                {{if
                  this.submitting
                  (t "backlog.modal.editEpic.submitting")
                  (t "backlog.modal.editEpic.submit")
                }}
              </button>
            </div>
          </form>

          {{#if @epic.id}}
            <div class="space-y-4">
              <section>
                <h4 class="font-semibold mb-2 text-sm">{{t
                    "shared.attachments.title"
                  }}</h4>
                <AttachmentList @ownerType="epic" @ownerId={{@epic.id}} />
              </section>

              <section class="border-t border-base-300 pt-4">
                <h4 class="font-semibold mb-2 text-sm">{{t
                    "shared.comments.title"
                  }}</h4>
                <CommentThread
                  @ownerType="epic"
                  @ownerId={{@epic.id}}
                  @currentUserId={{this.currentUserId}}
                  @projectId={{@epic.projectId}}
                />
              </section>
            </div>
          {{/if}}
        </div>
      </div>
      <button
        type="button"
        class="modal-backdrop"
        aria-label={{t "backlog.modal.editEpic.closeAria"}}
        {{on "click" @onClose}}
      ></button>
    </dialog>
  </template>
}
