import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { t } from 'ember-intl';
import { authFetchJson } from '@libs/shared-front/utils/auth-fetch';
import TaskNatureBadge from './task-nature-badge.gts';
import TaskTypeBadge from './task-type-badge.gts';
import TaskStatusBadge from './task-status-badge.gts';
import TaskPriorityBadge from './task-priority-badge.gts';
import type TasksService from '../services/tasks.ts';
import type CommentsService from '../services/comments.ts';
import type AttachmentsService from '../services/attachments.ts';
import type RouterService from '@ember/routing/router-service';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type { TaskHistoryEvent, TaskAssignee } from '../services/tasks.ts';
import type { Comment } from '../schemas/comments.ts';
import type { Attachment } from '../schemas/attachments.ts';
import type { Task } from '../schemas/tasks.ts';
import type { UserStory } from '../schemas/user-stories.ts';

type TaskDetailTab = 'details' | 'comments' | 'history';

interface AuthorInfo {
  name: string;
}

interface MembersResponse {
  data: Array<{
    attributes: {
      userId: string;
      firstName: string | null;
      lastName: string | null;
    };
  }>;
}

interface TaskDetailModalSignature {
  Args: {
    task: Task;
    userStory?: UserStory | null;
    onClose: () => void;
  };
}

export default class TaskDetailModal extends Component<TaskDetailModalSignature> {
  @service declare tasks: TasksService;
  @service declare comments: CommentsService;
  @service declare attachments: AttachmentsService;
  @service declare router: RouterService;
  @service('current-user') declare currentUser: CurrentUserService;

  @tracked activeTab: TaskDetailTab = 'details';
  @tracked commentItems: Comment[] = [];
  @tracked attachmentItems: Attachment[] = [];
  @tracked history: TaskHistoryEvent[] = [];
  @tracked assignees: TaskAssignee[] = [];
  @tracked authors: Record<string, AuthorInfo> = {};

  @tracked newComment = '';
  @tracked posting = false;
  @tracked editingId: string | null = null;
  @tracked editingContent = '';
  @tracked savingEdit = false;
  @tracked uploading = false;
  @tracked error = '';

  constructor(owner: unknown, args: TaskDetailModalSignature['Args']) {
    super(owner as never, args);
    void this.loadAll();
  }

  private async loadAll() {
    const task = this.args.task;
    const taskId = task.id;
    if (!taskId) return;
    try {
      const [comments, attachments, history, assignees] = await Promise.all([
        this.comments.loadByOwner('task', taskId),
        this.attachments.loadByOwner('task', taskId),
        this.tasks.loadHistory(taskId),
        this.tasks.loadAssignees(taskId),
      ]);
      this.commentItems = comments;
      this.attachmentItems = attachments;
      this.history = history;
      this.assignees = assignees;
    } catch {
      this.commentItems = [];
      this.attachmentItems = [];
      this.history = [];
      this.assignees = [];
    }
    // Author resolution is best-effort: a failure must not wipe the data above.
    await this.loadAuthors(task.projectId);
  }

  private async loadAuthors(projectId: string) {
    try {
      const json = await authFetchJson<MembersResponse>(
        `/api/v1/projects/${projectId}/members`
      );
      const map: Record<string, AuthorInfo> = {};
      for (const m of json?.data ?? []) {
        const name =
          `${m.attributes.firstName ?? ''} ${m.attributes.lastName ?? ''}`.trim();
        if (name) map[m.attributes.userId] = { name };
      }
      if (!this.isDestroying && !this.isDestroyed) this.authors = map;
    } catch {
      if (!this.isDestroying && !this.isDestroyed) this.authors = {};
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

  get currentUserId(): string | null {
    return this.currentUser.user?.id ?? null;
  }

  get createdAtFormatted(): string {
    return this.formatDate(this.args.task.createdAt);
  }

  get firstAssignee(): TaskAssignee | null {
    return this.assignees[0] ?? null;
  }

  get attachmentsEmpty(): boolean {
    return this.attachmentItems.length === 0;
  }

  formatDate = (iso: string): string => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  authorName = (userId: string): string => this.authors[userId]?.name ?? userId;

  initials = (userId: string): string => {
    const name = this.authors[userId]?.name;
    if (!name) return '?';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  };

  humanSize = (bytes: number): string => {
    if (bytes < 1024) return `${String(bytes)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  isEditing = (id: string): boolean => this.editingId === id;

  canModify = (comment: Comment): boolean =>
    this.currentUserId !== null && comment.userId === this.currentUserId;

  @action showDetails() {
    this.activeTab = 'details';
  }
  @action showComments() {
    this.activeTab = 'comments';
  }
  @action showHistory() {
    this.activeTab = 'history';
  }

  @action onNewCommentInput(e: Event) {
    this.newComment = (e.target as HTMLTextAreaElement).value;
  }

  @action onEditInput(e: Event) {
    this.editingContent = (e.target as HTMLTextAreaElement).value;
  }

  @action async postComment(e: Event) {
    e.preventDefault();
    const content = this.newComment.trim();
    const userId = this.currentUserId;
    const taskId = this.args.task.id;
    if (!content || !userId || !taskId || this.posting) return;
    this.posting = true;
    this.error = '';
    try {
      const created = await this.comments.create('task', taskId, {
        userId,
        content,
      });
      this.commentItems = [...this.commentItems, created];
      this.newComment = '';
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      if (!this.isDestroying && !this.isDestroyed) {
        this.posting = false;
      }
    }
  }

  @action startEdit(comment: Comment) {
    this.editingId = comment.id;
    this.editingContent = comment.content;
  }

  @action cancelEdit() {
    this.editingId = null;
    this.editingContent = '';
  }

  @action async saveEdit(comment: Comment, e: Event) {
    e.preventDefault();
    const content = this.editingContent.trim();
    if (!content || this.savingEdit) return;
    this.savingEdit = true;
    this.error = '';
    try {
      const updated = await this.comments.update(comment.id, content);
      this.commentItems = this.commentItems.map((c) =>
        c.id === comment.id ? updated : c
      );
      this.editingId = null;
      this.editingContent = '';
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      if (!this.isDestroying && !this.isDestroyed) {
        this.savingEdit = false;
      }
    }
  }

  @action async removeComment(comment: Comment) {
    this.error = '';
    try {
      await this.comments.remove(comment.id);
      this.commentItems = this.commentItems.filter((c) => c.id !== comment.id);
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  @action async onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    const taskId = this.args.task.id;
    if (!file || !taskId || this.uploading) return;
    this.uploading = true;
    this.error = '';
    try {
      const created = await this.attachments.upload('task', taskId, file);
      if (created) {
        this.attachmentItems = [...this.attachmentItems, created];
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      input.value = '';
      if (!this.isDestroying && !this.isDestroyed) {
        this.uploading = false;
      }
    }
  }

  @action async removeAttachment(attachment: Attachment) {
    this.error = '';
    try {
      await this.attachments.remove(attachment.id);
      this.attachmentItems = this.attachmentItems.filter(
        (a) => a.id !== attachment.id
      );
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
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
              <div data-test-attachments-section>
                <h3 class="font-semibold mb-1">{{t
                    "backlog.modal.taskDetail.attachmentsTitle"
                  }}</h3>
                {{#if this.attachmentsEmpty}}
                  <p
                    class="text-sm opacity-60 italic"
                    data-test-attachments-empty
                  >
                    {{t "backlog.modal.taskDetail.attachmentsEmpty"}}
                  </p>
                {{else}}
                  <ul class="space-y-1">
                    {{#each this.attachmentItems as |attachment|}}
                      <li
                        class="flex items-center gap-2 text-sm bg-base-100 rounded px-2 py-1"
                        data-test-attachment-row={{attachment.id}}
                      >
                        <a
                          href={{attachment.url}}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="link link-primary truncate flex-1"
                          aria-label={{t
                            "backlog.modal.taskDetail.attachmentDownloadAria"
                          }}
                          data-test-attachment-download
                        >{{attachment.name}}</a>
                        <span class="text-xs opacity-60">{{this.humanSize
                            attachment.sizeBytes
                          }}</span>
                        <button
                          type="button"
                          class="btn btn-xs btn-ghost text-error"
                          aria-label={{t
                            "backlog.modal.taskDetail.attachmentDeleteAria"
                          }}
                          data-test-attachment-delete
                          {{on "click" (fn this.removeAttachment attachment)}}
                        >✕</button>
                      </li>
                    {{/each}}
                  </ul>
                {{/if}}
                <label
                  class="btn btn-sm btn-outline mt-2
                    {{if this.uploading 'btn-disabled'}}"
                  data-test-attachment-upload-label
                >
                  {{#if this.uploading}}
                    {{t "backlog.modal.taskDetail.attachmentUploading"}}
                  {{else}}
                    {{t "backlog.modal.taskDetail.attachmentUpload"}}
                  {{/if}}
                  <input
                    type="file"
                    class="hidden"
                    disabled={{this.uploading}}
                    data-test-attachment-upload-input
                    {{on "change" this.onFileChange}}
                  />
                </label>
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
            {{#each this.commentItems as |comment|}}
              <div
                class="bg-base-100 rounded p-3"
                data-test-comment-row={{comment.id}}
              >
                <div class="flex items-center gap-2 mb-1">
                  <span class="avatar avatar-placeholder" aria-hidden="true">
                    <span
                      class="bg-neutral text-neutral-content rounded-full w-6 h-6 text-xs flex items-center justify-center"
                    >{{this.initials comment.userId}}</span>
                  </span>
                  <span
                    class="font-medium text-sm"
                    data-test-comment-author
                  >{{this.authorName comment.userId}}</span>
                  <span class="text-xs opacity-50">•</span>
                  <span class="text-xs opacity-50">{{this.formatDate
                      comment.createdAt
                    }}</span>
                  {{#if (this.canModify comment)}}
                    <span class="ml-auto flex gap-1">
                      <button
                        type="button"
                        class="btn btn-xs btn-ghost"
                        aria-label={{t
                          "backlog.modal.taskDetail.commentEditAria"
                        }}
                        data-test-comment-edit
                        {{on "click" (fn this.startEdit comment)}}
                      >✎</button>
                      <button
                        type="button"
                        class="btn btn-xs btn-ghost text-error"
                        aria-label={{t
                          "backlog.modal.taskDetail.commentDeleteAria"
                        }}
                        data-test-comment-delete
                        {{on "click" (fn this.removeComment comment)}}
                      >✕</button>
                    </span>
                  {{/if}}
                </div>
                {{#if (this.isEditing comment.id)}}
                  <form
                    class="space-y-2"
                    {{on "submit" (fn this.saveEdit comment)}}
                  >
                    <textarea
                      class="textarea textarea-bordered w-full text-sm"
                      aria-label={{t
                        "backlog.modal.taskDetail.commentEditAria"
                      }}
                      data-test-comment-edit-input
                      {{on "input" this.onEditInput}}
                    >{{this.editingContent}}</textarea>
                    <div class="flex gap-2 justify-end">
                      <button
                        type="button"
                        class="btn btn-xs"
                        {{on "click" this.cancelEdit}}
                      >{{t "backlog.modal.taskDetail.commentCancel"}}</button>
                      <button
                        type="submit"
                        class="btn btn-xs btn-primary"
                        disabled={{this.savingEdit}}
                        data-test-comment-edit-save
                      >{{t "backlog.modal.taskDetail.commentSave"}}</button>
                    </div>
                  </form>
                {{else}}
                  <p
                    class="text-sm whitespace-pre-wrap"
                    data-test-comment-content
                  >{{comment.content}}</p>
                {{/if}}
              </div>
            {{else}}
              <p class="italic opacity-60 text-sm" data-test-comments-empty>{{t
                  "backlog.modal.taskDetail.commentsEmpty"
                }}</p>
            {{/each}}

            <form
              class="flex flex-col gap-2 pt-2 border-t border-base-300"
              {{on "submit" this.postComment}}
            >
              <label class="sr-only" for="task-detail-new-comment">
                {{t "backlog.modal.taskDetail.commentPlaceholder"}}
              </label>
              <textarea
                id="task-detail-new-comment"
                class="textarea textarea-bordered w-full text-sm"
                placeholder={{t "backlog.modal.taskDetail.commentPlaceholder"}}
                data-test-comment-new-input
                {{on "input" this.onNewCommentInput}}
              >{{this.newComment}}</textarea>
              <div class="flex justify-end">
                <button
                  type="submit"
                  class="btn btn-sm btn-primary"
                  disabled={{this.posting}}
                  data-test-comment-post
                >
                  {{#if this.posting}}
                    {{t "backlog.modal.taskDetail.commentPosting"}}
                  {{else}}
                    {{t "backlog.modal.taskDetail.commentPost"}}
                  {{/if}}
                </button>
              </div>
            </form>
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

        {{#if this.error}}
          <div
            class="alert alert-error text-xs mt-4"
            data-test-task-detail-error
          >{{this.error}}</div>
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
