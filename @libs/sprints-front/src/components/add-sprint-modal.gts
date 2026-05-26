import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t, type IntlService } from 'ember-intl';
import type SprintsService from '../services/sprints.ts';
import type { NewSprintPayload } from '../services/sprints.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';

interface AddSprintModalSignature {
  Args: {
    onClose: () => void;
  };
}

export default class AddSprintModal extends Component<AddSprintModalSignature> {
  @service declare sprints: SprintsService;
  @service declare currentProject: CurrentProjectService;
  @service declare intl: IntlService;

  @tracked name = '';
  @tracked goal = '';
  @tracked startDate = '';
  @tracked endDate = '';
  @tracked velocityPoints = 0;
  @tracked submitting = false;
  @tracked error = '';

  get canSubmit(): boolean {
    if (this.submitting) return false;
    if (!this.currentProject.currentProjectId) return false;
    if (this.startDate && this.endDate && this.endDate <= this.startDate) return false;
    return true;
  }

  get cannotSubmit(): boolean {
    return !this.canSubmit;
  }

  get datesError(): string | null {
    if (this.startDate && this.endDate && this.endDate <= this.startDate) {
      return 'La date de fin doit être après la date de début.';
    }
    return null;
  }

  @action onNameInput(e: Event) {
    this.name = (e.target as HTMLInputElement).value;
  }

  @action onGoalInput(e: Event) {
    this.goal = (e.target as HTMLTextAreaElement).value;
  }

  @action onStartDateInput(e: Event) {
    this.startDate = (e.target as HTMLInputElement).value;
  }

  @action onEndDateInput(e: Event) {
    this.endDate = (e.target as HTMLInputElement).value;
  }

  @action onVelocityInput(e: Event) {
    this.velocityPoints = Number((e.target as HTMLInputElement).value);
  }

  @action async submit(e: Event) {
    e.preventDefault();
    if (!this.canSubmit) return;
    const projectId = this.currentProject.currentProjectId;
    if (!projectId) return;
    this.submitting = true;
    this.error = '';
    try {
      const payload: NewSprintPayload = { projectId };
      if (this.name.trim()) payload.name = this.name.trim();
      if (this.goal.trim()) payload.goal = this.goal.trim();
      if (this.startDate) payload.startDate = this.startDate;
      if (this.endDate) payload.endDate = this.endDate;
      if (this.velocityPoints > 0) payload.velocityPoints = this.velocityPoints;
      await this.sprints.create(payload);
      this.args.onClose();
    } catch (err: unknown) {
      this.error =
        err instanceof Error
          ? err.message
          : this.intl.t('sprints.modal.add.errorFallback');
    } finally {
      this.submitting = false;
    }
  }

  <template>
    <dialog class="modal modal-open" data-test-add-sprint-modal>
      <div class="modal-box max-w-lg bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{t "sprints.modal.add.title"}}</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "sprints.modal.add.closeAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        <form {{on "submit" this.submit}} class="flex flex-col gap-4">
          <div>
            <label class="label text-sm font-medium" for="sprint-name">
              {{t "sprints.modal.add.name"}}
              *
            </label>
            <input
              id="sprint-name"
              type="text"
              class="input input-bordered w-full"
              placeholder={{t "sprints.modal.add.namePlaceholder"}}
              value={{this.name}}
              {{on "input" this.onNameInput}}
            />
          </div>

          <div>
            <label class="label text-sm font-medium" for="sprint-goal">
              {{t "sprints.modal.add.goal"}}
            </label>
            <textarea
              id="sprint-goal"
              class="textarea textarea-bordered w-full h-20"
              placeholder={{t "sprints.modal.add.goalPlaceholder"}}
              {{on "input" this.onGoalInput}}
            >{{this.goal}}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label text-sm font-medium" for="sprint-start">
                {{t "sprints.modal.add.startDate"}}
              </label>
              <input
                id="sprint-start"
                type="date"
                class="input input-bordered w-full"
                value={{this.startDate}}
                {{on "input" this.onStartDateInput}}
              />
              <p class="text-xs opacity-50 mt-1">{{t "sprints.modal.add.startDateHint"}}</p>
            </div>
            <div>
              <label class="label text-sm font-medium" for="sprint-end">
                {{t "sprints.modal.add.endDate"}}
              </label>
              <input
                id="sprint-end"
                type="date"
                class="input input-bordered w-full"
                value={{this.endDate}}
                {{on "input" this.onEndDateInput}}
              />
              <p class="text-xs opacity-50 mt-1">{{t "sprints.modal.add.endDateHint"}}</p>
            </div>
          </div>

          {{#if this.datesError}}
            <div
              class="alert alert-warning text-sm"
              data-test-dates-error
            >{{this.datesError}}</div>
          {{/if}}

          <div>
            <label class="label text-sm font-medium" for="sprint-velocity">
              {{t "sprints.modal.add.velocity"}}
            </label>
            <input
              id="sprint-velocity"
              type="number"
              class="input input-bordered w-full"
              min="0"
              value={{this.velocityPoints}}
              {{on "input" this.onVelocityInput}}
            />
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
            >{{t "sprints.modal.add.cancel"}}</button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={{this.cannotSubmit}}
            >
              {{if
                this.submitting
                (t "sprints.modal.add.submitting")
                (t "sprints.modal.add.submit")
              }}
            </button>
          </div>
        </form>
      </div>
      <button
        type="button"
        class="modal-backdrop"
        aria-label={{t "sprints.modal.add.closeAria"}}
        {{on "click" @onClose}}
      ></button>
    </dialog>
  </template>
}
