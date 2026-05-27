import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t, type IntlService } from 'ember-intl';
import type Owner from '@ember/owner';
import type { Store } from '@warp-drive/core';
import type EpicsService from '../services/epics.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { EpicStatus } from '../schemas/epics.ts';

interface AddEpicModalSignature {
  Args: { onClose: () => void };
}

const STATUS_VALUES: EpicStatus[] = ['todo', 'in-progress', 'done'];

export default class AddEpicModal extends Component<AddEpicModalSignature> {
  @service declare epics: EpicsService;
  @service declare currentProject: CurrentProjectService;
  @service declare intl: IntlService;
  @service declare store: Store;

  @tracked title = '';
  @tracked description = '';
  @tracked status: EpicStatus = 'todo';
  @tracked submitting = false;
  @tracked error = '';
  @tracked currentProjectName = '';

  constructor(owner: Owner, args: AddEpicModalSignature['Args']) {
    super(owner, args);
    void this.loadProjectName();
  }

  private async loadProjectName() {
    const id = this.currentProject.currentProjectId;
    if (!id) return;
    try {
      const { content } = await this.store.request<{
        data: { attributes: { name: string } };
      }>({ url: `/api/v1/projects/${id}`, method: 'GET' });
      if (!this.isDestroying && !this.isDestroyed) {
        this.currentProjectName = content.data.attributes.name;
      }
    } catch {
      if (!this.isDestroying && !this.isDestroyed) {
        this.currentProjectName = id;
      }
    }
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
    const projectId = this.currentProject.currentProjectId;
    if (!projectId) return;
    this.submitting = true;
    this.error = '';
    try {
      await this.epics.create({
        title: this.title.trim(),
        description: this.description.trim(),
        projectId,
        status: this.status,
      });
      this.args.onClose();
    } catch (err: unknown) {
      this.error =
        err instanceof Error
          ? err.message
          : this.intl.t('backlog.modal.addEpic.errorFallback');
    } finally {
      this.submitting = false;
    }
  }

  <template>
    <dialog class="modal modal-open" data-test-add-epic-modal>
      <div class="modal-box max-w-lg bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{t "backlog.modal.addEpic.title"}}</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "backlog.modal.addEpic.closeAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        <form {{on "submit" this.submit}} class="flex flex-col gap-4">
          <div>
            <label class="label text-sm font-medium" for="epic-project">
              {{t "backlog.modal.addEpic.project"}}
            </label>
            <input
              id="epic-project"
              type="text"
              class="input input-bordered w-full opacity-60"
              value={{this.currentProjectName}}
              readonly
            />
          </div>

          <div>
            <label class="label text-sm font-medium" for="epic-title">
              {{t "backlog.modal.addEpic.name"}}
              *
            </label>
            <input
              id="epic-title"
              type="text"
              class="input input-bordered w-full"
              placeholder={{t "backlog.modal.addEpic.namePlaceholder"}}
              value={{this.title}}
              {{on "input" this.onTitleInput}}
              required
            />
          </div>

          <div>
            <label class="label text-sm font-medium" for="epic-description">
              {{t "backlog.modal.addEpic.description"}}
            </label>
            <textarea
              id="epic-description"
              class="textarea textarea-bordered w-full h-24"
              placeholder={{t "backlog.modal.addEpic.descriptionPlaceholder"}}
              {{on "input" this.onDescriptionInput}}
            >{{this.description}}</textarea>
          </div>

          <div>
            <label class="label text-sm font-medium" for="epic-status">
              {{t "backlog.modal.addEpic.status"}}
            </label>
            <select
              id="epic-status"
              class="select select-bordered w-full"
              {{on "change" this.onStatusChange}}
            >
              {{#each this.statusOptions as |opt|}}
                <option
                  value={{opt.value}}
                  selected={{this.isStatusSelected opt.value}}
                >{{opt.label}}</option>
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
            >{{t "backlog.modal.addEpic.cancel"}}</button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={{this.cannotSubmit}}
            >
              {{if
                this.submitting
                (t "backlog.modal.addEpic.submitting")
                (t "backlog.modal.addEpic.submit")
              }}
            </button>
          </div>
        </form>
      </div>
      <button
        type="button"
        class="modal-backdrop"
        aria-label={{t "backlog.modal.addEpic.closeAria"}}
        {{on "click" @onClose}}
      ></button>
    </dialog>
  </template>
}
