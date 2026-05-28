import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t, type IntlService } from 'ember-intl';
import type Owner from '@ember/owner';
import type UserStoriesService from '../services/user-stories.ts';
import type { UpdateUserStoryPayload } from '../services/user-stories.ts';
import { InvalidStoryTransitionError } from '../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type {
  UserStory,
  StoryStatus,
  StoryPoints,
  StoryPriority,
} from '../schemas/user-stories.ts';

interface EditUserStoryModalSignature {
  Args: {
    userStory: UserStory;
    onClose: () => void;
  };
}

// All 6 iceScrum status values, displayed in workflow order. Invalid
// transitions are rejected server-side and surfaced via i18n message.
const STATUS_VALUES: StoryStatus[] = [
  'suggested',
  'accepted',
  'estimated',
  'planned',
  'in-progress',
  'done',
];
const POINT_VALUES: (StoryPoints | null)[] = [null, 1, 2, 3, 5, 8, 13, 21];
const PRIORITY_VALUES: StoryPriority[] = [
  'Basse',
  'Moyenne',
  'Haute',
  'Critique',
];

export default class EditUserStoryModal extends Component<EditUserStoryModalSignature> {
  @service declare userStories: UserStoriesService;
  @service declare currentProject: CurrentProjectService;
  @service declare intl: IntlService;

  @tracked title = '';
  @tracked description = '';
  @tracked status: StoryStatus = 'suggested';
  @tracked points: StoryPoints | null = null;
  @tracked priority: StoryPriority = 'Moyenne';
  @tracked submitting = false;
  @tracked error = '';

  constructor(owner: Owner, args: EditUserStoryModalSignature['Args']) {
    super(owner, args);
    this.title = args.userStory.title ?? '';
    this.description = args.userStory.description ?? '';
    this.status = args.userStory.status;
    this.points = args.userStory.points ?? null;
    this.priority = args.userStory.priority ?? 'Moyenne';
  }

  // Bound to <option value=> in the points select. Returns '' for the
  // "no points" entry and the stringified number otherwise. Using a method
  // avoids the falsy-zero trap of `{{if opt.value opt.value ""}}` if 0 is
  // ever added to StoryPoints.
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

  @action onTitleInput(e: Event) {
    this.title = (e.target as HTMLInputElement).value;
  }

  @action onDescriptionInput(e: Event) {
    this.description = (e.target as HTMLTextAreaElement).value;
  }

  @action onStatusChange(e: Event) {
    this.status = (e.target as HTMLSelectElement).value as StoryStatus;
  }

  @action onPointsChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    if (v === '') {
      this.points = null;
      return;
    }
    const num = Number(v);
    // Validate runtime: only accept values from POINT_VALUES (Fibonacci union)
    if (!POINT_VALUES.includes(num as StoryPoints | null) || num === 0) {
      return;
    }
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
    const usId = this.args.userStory.id;
    const projectId = this.currentProject.currentProjectId;
    if (!usId || !projectId) return;
    this.submitting = true;
    this.error = '';
    try {
      // Backend Zod schema accepts points as number().int().optional() (NOT
      // nullable). Omit the key when "no points" is selected instead of
      // sending `null` which would 400.
      const payload: UpdateUserStoryPayload = {
        title: this.title.trim(),
        description: this.description.trim(),
        status: this.status,
        priority: this.priority,
      };
      if (this.points !== null) {
        payload.points = this.points;
      }
      await this.userStories.update(usId, projectId, payload);
      this.args.onClose();
    } catch (err: unknown) {
      if (err instanceof InvalidStoryTransitionError) {
        this.error = this.intl.t(
          'user-story-map.editUserStoryModal.invalidTransition',
          {
            from: err.from ? this.intl.t(`backlog.status.${err.from}`) : '∅',
            to: err.to ? this.intl.t(`backlog.status.${err.to}`) : '∅',
          }
        );
      } else {
        this.error =
          err instanceof Error
            ? err.message
            : this.intl.t('user-story-map.editUserStoryModal.errorFallback');
      }
    } finally {
      if (!this.isDestroying && !this.isDestroyed) {
        this.submitting = false;
      }
    }
  }

  <template>
    <dialog class="modal modal-open" data-test-edit-user-story-modal>
      <div class="modal-box max-w-lg bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{t
              "user-story-map.editUserStoryModal.title"
            }}</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "user-story-map.editUserStoryModal.closeAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        <form {{on "submit" this.submit}} class="flex flex-col gap-4">
          <div>
            <label class="label text-sm font-medium" for="edit-us-title">
              {{t "user-story-map.editUserStoryModal.fields.title"}}
              *
            </label>
            <input
              id="edit-us-title"
              type="text"
              class="input input-bordered w-full"
              value={{this.title}}
              {{on "input" this.onTitleInput}}
              required
            />
          </div>

          <div>
            <label class="label text-sm font-medium" for="edit-us-description">
              {{t "user-story-map.editUserStoryModal.fields.description"}}
            </label>
            <textarea
              id="edit-us-description"
              class="textarea textarea-bordered w-full h-24"
              {{on "input" this.onDescriptionInput}}
            >{{this.description}}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label text-sm font-medium" for="edit-us-status">
                {{t "user-story-map.editUserStoryModal.fields.status"}}
              </label>
              <select
                id="edit-us-status"
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
              <label class="label text-sm font-medium" for="edit-us-points">
                {{t "user-story-map.editUserStoryModal.fields.points"}}
              </label>
              <select
                id="edit-us-points"
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
            <label class="label text-sm font-medium" for="edit-us-priority">
              {{t "user-story-map.editUserStoryModal.fields.priority"}}
            </label>
            <select
              id="edit-us-priority"
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
            <div
              class="alert alert-error text-sm"
              data-test-edit-us-error
            >{{this.error}}</div>
          {{/if}}

          <div class="modal-action mt-2">
            <button
              type="button"
              class="btn"
              disabled={{this.submitting}}
              {{on "click" @onClose}}
            >{{t "user-story-map.editUserStoryModal.actions.cancel"}}</button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={{this.cannotSubmit}}
            >
              {{if
                this.submitting
                (t "user-story-map.editUserStoryModal.actions.saving")
                (t "user-story-map.editUserStoryModal.actions.save")
              }}
            </button>
          </div>
        </form>
      </div>
      <button
        type="button"
        class="modal-backdrop"
        aria-label={{t "user-story-map.editUserStoryModal.closeAria"}}
        {{on "click" @onClose}}
      ></button>
    </dialog>
  </template>
}
