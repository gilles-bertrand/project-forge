import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { t } from 'ember-intl';
import { authFetchJson } from '#src/utils/auth-fetch.ts';
import type CommentsService from '#src/services/comments.ts';
import type { Comment, CommentOwnerType } from '#src/schemas/comments.ts';

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

interface CommentThreadSignature {
  Element: HTMLElement;
  Args: {
    ownerType: CommentOwnerType;
    ownerId: string;
    currentUserId: string | null;
    projectId?: string | null;
  };
}

/**
 * Polymorphic comment thread: lists, posts, edits and deletes comments for
 * any owner (task / epic / user-story / project). Author display names are
 * resolved best-effort from the project members. Edit/delete are limited to
 * the current user's own comments.
 */
export default class CommentThread extends Component<CommentThreadSignature> {
  @service declare comments: CommentsService;

  @tracked items: Comment[] = [];
  @tracked authors: Record<string, AuthorInfo> = {};
  @tracked loading = true;
  @tracked newComment = '';
  @tracked posting = false;
  @tracked editingId: string | null = null;
  @tracked editingContent = '';
  @tracked savingEdit = false;
  @tracked error = '';

  constructor(owner: unknown, args: CommentThreadSignature['Args']) {
    super(owner as never, args);
    void this.load();
  }

  private async load() {
    this.loading = true;
    try {
      this.items = await this.comments.loadByOwner(
        this.args.ownerType,
        this.args.ownerId
      );
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
      this.items = [];
    } finally {
      if (!this.isDestroying && !this.isDestroyed) this.loading = false;
    }
    if (this.args.projectId) await this.loadAuthors(this.args.projectId);
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

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

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

  isEditing = (id: string): boolean => this.editingId === id;

  canModify = (comment: Comment): boolean =>
    this.args.currentUserId !== null &&
    comment.userId === this.args.currentUserId;

  @action onNewCommentInput(e: Event) {
    this.newComment = (e.target as HTMLTextAreaElement).value;
  }

  @action onEditInput(e: Event) {
    this.editingContent = (e.target as HTMLTextAreaElement).value;
  }

  @action async postComment(e: Event) {
    e.preventDefault();
    const content = this.newComment.trim();
    const userId = this.args.currentUserId;
    if (!content || !userId || this.posting) return;
    this.posting = true;
    this.error = '';
    try {
      const created = await this.comments.create(
        this.args.ownerType,
        this.args.ownerId,
        { userId, content }
      );
      this.items = [...this.items, created];
      this.newComment = '';
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      if (!this.isDestroying && !this.isDestroyed) this.posting = false;
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
      this.items = this.items.map((c) => (c.id === comment.id ? updated : c));
      this.editingId = null;
      this.editingContent = '';
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      if (!this.isDestroying && !this.isDestroyed) this.savingEdit = false;
    }
  }

  @action async removeComment(comment: Comment) {
    this.error = '';
    try {
      await this.comments.remove(comment.id);
      this.items = this.items.filter((c) => c.id !== comment.id);
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  <template>
    <section class="space-y-3" data-test-comment-thread ...attributes>
      {{#if this.loading}}
        <p class="text-sm italic opacity-60" data-test-comment-thread-loading>
          {{t "shared.comments.loading"}}
        </p>
      {{else}}
        {{#each this.items as |comment|}}
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
                    aria-label={{t "shared.comments.editAria"}}
                    data-test-comment-edit
                    {{on "click" (fn this.startEdit comment)}}
                  >✎</button>
                  <button
                    type="button"
                    class="btn btn-xs btn-ghost text-error"
                    aria-label={{t "shared.comments.deleteAria"}}
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
                  aria-label={{t "shared.comments.editAria"}}
                  data-test-comment-edit-input
                  {{on "input" this.onEditInput}}
                >{{this.editingContent}}</textarea>
                <div class="flex gap-2 justify-end">
                  <button
                    type="button"
                    class="btn btn-xs"
                    {{on "click" this.cancelEdit}}
                  >{{t "shared.comments.cancel"}}</button>
                  <button
                    type="submit"
                    class="btn btn-xs btn-primary"
                    disabled={{this.savingEdit}}
                    data-test-comment-edit-save
                  >{{t "shared.comments.save"}}</button>
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
          <p
            class="italic opacity-60 text-sm"
            data-test-comment-thread-empty
          >{{t "shared.comments.empty"}}</p>
        {{/each}}

        <form
          class="flex flex-col gap-2 pt-2 border-t border-base-300"
          {{on "submit" this.postComment}}
        >
          <label class="sr-only" for="comment-thread-new">
            {{t "shared.comments.placeholder"}}
          </label>
          <textarea
            id="comment-thread-new"
            class="textarea textarea-bordered w-full text-sm"
            placeholder={{t "shared.comments.placeholder"}}
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
                {{t "shared.comments.posting"}}
              {{else}}
                {{t "shared.comments.post"}}
              {{/if}}
            </button>
          </div>
        </form>
      {{/if}}

      {{#if this.error}}
        <div
          class="alert alert-error text-xs"
          data-test-comment-thread-error
        >{{this.error}}</div>
      {{/if}}
    </section>
  </template>
}
