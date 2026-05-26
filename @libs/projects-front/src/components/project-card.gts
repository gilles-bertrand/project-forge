import Component from '@glimmer/component';
import { on } from '@ember/modifier';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { t, type IntlService } from 'ember-intl';
import type { TOC } from '@ember/component/template-only';
import type { Project } from '../schemas/projects.ts';
import type ProjectsService from '../services/projects.ts';
import type { ProjectStats } from '../services/projects.ts';
import StatusBadge from './status-badge.gts';
import MemberAvatarStack, {
  type MemberLite,
} from './member-avatar-stack.gts';
import ProjectActionBar from './project-action-bar.gts';

const CheckCircleIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="size-3 stroke-primary-content"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="3"
      d="M5 13l4 4L19 7"
    />
  </svg>
</template>;

const CalendarIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="inline-block size-3 stroke-current"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
</template>;

const PencilIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="size-4 stroke-current"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
</template>;

const TrashIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="size-4 stroke-current"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
</template>;

function shortMonth(d: Date, locale: string): string {
  return d
    .toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
    .replace('.', '');
}

const AVATAR_COLORS = [
  'bg-primary text-primary-content',
  'bg-secondary text-secondary-content',
  'bg-accent text-accent-content',
  'bg-info text-info-content',
  'bg-success text-success-content',
  'bg-warning text-warning-content',
];

function projectAvatarColor(id: string | null | undefined): string {
  if (!id) return AVATAR_COLORS[0]!;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

interface ProjectCardSignature {
  Args: {
    project: Project;
    members?: MemberLite[];
    isCurrent?: boolean;
    responsibleShortName?: string;
    onActivate: (project: Project) => void;
    onEdit?: (project: Project) => void;
    onDelete?: (project: Project) => void;
  };
  Element: HTMLDivElement;
}

export default class ProjectCard extends Component<ProjectCardSignature> {
  @service declare intl: IntlService;
  @service declare projects: ProjectsService;

  @tracked private _fetchedMembers: MemberLite[] = [];
  @tracked private _stats: ProjectStats | null = null;
  private _alive = true;

  constructor(owner: unknown, args: ProjectCardSignature['Args']) {
    super(owner as never, args);
    if (!this.args.members) void this.loadMembers();
    void this.loadStats();
  }

  override willDestroy(): void {
    this._alive = false;
    super.willDestroy();
  }

  private async loadMembers(): Promise<void> {
    const id = this.args.project.id;
    if (!id) return;
    try {
      const members = await this.projects.loadMembers(id);
      if (this._alive) this._fetchedMembers = members;
    } catch (e) {
      console.error('[ProjectCard] loadMembers failed:', e);
    }
  }

  private async loadStats(): Promise<void> {
    const id = this.args.project.id;
    if (!id) return;
    try {
      const stats = await this.projects.loadStats(id);
      if (this._alive) this._stats = stats;
    } catch (e) {
      console.error('[ProjectCard] loadStats failed:', e);
    }
  }

  get initials(): string {
    const name = this.args.project.name;
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  }

  get formattedDate(): string {
    const raw = this.args.project.createdAt;
    if (!raw) return '';
    const locale = this.intl.primaryLocale ?? 'fr-FR';
    return shortMonth(new Date(raw), locale);
  }

  get members(): MemberLite[] {
    return this.args.members ?? this._fetchedMembers;
  }

  get avatarColorClass(): string {
    return projectAvatarColor(this.args.project.id);
  }

  get epicsDone(): number { return this._stats?.epics.done ?? 0; }
  get epicsTotal(): number { return this._stats?.epics.total ?? 0; }
  get userStoriesDone(): number { return this._stats?.userStories.done ?? 0; }
  get userStoriesTotal(): number { return this._stats?.userStories.total ?? 0; }
  get tasksDone(): number { return this._stats?.tasks.done ?? 0; }
  get tasksTotal(): number { return this._stats?.tasks.total ?? 0; }
  get sprintsActive(): number { return this._stats?.sprints.active ?? 0; }
  get sprintsTotal(): number { return this._stats?.sprints.total ?? 0; }
  get sprintDone(): number { return this._stats?.currentSprint.tasksDone ?? 0; }
  get sprintTotal(): number { return this._stats?.currentSprint.tasksTotal ?? 0; }

  get moreMembersLabel(): string {
    const extra = Math.max(0, this.members.length - 4);
    return `+${String(extra)} ${this.intl.t('projects.card.moreMembers')}`;
  }

  @action handleActivate(e: Event): void {
    e.stopPropagation();
    this.args.onActivate(this.args.project);
  }

  @action handleEdit(e: Event) {
    e.stopPropagation();
    this.args.onEdit?.(this.args.project);
  }

  @action handleDelete(e: Event) {
    e.stopPropagation();
    this.args.onDelete?.(this.args.project);
  }

  <template>
    <div
      role="article"
      class="card bg-base-200 border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 {{if @isCurrent 'border-primary ring-1 ring-primary/20' 'border-base-300/40'}}"
      data-test-project-card
      data-test-project-current={{@isCurrent}}
      {{on "click" this.handleActivate}}
      ...attributes
    >
      <div class="card-body p-5 gap-3">
        <div class="flex items-start justify-between">
          <div class="relative">
            <div
              class="rounded-xl size-14 flex items-center justify-center {{this.avatarColorClass}}"
            >
              <span class="text-xl font-bold">{{this.initials}}</span>
            </div>
            {{#if @isCurrent}}
              <span
                class="absolute -bottom-1 -right-1 size-5 bg-primary rounded-full flex items-center justify-center shadow"
                title={{t "projects.card.currentProject"}}
                aria-label={{t "projects.card.currentProject"}}
              >
                <CheckCircleIcon />
              </span>
            {{/if}}
          </div>
          <StatusBadge @status={{@project.status}} />
        </div>

        <div>
          <button
            type="button"
            class="text-lg font-semibold text-left hover:text-primary transition-colors cursor-pointer"
            aria-label={{@project.name}}
            data-test-project-card-open
            {{on "click" this.handleActivate}}
          >{{@project.name}}</button>
        </div>

        <p class="text-sm text-base-content/80 line-clamp-2">{{@project.description}}</p>

        {{!-- Progress bars --}}
        <div class="mt-1">
          <div class="flex justify-between text-xs text-base-content/75 mb-1">
            <span>{{t "projects.card.userStories"}}</span>
            <span>{{this.userStoriesDone}}/{{this.userStoriesTotal}}</span>
          </div>
          <progress
            class="progress progress-primary w-full h-2"
            value={{this.userStoriesDone}}
            max={{if this.userStoriesTotal this.userStoriesTotal 1}}
          ></progress>
        </div>

        <div>
          <div class="flex justify-between text-xs text-base-content/75 mb-1">
            <span>{{t "projects.card.currentSprint"}}</span>
            <span>{{this.sprintDone}}/{{this.sprintTotal}}</span>
          </div>
          <progress
            class="progress progress-primary w-full h-2"
            value={{this.sprintDone}}
            max={{if this.sprintTotal this.sprintTotal 1}}
          ></progress>
        </div>

        {{!-- 4 mini-counters --}}
        <div class="grid grid-cols-4 gap-1">
          <div class="bg-base-300/20 rounded p-1.5 text-center">
            <div class="text-xs text-warning font-medium truncate">
              {{t "projects.card.epicsLabel"}}
            </div>
            <div class="text-sm font-bold">{{this.epicsDone}}/{{this.epicsTotal}}</div>
          </div>
          <div class="bg-base-300/20 rounded p-1.5 text-center">
            <div class="text-xs text-primary font-medium truncate">
              {{t "projects.card.userStoriesLabel"}}
            </div>
            <div class="text-sm font-bold">{{this.userStoriesDone}}/{{this.userStoriesTotal}}</div>
          </div>
          <div class="bg-base-300/20 rounded p-1.5 text-center">
            <div class="text-xs text-info font-medium truncate">
              {{t "projects.card.tasksLabel"}}
            </div>
            <div class="text-sm font-bold">{{this.tasksDone}}/{{this.tasksTotal}}</div>
          </div>
          <div class="bg-base-300/20 rounded p-1.5 text-center">
            <div class="text-xs text-accent font-medium truncate">
              {{t "projects.card.sprintsLabel"}}
            </div>
            <div class="text-sm font-bold">{{this.sprintsActive}}/{{this.sprintsTotal}}</div>
          </div>
        </div>

        {{!-- Date + member avatars --}}
        <div class="flex items-center justify-between mt-1">
          <span class="flex items-center gap-1 text-xs text-base-content/60">
            <CalendarIcon />
            {{t "projects.card.createdOn"}}
            {{this.formattedDate}}
          </span>
          {{#if this.members.length}}
            <MemberAvatarStack
              @members={{this.members}}
              @max={{4}}
              @moreLabel={{this.moreMembersLabel}}
            />
          {{else}}
            <span
              class="text-xs text-base-content/40"
              data-test-project-card-no-members
            >
              {{t "projects.card.noMembers"}}
            </span>
          {{/if}}
        </div>

        {{!-- Action bar + edit/delete --}}
        <div class="border-t border-base-300/60 pt-3 flex items-center justify-between">
          <ProjectActionBar @project={{@project}} />
          <div class="flex items-center gap-1">
            {{#if @onEdit}}
              <button
                type="button"
                class="btn btn-sm btn-ghost"
                aria-label={{t "projects.card.editAria"}}
                title={{t "projects.card.editAria"}}
                {{on "click" this.handleEdit}}
                data-test-project-card-edit
              >
                <PencilIcon />
              </button>
            {{/if}}
            {{#if @onDelete}}
              <button
                type="button"
                class="btn btn-sm btn-ghost text-error"
                aria-label={{t "projects.card.deleteAria"}}
                title={{t "projects.card.deleteAria"}}
                {{on "click" this.handleDelete}}
                data-test-project-card-delete
              >
                <TrashIcon />
              </button>
            {{/if}}
          </div>
        </div>
      </div>
    </div>
  </template>
}
