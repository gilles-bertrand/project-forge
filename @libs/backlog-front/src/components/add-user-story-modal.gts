import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t, type IntlService } from 'ember-intl';
import type UserStoriesService from '../services/user-stories.ts';
import type EpicsService from '../services/epics.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type {
  StoryStatus,
  StoryPoints,
  StoryPriority,
} from '../schemas/user-stories.ts';

interface AddUserStoryModalSignature {
  Args: {
    onClose: () => void;
    preselectedEpicId?: string | null;
  };
}

// Initial creation only allows `suggested` (sandbox) or `accepted` (backlog),
// per the iceScrum workflow. Other statuses are reached via valid transitions.
const STATUS_VALUES: StoryStatus[] = ['suggested', 'accepted'];
const POINT_VALUES: (StoryPoints | null)[] = [null, 1, 2, 3, 5, 8, 13, 21];
const PRIORITY_VALUES: StoryPriority[] = [
  'Basse',
  'Moyenne',
  'Haute',
  'Critique',
];

export default class AddUserStoryModal extends Component<AddUserStoryModalSignature> {
  @service declare userStories: UserStoriesService;
  @service declare epics: EpicsService;
  @service declare currentProject: CurrentProjectService;
  @service declare intl: IntlService;

  @tracked title = '';
  @tracked description = '';
  @tracked status: StoryStatus = 'suggested';
  @tracked epicId: string | null = this.args.preselectedEpicId ?? null;
  @tracked points: StoryPoints | null = null;
  @tracked priority: StoryPriority = 'Moyenne';
  @tracked submitting = false;
  @tracked error = '';

  pointOptionValue = (v: StoryPoints | null): string =>
    v === null ? '' : String(v);

  get statusOptions(): { value: StoryStatus; label: string }[] {
    return STATUS_VALUES.map((value) => ({
      value,
      label: this.intl.t(`backlog.status.${value}`),
    }));
  }

  get pointOptions(): { value: StoryPoints | null; label: string }[] {
    return POINT_VALUES.map((value) => ({
      value,
      label:
        value === null
          ? this.intl.t('user-story-map.editUserStoryModal.pointsNone')
          : String(value),
    }));
  }

  get priorityOptions(): { value: StoryPriority; label: string }[] {
    return PRIORITY_VALUES.map((value) => ({
      value,
      label: this.intl.t(`backlog.priority.${value}`),
    }));
  }

  get canSubmit(): boolean {
    return this.title.trim().length > 0 && !this.submitting;
  }

  get cannotSubmit(): boolean {
    return !this.canSubmit;
  }

  isStatusSelected = (v: StoryStatus): boolean => this.status === v;
  isPointSelected = (v: StoryPoints | null): boolean => this.points === v;
  isPrioritySelected = (v: StoryPriority): boolean => this.priority === v;
  isEpicSelected = (id: string | null): boolean => this.epicId === id;

  @action onTitleInput(e: Event) {
    this.title = (e.target as HTMLInputElement).value;
  }

  @action onDescriptionInput(e: Event) {
    this.description = (e.target as HTMLTextAreaElement).value;
  }

  @action onStatusChange(e: Event) {
    this.status = (e.target as HTMLSelectElement).value as StoryStatus;
  }

  @action onEpicChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    this.epicId = v === '' ? null : v;
  }

  @action onPointsChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    if (v === '') {
      this.points = null;
      return;
    }
    const num = Number(v);
    if (!POINT_VALUES.includes(num as StoryPoints | null) || num === 0) return;
    this.points = num as StoryPoints;
  }

  @action onPriorityChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value as StoryPriority;
    if (PRIORITY_VALUES.includes(v)) {
      this.priority = v;
    }
  }

  @action async submit(e: Event) {
    e.preventDefault();
    if (!this.canSubmit) return;
    const projectId = this.currentProject.currentProjectId;
    if (!projectId) return;
    this.submitting = true;
    this.error = '';
    try {
      await this.userStories.create({
        title: this.title.trim(),
        description: this.description.trim(),
        projectId,
        epicId: this.epicId,
        status: this.status,
        // Omit points entirely when unset — backend treats it as nullable, but
        // sending `null` triggers Zod number().int().nullable() variance.
        ...(this.points !== null ? { points: this.points } : {}),
        priority: this.priority,
      });
      this.args.onClose();
    } catch (err: unknown) {
      this.error =
        err instanceof Error
          ? err.message
          : this.intl.t('backlog.modal.addUserStory.errorFallback');
    } finally {
      if (!this.isDestroying && !this.isDestroyed) {
        this.submitting = false;
      }
    }
  }

  <template>
    <dialog class="modal modal-open" data-test-add-user-story-modal>
      <div class="modal-box max-w-lg bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{t
              "backlog.modal.addUserStory.title"
            }}</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "backlog.modal.addUserStory.closeAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        <form {{on "submit" this.submit}} class="flex flex-col gap-4">
          <div>
            <label class="label text-sm font-medium" for="us-title">
              {{t "backlog.modal.addUserStory.name"}}
              *
            </label>
            <input
              id="us-title"
              type="text"
              class="input input-bordered w-full"
              placeholder={{t "backlog.modal.addUserStory.namePlaceholder"}}
              value={{this.title}}
              {{on "input" this.onTitleInput}}
              required
            />
          </div>

          <div>
            <label class="label text-sm font-medium" for="us-description">
              {{t "backlog.modal.addUserStory.description"}}
            </label>
            <textarea
              id="us-description"
              class="textarea textarea-bordered w-full h-24"
              placeholder={{t
                "backlog.modal.addUserStory.descriptionPlaceholder"
              }}
              {{on "input" this.onDescriptionInput}}
            >{{this.description}}</textarea>
          </div>

          <div>
            <label class="label text-sm font-medium" for="us-epic">
              {{t "backlog.modal.addUserStory.parentEpic"}}
            </label>
            <select
              id="us-epic"
              class="select select-bordered w-full"
              {{on "change" this.onEpicChange}}
            >
              <option value="" selected={{this.isEpicSelected null}}>
                {{t "backlog.modal.addUserStory.parentEpicPlaceholder"}}
              </option>
              {{#each this.epics.list as |epic|}}
                <option
                  value={{epic.id}}
                  selected={{this.isEpicSelected epic.id}}
                >
                  {{epic.title}}
                </option>
              {{/each}}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label text-sm font-medium" for="us-status">
                {{t "backlog.modal.addUserStory.status"}}
              </label>
              <select
                id="us-status"
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

            <div>
              <label class="label text-sm font-medium" for="us-points">
                {{t "backlog.modal.addUserStory.points"}}
              </label>
              <select
                id="us-points"
                class="select select-bordered w-full"
                {{on "change" this.onPointsChange}}
              >
                {{#each this.pointOptions as |opt|}}
                  <option
                    value={{this.pointOptionValue opt.value}}
                    selected={{this.isPointSelected opt.value}}
                  >{{opt.label}}</option>
                {{/each}}
              </select>
            </div>
          </div>

          <div>
            <label class="label text-sm font-medium" for="us-priority">
              {{t "backlog.modal.addUserStory.priority"}}
            </label>
            <select
              id="us-priority"
              class="select select-bordered w-full"
              {{on "change" this.onPriorityChange}}
            >
              {{#each this.priorityOptions as |opt|}}
                <option
                  value={{opt.value}}
                  selected={{this.isPrioritySelected opt.value}}
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
            >{{t "backlog.modal.addUserStory.cancel"}}</button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={{this.cannotSubmit}}
            >
              {{if
                this.submitting
                (t "backlog.modal.addUserStory.submitting")
                (t "backlog.modal.addUserStory.submit")
              }}
            </button>
          </div>
        </form>
      </div>
      <button
        type="button"
        class="modal-backdrop"
        aria-label={{t "backlog.modal.addUserStory.closeAria"}}
        {{on "click" @onClose}}
      ></button>
    </dialog>
  </template>
}
