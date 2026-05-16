import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t, type IntlService } from 'ember-intl';
import type TimeEntriesService from '../services/time-entries.ts';
import type { TimeEntryData } from '../services/time-entries.ts';

interface LogTimeModalSignature {
  Args: {
    taskId?: string;
    projectId?: string;
    onClose: () => void;
    onSaved: (entry: TimeEntryData) => void;
  };
}

export default class LogTimeModal extends Component<LogTimeModalSignature> {
  @service declare timeEntries: TimeEntriesService;
  @service declare intl: IntlService;

  @tracked taskIdInput = this.args.taskId ?? '';
  @tracked hours = 0;
  @tracked date = new Date().toISOString().slice(0, 10);
  @tracked description = '';
  @tracked submitting = false;
  @tracked error = '';

  get validationError(): string | null {
    const effectiveTaskId = this.args.taskId ?? this.taskIdInput;
    if (!effectiveTaskId.trim()) {
      return this.intl.t('time-tracking.modal.logTime.errors.taskRequired');
    }
    if (this.hours <= 0) {
      return this.intl.t('time-tracking.modal.logTime.errors.hoursPositive');
    }
    const today = new Date().toISOString().slice(0, 10);
    if (this.date > today) {
      return this.intl.t('time-tracking.modal.logTime.errors.dateInFuture');
    }
    return null;
  }

  get canSubmit(): boolean {
    return this.validationError === null && !this.submitting;
  }

  get cannotSubmit(): boolean {
    return !this.canSubmit;
  }

  @action onTaskInput(e: Event) {
    this.taskIdInput = (e.target as HTMLInputElement).value;
  }

  @action onHoursInput(e: Event) {
    this.hours = Number((e.target as HTMLInputElement).value);
  }

  @action onDateInput(e: Event) {
    this.date = (e.target as HTMLInputElement).value;
  }

  @action onDescriptionInput(e: Event) {
    this.description = (e.target as HTMLTextAreaElement).value;
  }

  @action async submit(e: Event) {
    e.preventDefault();
    if (!this.canSubmit) return;
    const effectiveTaskId = this.args.taskId ?? this.taskIdInput;
    this.submitting = true;
    this.error = '';
    try {
      const created = await this.timeEntries.create({
        taskId: effectiveTaskId.trim(),
        userId: 'u1',
        projectId: this.args.projectId ?? 'proj-1',
        hours: this.hours,
        date: this.date,
        description: this.description.trim() || null,
      });
      this.args.onSaved(created);
      this.args.onClose();
    } catch (err: unknown) {
      this.error =
        err instanceof Error
          ? err.message
          : this.intl.t('time-tracking.modal.logTime.errorFallback');
    } finally {
      this.submitting = false;
    }
  }

  <template>
    <dialog class="modal modal-open" data-test-log-time-modal>
      <div class="modal-box max-w-lg bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{t "time-tracking.modal.logTime.title"}}</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "time-tracking.modal.logTime.closeAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        <form {{on "submit" this.submit}} class="flex flex-col gap-4">
          <div>
            <label class="label text-sm font-medium" for="log-time-task">
              {{t "time-tracking.modal.logTime.taskLabel"}}
              *
            </label>
            <input
              id="log-time-task"
              type="text"
              class="input input-bordered w-full"
              placeholder={{t "time-tracking.modal.logTime.taskPlaceholder"}}
              value={{this.taskIdInput}}
              disabled={{if @taskId true}}
              {{on "input" this.onTaskInput}}
              required
            />
          </div>

          <div>
            <label class="label text-sm font-medium" for="log-time-hours">
              {{t "time-tracking.modal.logTime.hoursLabel"}}
              *
            </label>
            <input
              id="log-time-hours"
              type="number"
              class="input input-bordered w-full"
              placeholder={{t "time-tracking.modal.logTime.hoursPlaceholder"}}
              min="0.1"
              step="0.25"
              value={{this.hours}}
              {{on "input" this.onHoursInput}}
              required
            />
          </div>

          <div>
            <label class="label text-sm font-medium" for="log-time-date">
              {{t "time-tracking.modal.logTime.dateLabel"}}
              *
            </label>
            <input
              id="log-time-date"
              type="date"
              class="input input-bordered w-full"
              value={{this.date}}
              {{on "input" this.onDateInput}}
              required
            />
          </div>

          <div>
            <label class="label text-sm font-medium" for="log-time-description">
              {{t "time-tracking.modal.logTime.descriptionLabel"}}
            </label>
            <textarea
              id="log-time-description"
              class="textarea textarea-bordered w-full h-20"
              placeholder={{t "time-tracking.modal.logTime.descriptionPlaceholder"}}
              {{on "input" this.onDescriptionInput}}
            >{{this.description}}</textarea>
          </div>

          {{#if this.error}}
            <div class="alert alert-error text-sm" data-test-submit-error>{{this.error}}</div>
          {{/if}}

          <div class="modal-action mt-2">
            <button
              type="button"
              class="btn"
              disabled={{this.submitting}}
              {{on "click" @onClose}}
            >{{t "time-tracking.modal.logTime.cancel"}}</button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={{this.cannotSubmit}}
            >
              {{if
                this.submitting
                (t "time-tracking.modal.logTime.submitting")
                (t "time-tracking.modal.logTime.submit")
              }}
            </button>
          </div>
        </form>
      </div>
      <button
        type="button"
        class="modal-backdrop"
        aria-label={{t "time-tracking.modal.logTime.closeAria"}}
        {{on "click" @onClose}}
      ></button>
    </dialog>
  </template>
}
