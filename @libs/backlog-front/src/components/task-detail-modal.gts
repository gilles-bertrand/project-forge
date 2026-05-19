import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import TaskNatureBadge from './task-nature-badge.gts';
import TaskTypeBadge from './task-type-badge.gts';
import TaskStatusBadge from './task-status-badge.gts';
import TaskPriorityBadge from './task-priority-badge.gts';
import type TasksService from '../services/tasks.ts';
import type RouterService from '@ember/routing/router-service';
import type {
  TaskComment,
  TaskHistoryEvent,
  TaskAssignee,
} from '../services/tasks.ts';
import type { Task } from '../schemas/tasks.ts';
import type { UserStory } from '../schemas/user-stories.ts';

type TaskDetailTab = 'details' | 'comments' | 'history';

interface TaskDetailModalSignature {
  Args: {
    task: Task;
    userStory?: UserStory | null;
    onClose: () => void;
  };
}

export default class TaskDetailModal extends Component<TaskDetailModalSignature> {
  @service declare tasks: TasksService;
  @service declare router: RouterService;

  @tracked activeTab: TaskDetailTab = 'details';
  @tracked comments: TaskComment[] = [];
  @tracked history: TaskHistoryEvent[] = [];
  @tracked assignees: TaskAssignee[] = [];
  @tracked loadingTab = false;

  constructor(owner: unknown, args: TaskDetailModalSignature['Args']) {
    super(owner as never, args);
    void this.loadAll();
  }

  private async loadAll() {
    const taskId = this.args.task.id;
    if (!taskId) return;
    try {
      const [comments, history, assignees] = await Promise.all([
        this.tasks.loadComments(taskId),
        this.tasks.loadHistory(taskId),
        this.tasks.loadAssignees(taskId),
      ]);
      this.comments = comments;
      this.history = history;
      this.assignees = assignees;
    } catch {
      this.comments = [];
      this.history = [];
      this.assignees = [];
    }
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

  get firstAssignee(): TaskAssignee | null {
    return this.assignees[0] ?? null;
  }

  @action showDetails() {
    this.activeTab = 'details';
  }
  @action showComments() {
    this.activeTab = 'comments';
  }
  @action showHistory() {
    this.activeTab = 'history';
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
            </div>
            <h2 class="text-xl font-bold truncate">{{@task.title}}</h2>
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
              <div>
                <h3 class="font-semibold mb-1">{{t
                    "backlog.modal.taskDetail.descriptionTitle"
                  }}</h3>
                <p
                  class="text-sm opacity-80 whitespace-pre-wrap"
                >{{@task.description}}</p>
              </div>
              <div>
                <h3 class="font-semibold mb-1">{{t
                    "backlog.modal.taskDetail.acceptanceCriteriaTitle"
                  }}</h3>
                <p class="text-sm opacity-60 italic">
                  {{t "backlog.modal.taskDetail.acceptanceCriteriaPlaceholder"}}
                </p>
              </div>
              <div>
                <h3 class="font-semibold mb-1">{{t
                    "backlog.modal.taskDetail.attachmentsTitle"
                  }}</h3>
                <p class="text-sm opacity-60 italic">
                  {{t "backlog.modal.taskDetail.attachmentsPlaceholder"}}
                </p>
                <button
                  type="button"
                  class="btn btn-sm btn-outline mt-2"
                  disabled
                >
                  {{t "backlog.modal.taskDetail.uploadDisabled"}}
                </button>
              </div>
            </div>
            {{! Right column (1/3) - meta panel }}
            <div class="col-span-1 space-y-3 text-sm">
              <div>
                <div class="opacity-50 text-xs uppercase">{{t
                    "backlog.modal.taskDetail.meta.assignee"
                  }}</div>
                {{#if this.firstAssignee}}
                  <div class="font-medium">{{this.firstAssignee.firstName}}
                    {{this.firstAssignee.lastName}}</div>
                  <div
                    class="text-xs opacity-60"
                  >{{this.firstAssignee.email}}</div>
                {{else}}
                  <div class="italic opacity-60">{{t
                      "backlog.modal.taskDetail.meta.noAssignee"
                    }}</div>
                {{/if}}
              </div>
              <div>
                <div class="opacity-50 text-xs uppercase">{{t
                    "backlog.modal.taskDetail.meta.project"
                  }}</div>
                <div>{{@task.projectId}}</div>
              </div>
              {{#if @task.sprintId}}
                <div>
                  <div class="opacity-50 text-xs uppercase">{{t
                      "backlog.modal.taskDetail.meta.sprint"
                    }}</div>
                  <div>{{@task.sprintId}}</div>
                </div>
              {{/if}}
              {{#if @userStory}}
                <div>
                  <div class="opacity-50 text-xs uppercase">{{t
                      "backlog.modal.taskDetail.meta.userStory"
                    }}</div>
                  <div>{{@userStory.title}}</div>
                </div>
              {{/if}}
              <div>
                <div class="opacity-50 text-xs uppercase">{{t
                    "backlog.modal.taskDetail.meta.points"
                  }}</div>
                <div>{{@task.points}} pts</div>
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
          <div class="space-y-3" data-test-tab-content="comments">
            {{#each this.comments as |comment|}}
              <div class="bg-base-100 rounded p-3">
                <div class="flex items-center gap-2 mb-1 text-xs opacity-70">
                  <span class="font-medium">{{comment.authorId}}</span>
                  <span>•</span>
                  <span>{{comment.createdAt}}</span>
                </div>
                <p class="text-sm whitespace-pre-wrap">{{comment.content}}</p>
              </div>
            {{else}}
              <p class="italic opacity-60 text-sm">{{t
                  "backlog.modal.taskDetail.commentsEmpty"
                }}</p>
            {{/each}}
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
        <div class="modal-action mt-6 border-t border-base-300 pt-4">
          <button
            type="button"
            class="btn btn-sm"
            disabled
            title={{t "backlog.modal.taskDetail.editDisabled"}}
          >
            {{t "backlog.modal.taskDetail.edit"}}
          </button>
          <button type="button" class="btn btn-sm" {{on "click" this.logTime}}>
            {{t "backlog.modal.taskDetail.logTime"}}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-primary"
            {{on "click" @onClose}}
          >
            {{t "backlog.modal.taskDetail.close"}}
          </button>
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
