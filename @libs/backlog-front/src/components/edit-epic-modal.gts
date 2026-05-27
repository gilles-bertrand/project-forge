import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t, type IntlService } from 'ember-intl';
import type Owner from '@ember/owner';
import type EpicsService from '../services/epics.ts';
import type { Epic, EpicStatus } from '../schemas/epics.ts';

interface EditEpicModalSignature {
  Args: {
    epic: Epic;
    onClose: () => void;
  };
}

const STATUS_VALUES: EpicStatus[] = ['todo', 'in-progress', 'done'];

export default class EditEpicModal extends Component<EditEpicModalSignature> {
  @service declare epics: EpicsService;
  @service declare intl: IntlService;

  @tracked title = '';
  @tracked description = '';
  @tracked status: EpicStatus = 'todo';
  @tracked submitting = false;
  @tracked error = '';

  constructor(owner: Owner, args: EditEpicModalSignature['Args']) {
    super(owner, args);
    this.title = args.epic.title;
    this.description = args.epic.description;
    this.status = args.epic.status;
  }

  get statusOptions(): { value: EpicStatus; label: string }[] {
    return STATUS_VALUES.map((value) => ({
      value,
      label: this.intl.t(`backlog.status.${value}`),
    }));
  }

  get canSubmit(): boolean {
    return this.title.trim().length > 0 && !this.submitting;
  }

  get cannotSubmit(): boolean {
    return !this.canSubmit;
  }

  isStatusSelected = (v: EpicStatus): boolean => this.status === v;

  @action onTitleInput(e: Event) {
    this.title = (e.target as HTMLInputElement).value;
  }

  @action onDescriptionInput(e: Event) {
    this.description = (e.target as HTMLTextAreaElement).value;
  }

  @action onStatusChange(e: Event) {
    this.status = (e.target as HTMLSelectElement).value as EpicStatus;
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
      <div class="modal-box max-w-lg bg-base-200">
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
