import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { t, type IntlService } from 'ember-intl';
import type { Store } from '@warp-drive/core';
import type TasksService from '../services/tasks.ts';
import type UserStoriesService from '../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type { TaskType, TaskNature, TaskPriority } from '../schemas/tasks.ts';
import type { TaskAssignee } from '../services/tasks.ts';

interface AddTaskModalSignature {
  Args: {
    onClose: () => void;
    preselectedUserStoryId?: string | null;
  };
}

const TYPE_VALUES: TaskType[] = [
  'Frontend',
  'Backend',
  'Database',
  'UX',
  'Analyse',
  'DevOps',
  'API',
  'Security',
  'Testing',
];
const NATURE_VALUES: TaskNature[] = [
  'Bug',
  'Feature',
  'Maintenance',
  'Hotfix',
  'Refacto',
  'Techdebt',
  'Spike',
  'Review',
  'Deployment',
  'Infra',
];
const PRIORITY_VALUES: TaskPriority[] = [
  'Basse',
  'Moyenne',
  'Haute',
  'Critique',
];
const POINT_VALUES = [1, 2, 3, 5, 8, 13, 21] as const;

interface UsersJsonApiResponse {
  data: Array<{
    id: string;
    attributes: { firstName: string; lastName: string; email: string };
  }>;
}

export default class AddTaskModal extends Component<AddTaskModalSignature> {
  @service declare tasks: TasksService;
  @service declare userStories: UserStoriesService;
  @service declare currentProject: CurrentProjectService;
  @service declare currentUser: CurrentUserService;
  @service declare intl: IntlService;
  @service declare store: Store;

  @tracked title = '';
  @tracked description = '';
  @tracked type: TaskType = 'Frontend';
  @tracked nature: TaskNature = 'Feature';
  @tracked priority: TaskPriority = 'Moyenne';
  @tracked points = 3;
  @tracked estimatedHours = 0;
  @tracked userStoryId: string | null =
    this.args.preselectedUserStoryId ?? null;
  @tracked assigneeIds: string[] = [];
  @tracked availableUsers: TaskAssignee[] = [];
  @tracked submitting = false;
  @tracked error = '';

  constructor(owner: unknown, args: AddTaskModalSignature['Args']) {
    super(owner as never, args);
    void this.loadUsers();
  }

  private async loadUsers() {
    try {
      const { content } = await this.store.request<UsersJsonApiResponse>({
        url: '/api/v1/users',
        method: 'GET',
      });
      this.availableUsers = content.data.map((u) => ({
        id: u.id,
        email: u.attributes.email,
        firstName: u.attributes.firstName,
        lastName: u.attributes.lastName,
      }));
    } catch {
      this.availableUsers = [];
    }
  }

  get canSubmit(): boolean {
    return (
      this.title.trim().length > 0 &&
      this.estimatedHours >= 0 &&
      !this.submitting
    );
  }

  get cannotSubmit(): boolean {
    return !this.canSubmit;
  }

  get typeOptions(): { value: TaskType; label: string }[] {
    return TYPE_VALUES.map((value) => ({
      value,
      label: this.intl.t(`backlog.filters.type.${value}`),
    }));
  }

  get natureOptions(): { value: TaskNature; label: string }[] {
    return NATURE_VALUES.map((value) => ({
      value,
      label: this.intl.t(`backlog.filters.nature.${value}`),
    }));
  }

  get priorityOptions(): { value: TaskPriority; label: string }[] {
    return PRIORITY_VALUES.map((value) => ({
      value,
      label: this.intl.t(`tasks.priority.${value}`),
    }));
  }

  isTypeSelected = (v: TaskType): boolean => this.type === v;
  isNatureSelected = (v: TaskNature): boolean => this.nature === v;
  isPrioritySelected = (v: TaskPriority): boolean => this.priority === v;
  isPointSelected = (v: number): boolean => this.points === v;
  isUSSelected = (id: string | null): boolean => this.userStoryId === id;
  isAssigneeSelected = (id: string): boolean => this.assigneeIds.includes(id);

  @action onTitleInput(e: Event) {
    this.title = (e.target as HTMLInputElement).value;
  }

  @action onDescriptionInput(e: Event) {
    this.description = (e.target as HTMLTextAreaElement).value;
  }

  @action onTypeChange(e: Event) {
    this.type = (e.target as HTMLSelectElement).value as TaskType;
  }

  @action onNatureChange(e: Event) {
    this.nature = (e.target as HTMLSelectElement).value as TaskNature;
  }

  @action onPriorityChange(e: Event) {
    this.priority = (e.target as HTMLSelectElement).value as TaskPriority;
  }

  @action onPointsChange(e: Event) {
    this.points = Number((e.target as HTMLSelectElement).value);
  }

  @action onEstimatedHoursInput(e: Event) {
    this.estimatedHours = Number((e.target as HTMLInputElement).value);
  }

  @action onUSChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    this.userStoryId = v === '' ? null : v;
  }

  @action onAssigneeToggle(userId: string, e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.assigneeIds.includes(userId)) {
        this.assigneeIds = [...this.assigneeIds, userId];
      }
    } else {
      this.assigneeIds = this.assigneeIds.filter((id) => id !== userId);
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
      await this.tasks.create({
        title: this.title.trim(),
        description: this.description.trim(),
        status: 'todo',
        type: this.type,
        nature: this.nature,
        priority: this.priority,
        points: this.points,
        estimatedHours: this.estimatedHours || null,
        projectId,
        userStoryId: this.userStoryId,
        createdById: this.currentUser.user?.id ?? '',
      });
      // Note: gestion assigneeIds via POST /tasks/:id/assignees est P12 (édition globale)
      this.args.onClose();
    } catch (err: unknown) {
      this.error =
        err instanceof Error
          ? err.message
          : this.intl.t('backlog.modal.addTask.errorFallback');
    } finally {
      this.submitting = false;
    }
  }

  <template>
    <dialog class="modal modal-open" data-test-add-task-modal>
      <div class="modal-box max-w-2xl bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{t "backlog.modal.addTask.title"}}</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "backlog.modal.addTask.closeAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        <form {{on "submit" this.submit}} class="flex flex-col gap-4">
          <div>
            <label class="label text-sm font-medium" for="task-title">
              {{t "backlog.modal.addTask.name"}}
              *
            </label>
            <input
              id="task-title"
              type="text"
              class="input input-bordered w-full"
              placeholder={{t "backlog.modal.addTask.namePlaceholder"}}
              value={{this.title}}
              {{on "input" this.onTitleInput}}
              required
            />
          </div>

          <div>
            <label class="label text-sm font-medium" for="task-description">
              {{t "backlog.modal.addTask.description"}}
            </label>
            <textarea
              id="task-description"
              class="textarea textarea-bordered w-full h-24"
              placeholder={{t "backlog.modal.addTask.descriptionPlaceholder"}}
              {{on "input" this.onDescriptionInput}}
            >{{this.description}}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label text-sm font-medium" for="task-type">
                {{t "backlog.modal.addTask.type"}}
              </label>
              <select
                id="task-type"
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

            <div>
              <label class="label text-sm font-medium" for="task-nature">
                {{t "backlog.modal.addTask.nature"}}
              </label>
              <select
                id="task-nature"
                class="select select-bordered w-full"
                {{on "change" this.onNatureChange}}
              >
                {{#each this.natureOptions as |opt|}}
                  <option
                    value={{opt.value}}
                    selected={{this.isNatureSelected opt.value}}
                  >{{opt.label}}</option>
                {{/each}}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label text-sm font-medium" for="task-priority">
                {{t "backlog.modal.addTask.priority"}}
              </label>
              <select
                id="task-priority"
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

            <div>
              <label class="label text-sm font-medium" for="task-points">
                {{t "backlog.modal.addTask.points"}}
              </label>
              <select
                id="task-points"
                class="select select-bordered w-full"
                {{on "change" this.onPointsChange}}
              >
                {{#each POINT_VALUES as |pts|}}
                  <option value={{pts}} selected={{this.isPointSelected pts}}>
                    {{pts}}
                  </option>
                {{/each}}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label text-sm font-medium" for="task-hours">
                {{t "backlog.modal.addTask.estimatedHours"}}
              </label>
              <input
                id="task-hours"
                type="number"
                class="input input-bordered w-full"
                min="0"
                value={{this.estimatedHours}}
                {{on "input" this.onEstimatedHoursInput}}
              />
            </div>

            <div>
              <label class="label text-sm font-medium" for="task-us">
                {{t "backlog.modal.addTask.userStory"}}
              </label>
              <select
                id="task-us"
                class="select select-bordered w-full"
                {{on "change" this.onUSChange}}
              >
                <option value="" selected={{this.isUSSelected null}}>
                  {{t "backlog.modal.addTask.userStoryPlaceholder"}}
                </option>
                {{#each this.userStories.list as |us|}}
                  <option value={{us.id}} selected={{this.isUSSelected us.id}}>
                    {{us.title}}
                  </option>
                {{/each}}
              </select>
            </div>
          </div>

          <div>
            <label class="label text-sm font-medium">
              {{t "backlog.modal.addTask.assignees"}}
            </label>
            <div class="grid grid-cols-2 gap-2">
              {{#each this.availableUsers as |user|}}
                <label class="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked={{this.isAssigneeSelected user.id}}
                    {{on "change" (fn this.onAssigneeToggle user.id)}}
                  />
                  <span class="label-text">{{user.firstName}}
                    {{user.lastName}}</span>
                </label>
              {{/each}}
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
            >{{t "backlog.modal.addTask.cancel"}}</button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={{this.cannotSubmit}}
            >
              {{if
                this.submitting
                (t "backlog.modal.addTask.submitting")
                (t "backlog.modal.addTask.submit")
              }}
            </button>
          </div>
        </form>
      </div>
      <button
        type="button"
        class="modal-backdrop"
        aria-label={{t "backlog.modal.addTask.closeAria"}}
        {{on "click" @onClose}}
      ></button>
    </dialog>
  </template>
}
