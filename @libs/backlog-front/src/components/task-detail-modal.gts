import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { t, type IntlService } from 'ember-intl';
import CommentThread from '@libs/shared-front/components/comment-thread';
import AttachmentList from '@libs/shared-front/components/attachment-list';
import TaskNatureBadge from './task-nature-badge.gts';
import TaskTypeBadge from './task-type-badge.gts';
import TaskStatusBadge from './task-status-badge.gts';
import TaskPriorityBadge from './task-priority-badge.gts';
import AcceptanceTestList from './acceptance-test-list.gts';
import AssigneeAvatarStack from './assignee-avatar-stack.gts';
import type { MemberLite } from './assignee-avatar-stack.gts';
import type TasksService from '../services/tasks.ts';
import type UserStoriesService from '../services/user-stories.ts';
import type RouterService from '@ember/routing/router-service';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type { TaskHistoryEvent, TaskAssignee } from '../services/tasks.ts';
import type { Task, TaskStatus, TaskPriority } from '../schemas/tasks.ts';
import type { UserStory } from '../schemas/user-stories.ts';

type TaskDetailTab = 'details' | 'comments' | 'history';

const STATUS_VALUES: TaskStatus[] = [
  'todo',
  'in-progress',
  'testing',
  'uat',
  'done',
];
const PRIORITY_VALUES: TaskPriority[] = [
  'Basse',
  'Moyenne',
  'Haute',
  'Critique',
];
const POINT_VALUES = [1, 2, 3, 5, 8, 13, 21] as const;

interface TaskDetailModalSignature {
  Args: {
    task: Task;
    userStory?: UserStory | null;
    onClose: () => void;
  };
}

export default class TaskDetailModal extends Component<TaskDetailModalSignature> {
  @service declare tasks: TasksService;
  @service declare userStories: UserStoriesService;
  @service declare router: RouterService;
  @service declare intl: IntlService;
  @service('current-user') declare currentUser: CurrentUserService;

  @tracked activeTab: TaskDetailTab = 'details';
  @tracked history: TaskHistoryEvent[] = [];
  @tracked assignees: TaskAssignee[] = [];
  @tracked projectMembers: MemberLite[] = [];

  // --- état édition ---
  @tracked isEditing = false;
  @tracked dirty = false;
  @tracked submitting = false;
  @tracked error = '';

  @tracked title = '';
  @tracked status: TaskStatus = 'todo';
  @tracked priority: TaskPriority = 'Moyenne';
  @tracked description = '';
  @tracked points = 0;
  @tracked userStoryId: string | null = null;
  @tracked assigneeIds: string[] = [];
  @tracked assigneeSearch = '';
  @tracked assigneeDropdownOpen = false;
  private initialAssigneeIds: string[] = [];

  constructor(owner: unknown, args: TaskDetailModalSignature['Args']) {
    super(owner as never, args);
    this.resetFieldsFromTask();
    void this.loadAll();
  }

  // Initialise/réinitialise les champs éditables depuis la task d'origine.
  private resetFieldsFromTask() {
    this.title = this.args.task.title;
    this.status = this.args.task.status;
    this.priority = this.args.task.priority;
    this.description = this.args.task.description;
    this.points = this.args.task.points;
    this.userStoryId = this.args.task.userStoryId;
  }

  private async loadAll() {
    const taskId = this.args.task.id;
    if (!taskId) return;
    try {
      const [history, assignees] = await Promise.all([
        this.tasks.loadHistory(taskId),
        this.tasks.loadAssignees(taskId),
        this.tasks.loadProjectMembers(this.args.task.projectId).then((m) => {
          this.projectMembers = m;
        }),
        this.userStories
          .loadByProject(this.args.task.projectId)
          .catch(() => []),
      ]);
      this.history = history;
      this.assignees = assignees;
      this.syncAssigneeIdsFromAssignees();
    } catch {
      this.history = [];
      this.assignees = [];
    }
  }

  private syncAssigneeIdsFromAssignees() {
    const ids = this.assignees.map((a) => a.userId);
    this.assigneeIds = ids;
    this.initialAssigneeIds = ids.slice();
  }

  get isDetailsTab(): boolean {
    return this.activeTab === 'details';
  }
  get isCommentsTab(): boolean {
    return this.activeTab === 'comments';
  }
  get isHistoryTab(): boolean {
    return this.activeTab === 'history';
  }

  get numberLabel(): string {
    return `#${this.args.task.number}`;
  }

  get currentUserId(): string | null {
    return this.currentUser.user?.id ?? null;
  }

  get createdAtFormatted(): string {
    const d = new Date(this.args.task.createdAt);
    return d.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Membres résolus correspondant aux assignés (pour la pile d'avatars).
  get assignedMembers(): MemberLite[] {
    return this.projectMembers.filter((m) => this.assigneeIds.includes(m.id));
  }

  get hasAssignees(): boolean {
    return this.assignedMembers.length > 0;
  }

  // Membres filtrés par la recherche du dropdown d'assignation.
  get filteredMembers(): MemberLite[] {
    const q = this.assigneeSearch.trim().toLowerCase();
    if (!q) return this.projectMembers;
    return this.projectMembers.filter((m) =>
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
    );
  }

  get assigneeSummaryLabel(): string {
    const n = this.assigneeIds.length;
    return n === 0
      ? this.intl.t('backlog.modal.taskDetail.meta.assignPlaceholder')
      : this.intl.t('backlog.modal.taskDetail.meta.assigneeCount', {
          count: n,
        });
  }

  get canSave(): boolean {
    return !this.submitting && this.title.trim().length > 0;
  }
  get cannotSave(): boolean {
    return !this.canSave;
  }

  get statusOptions(): { value: TaskStatus; label: string }[] {
    return STATUS_VALUES.map((value) => ({
      value,
      label: this.intl.t(`tasks.status.${value}`),
    }));
  }
  get priorityOptions(): { value: TaskPriority; label: string }[] {
    return PRIORITY_VALUES.map((value) => ({
      value,
      label: this.intl.t(`tasks.priority.${value}`),
    }));
  }
  get pointValues(): readonly number[] {
    return POINT_VALUES;
  }

  isStatusSelected = (v: TaskStatus): boolean => this.status === v;
  isPrioritySelected = (v: TaskPriority): boolean => this.priority === v;
  isPointSelected = (v: number): boolean => this.points === v;
  isUSSelected = (id: string | null): boolean => this.userStoryId === id;
  isAssigneeSelected = (id: string): boolean => this.assigneeIds.includes(id);

  @action showDetails() {
    this.activeTab = 'details';
  }
  @action showComments() {
    this.activeTab = 'comments';
  }
  @action showHistory() {
    this.activeTab = 'history';
  }

  @action enterEdit() {
    this.isEditing = true;
    this.dirty = false;
    this.error = '';
  }

  @action cancelEdit() {
    this.resetFieldsFromTask();
    this.assigneeIds = this.initialAssigneeIds.slice();
    this.isEditing = false;
    this.dirty = false;
    this.error = '';
  }

  @action onTitleInput(e: Event) {
    this.title = (e.target as HTMLInputElement).value;
    this.dirty = true;
  }
  @action onStatusChange(e: Event) {
    this.status = (e.target as HTMLSelectElement).value as TaskStatus;
    this.dirty = true;
  }
  @action onPriorityChange(e: Event) {
    this.priority = (e.target as HTMLSelectElement).value as TaskPriority;
    this.dirty = true;
  }
  @action onDescriptionInput(e: Event) {
    this.description = (e.target as HTMLTextAreaElement).value;
    this.dirty = true;
  }
  @action onPointsChange(e: Event) {
    this.points = Number((e.target as HTMLSelectElement).value);
    this.dirty = true;
  }
  @action onUSChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    this.userStoryId = v === '' ? null : v;
    this.dirty = true;
  }
  @action toggleAssigneeDropdown() {
    this.assigneeDropdownOpen = !this.assigneeDropdownOpen;
  }
  @action onAssigneeSearch(e: Event) {
    this.assigneeSearch = (e.target as HTMLInputElement).value;
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
    this.dirty = true;
  }

  @action async save(e: Event) {
    e.preventDefault();
    const taskId = this.args.task.id;
    if (!this.canSave || !taskId) return;
    this.submitting = true;
    this.error = '';
    try {
      await this.tasks.update(taskId, {
        title: this.title.trim(),
        status: this.status,
        priority: this.priority,
        description: this.description.trim(),
        points: this.points,
        userStoryId: this.userStoryId,
      });
      await this.tasks.syncAssignees(
        taskId,
        this.assigneeIds,
        this.initialAssigneeIds
      );
      // recharge les assignés affichés
      this.assignees = await this.tasks.loadAssignees(taskId);
      this.syncAssigneeIdsFromAssignees();
      this.dirty = false;
      this.isEditing = false;
    } catch (err) {
      this.error =
        err instanceof Error
          ? err.message
          : this.intl.t('backlog.modal.taskDetail.errorFallback');
    } finally {
      if (!this.isDestroying && !this.isDestroyed) {
        this.submitting = false;
      }
    }
  }

  @action logTime() {
    void this.router.transitionTo('dashboard.time-tracking');
    this.args.onClose();
  }

  <template>
    <dialog class="modal modal-open" data-test-task-detail-modal>
      <div class="modal-box max-w-4xl bg-base-200">
        {{! Header }}
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2">
              <span
                class="font-mono text-sm opacity-50"
              >{{this.numberLabel}}</span>
              <TaskNatureBadge @nature={{@task.nature}} />
              <TaskTypeBadge @type={{@task.type}} />
              <TaskStatusBadge @status={{@task.status}} />
              <TaskPriorityBadge @priority={{@task.priority}} />
              {{#if this.isEditing}}
                <span
                  class="badge badge-sm badge-warning"
                  data-test-edit-mode-badge
                >{{t "backlog.modal.taskDetail.editMode"}}</span>
              {{/if}}
            </div>
            {{#if this.isEditing}}
              <input
                type="text"
                class="input input-bordered w-full text-xl font-bold"
                value={{this.title}}
                aria-label={{t "backlog.modal.taskDetail.titleLabel"}}
                {{on "input" this.onTitleInput}}
                data-test-task-title-input
              />
            {{else}}
              <h2 class="text-xl font-bold truncate">{{@task.title}}</h2>
            {{/if}}
            <p class="text-xs opacity-60 mt-1">
              {{t
                "backlog.modal.taskDetail.metaCreated"
                author=@task.createdById
                date=this.createdAtFormatted
              }}
            </p>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "backlog.modal.taskDetail.closeAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        {{! Tabs }}
        <div role="tablist" class="tabs tabs-bordered mb-4">
          <button
            type="button"
            role="tab"
            class="tab {{if this.isDetailsTab 'tab-active'}}"
            {{on "click" this.showDetails}}
            data-test-tab="details"
          >{{t "backlog.modal.taskDetail.tabs.details"}}</button>
          <button
            type="button"
            role="tab"
            class="tab {{if this.isCommentsTab 'tab-active'}}"
            {{on "click" this.showComments}}
            data-test-tab="comments"
          >{{t "backlog.modal.taskDetail.tabs.comments"}}</button>
          <button
            type="button"
            role="tab"
            class="tab {{if this.isHistoryTab 'tab-active'}}"
            {{on "click" this.showHistory}}
            data-test-tab="history"
          >{{t "backlog.modal.taskDetail.tabs.history"}}</button>
        </div>

        {{! Tab content }}
        {{#if this.isDetailsTab}}
          <div class="grid grid-cols-3 gap-6" data-test-tab-content="details">
            {{! Left column (2/3) }}
            <div class="col-span-2 space-y-4">
              {{#if this.isEditing}}
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      class="opacity-50 text-xs uppercase"
                      for="task-edit-status"
                    >{{t "backlog.modal.taskDetail.meta.status"}}</label>
                    <select
                      id="task-edit-status"
                      class="select select-bordered select-sm w-full"
                      {{on "change" this.onStatusChange}}
                      data-test-task-status-select
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
                    <label
                      class="opacity-50 text-xs uppercase"
                      for="task-edit-priority"
                    >{{t "backlog.modal.taskDetail.meta.priority"}}</label>
                    <select
                      id="task-edit-priority"
                      class="select select-bordered select-sm w-full"
                      {{on "change" this.onPriorityChange}}
                      data-test-task-priority-select
                    >
                      {{#each this.priorityOptions as |opt|}}
                        <option
                          value={{opt.value}}
                          selected={{this.isPrioritySelected opt.value}}
                        >{{opt.label}}</option>
                      {{/each}}
                    </select>
                  </div>
                </div>
              {{/if}}

              <div>
                <h3 class="font-semibold mb-1">{{t
                    "backlog.modal.taskDetail.descriptionTitle"
                  }}</h3>
                {{#if this.isEditing}}
                  <textarea
                    class="textarea textarea-bordered w-full h-28"
                    aria-label={{t "backlog.modal.taskDetail.descriptionTitle"}}
                    {{on "input" this.onDescriptionInput}}
                    data-test-task-description-input
                  >{{this.description}}</textarea>
                {{else}}
                  <p
                    class="text-sm opacity-80 whitespace-pre-wrap"
                  >{{@task.description}}</p>
                {{/if}}
              </div>

              <div data-test-acceptance-criteria-section>
                <h3 class="font-semibold mb-1">{{t
                    "backlog.modal.taskDetail.acceptanceCriteriaTitle"
                  }}</h3>
                {{#if @task.id}}
                  <AcceptanceTestList @ownerType="task" @ownerId={{@task.id}} />
                {{/if}}
              </div>

              <div data-test-attachments-section>
                <h3 class="font-semibold mb-1">{{t
                    "backlog.modal.taskDetail.attachmentsTitle"
                  }}</h3>
                {{#if @task.id}}
                  <AttachmentList @ownerType="task" @ownerId={{@task.id}} />
                {{/if}}
              </div>
            </div>

            {{! Right column (1/3) - meta panel }}
            <div class="col-span-1 space-y-3 text-sm">
              <div>
                <div class="opacity-50 text-xs uppercase">{{t
                    "backlog.modal.taskDetail.meta.assignee"
                  }}</div>
                {{#if this.hasAssignees}}
                  <AssigneeAvatarStack
                    @members={{this.assignedMembers}}
                    @moreLabel={{t "backlog.modal.taskDetail.meta.assignee"}}
                  />
                {{else}}
                  {{#unless this.isEditing}}
                    <div class="italic opacity-60">{{t
                        "backlog.modal.taskDetail.meta.noAssignee"
                      }}</div>
                  {{/unless}}
                {{/if}}
                {{#if this.isEditing}}
                  <div class="relative mt-2 w-full" data-test-assignee-dropdown>
                    <button
                      type="button"
                      class="btn btn-sm btn-block justify-between font-normal"
                      aria-haspopup="listbox"
                      aria-expanded={{if
                        this.assigneeDropdownOpen
                        "true"
                        "false"
                      }}
                      {{on "click" this.toggleAssigneeDropdown}}
                      data-test-assignee-toggle
                    >
                      <span>{{this.assigneeSummaryLabel}}</span>
                      <span class="opacity-50">▾</span>
                    </button>
                    {{#if this.assigneeDropdownOpen}}
                      <div
                        class="absolute z-10 mt-1 w-full space-y-1 rounded-box bg-base-100 p-2 shadow max-h-60 overflow-y-auto"
                        data-test-assignee-select
                      >
                        <input
                          type="text"
                          class="input input-sm input-bordered mb-1 w-full"
                          placeholder={{t
                            "backlog.modal.taskDetail.meta.assigneeSearch"
                          }}
                          aria-label={{t
                            "backlog.modal.taskDetail.meta.assigneeSearch"
                          }}
                          value={{this.assigneeSearch}}
                          {{on "input" this.onAssigneeSearch}}
                          data-test-assignee-search
                        />
                        {{#each this.filteredMembers as |member|}}
                          <label
                            class="label cursor-pointer justify-start gap-2 py-1"
                          >
                            <input
                              type="checkbox"
                              class="checkbox checkbox-sm"
                              checked={{this.isAssigneeSelected member.id}}
                              {{on
                                "change"
                                (fn this.onAssigneeToggle member.id)
                              }}
                              data-test-assignee-checkbox={{member.id}}
                            />
                            <span class="label-text">{{member.firstName}}
                              {{member.lastName}}</span>
                          </label>
                        {{else}}
                          <p class="px-1 text-xs italic opacity-60">{{t
                              "backlog.modal.taskDetail.meta.noMembers"
                            }}</p>
                        {{/each}}
                      </div>
                    {{/if}}
                  </div>
                {{/if}}
              </div>

              <div>
                <div class="opacity-50 text-xs uppercase">{{t
                    "backlog.modal.taskDetail.meta.project"
                  }}</div>
                {{! Projet : toujours en lecture seule }}
                <div data-test-task-project>{{@task.projectId}}</div>
              </div>

              {{#if @task.sprintId}}
                <div>
                  <div class="opacity-50 text-xs uppercase">{{t
                      "backlog.modal.taskDetail.meta.sprint"
                    }}</div>
                  <div>{{@task.sprintId}}</div>
                </div>
              {{/if}}

              <div>
                <div class="opacity-50 text-xs uppercase">{{t
                    "backlog.modal.taskDetail.meta.userStory"
                  }}</div>
                {{#if this.isEditing}}
                  <select
                    class="select select-bordered select-sm w-full"
                    aria-label={{t "backlog.modal.taskDetail.meta.userStory"}}
                    {{on "change" this.onUSChange}}
                    data-test-task-userstory-select
                  >
                    <option value="" selected={{this.isUSSelected null}}>
                      {{t "backlog.modal.taskDetail.meta.noUserStory"}}
                    </option>
                    {{#each this.userStories.list as |us|}}
                      <option
                        value={{us.id}}
                        selected={{this.isUSSelected us.id}}
                      >
                        {{us.title}}
                      </option>
                    {{/each}}
                  </select>
                {{else if @userStory}}
                  <div>{{@userStory.title}}</div>
                {{else}}
                  <div class="italic opacity-60">{{t
                      "backlog.modal.taskDetail.meta.noUserStory"
                    }}</div>
                {{/if}}
              </div>

              <div>
                <div class="opacity-50 text-xs uppercase">{{t
                    "backlog.modal.taskDetail.meta.points"
                  }}</div>
                {{#if this.isEditing}}
                  <select
                    class="select select-bordered select-sm w-full"
                    aria-label={{t "backlog.modal.taskDetail.meta.points"}}
                    {{on "change" this.onPointsChange}}
                    data-test-task-points-select
                  >
                    {{#each this.pointValues as |pts|}}
                      <option
                        value={{pts}}
                        selected={{this.isPointSelected pts}}
                      >
                        {{pts}}
                      </option>
                    {{/each}}
                  </select>
                {{else}}
                  <div>{{@task.points}} pts</div>
                {{/if}}
              </div>

              {{#if @task.estimatedHours}}
                <div>
                  <div class="opacity-50 text-xs uppercase">{{t
                      "backlog.modal.taskDetail.meta.time"
                    }}</div>
                  <div>{{@task.estimatedHours}}h</div>
                </div>
              {{/if}}
            </div>
          </div>
        {{/if}}

        {{#if this.isCommentsTab}}
          <div data-test-tab-content="comments">
            {{#if @task.id}}
              <CommentThread
                @ownerType="task"
                @ownerId={{@task.id}}
                @currentUserId={{this.currentUserId}}
                @projectId={{@task.projectId}}
              />
            {{/if}}
          </div>
        {{/if}}

        {{#if this.isHistoryTab}}
          <div class="space-y-2" data-test-tab-content="history">
            {{#each this.history as |event|}}
              <div class="text-sm border-l-2 border-base-300 pl-3 py-1">
                <span class="opacity-60">{{event.createdAt}}</span>
                —
                <span class="font-medium">{{event.field}}</span>:
                <span class="opacity-70">{{event.oldValue}}</span>
                →
                <span>{{event.newValue}}</span>
              </div>
            {{else}}
              <p class="italic opacity-60 text-sm">{{t
                  "backlog.modal.taskDetail.historyEmpty"
                }}</p>
            {{/each}}
          </div>
        {{/if}}

        {{! Footer }}
        <div
          class="modal-action mt-6 border-t border-base-300 pt-4 items-center"
        >
          {{#if this.isEditing}}
            {{#if this.dirty}}
              <span
                class="text-xs text-warning mr-auto flex items-center gap-1"
                data-test-dirty-indicator
              >● {{t "backlog.modal.taskDetail.unsavedChanges"}}</span>
            {{/if}}
            {{#if this.error}}
              <span class="text-xs text-error mr-2" data-test-task-edit-error>
                {{this.error}}
              </span>
            {{/if}}
            <button
              type="button"
              class="btn btn-sm"
              disabled={{this.submitting}}
              {{on "click" this.cancelEdit}}
              data-test-task-cancel
            >{{t "backlog.modal.taskDetail.cancel"}}</button>
            <button
              type="button"
              class="btn btn-sm btn-primary"
              disabled={{this.cannotSave}}
              {{on "click" this.save}}
              data-test-task-save
            >
              {{if
                this.submitting
                (t "backlog.modal.taskDetail.saving")
                (t "backlog.modal.taskDetail.save")
              }}
            </button>
          {{else}}
            <button
              type="button"
              class="btn btn-sm"
              {{on "click" this.enterEdit}}
              data-test-task-edit
            >
              {{t "backlog.modal.taskDetail.edit"}}
            </button>
            <button
              type="button"
              class="btn btn-sm"
              {{on "click" this.logTime}}
            >
              {{t "backlog.modal.taskDetail.logTime"}}
            </button>
            <button
              type="button"
              class="btn btn-sm btn-primary"
              {{on "click" @onClose}}
            >
              {{t "backlog.modal.taskDetail.close"}}
            </button>
          {{/if}}
        </div>
      </div>
      <button
        type="button"
        class="modal-backdrop"
        aria-label={{t "backlog.modal.taskDetail.closeAria"}}
        {{on "click" @onClose}}
      ></button>
    </dialog>
  </template>
}
