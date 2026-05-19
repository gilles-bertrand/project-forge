import Component from '@glimmer/component';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { t, type IntlService } from 'ember-intl';
import type { TOC } from '@ember/component/template-only';
import type { Project } from '../schemas/projects.ts';
import type ProjectsService from '../services/projects.ts';
import StatusBadge from './status-badge.gts';
import MemberAvatarStack, {
  type MemberLite,
} from './member-avatar-stack.gts';

const KanbanIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="inline-block size-4 stroke-current"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
    />
  </svg>
</template>;

const ChartIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="inline-block size-4 stroke-current"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M13 10V3L4 14h7v7l9-11h-7z"
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

const UserIcon: TOC<{ Element: SVGSVGElement }> = <template>
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
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
</template>;

function shortMonth(d: Date, locale: string): string {
  return d
    .toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
    .replace('.', '');
}

interface ProjectCardSignature {
  Args: {
    project: Project;
    members?: MemberLite[];
    responsibleShortName?: string;
    onOpen: (project: Project) => void;
  };
  Element: HTMLDivElement;
}

export default class ProjectCard extends Component<ProjectCardSignature> {
  @service declare intl: IntlService;
  @service declare projects: ProjectsService;

  @tracked private _fetchedMembers: MemberLite[] = [];

  constructor(owner: unknown, args: ProjectCardSignature['Args']) {
    super(owner as never, args);
    if (!this.args.members) {
      void this.loadMembers();
    }
  }

  private async loadMembers(): Promise<void> {
    const id = this.args.project.id;
    if (!id) return;
    try {
      this._fetchedMembers = await this.projects.loadMembers(id);
    } catch (e) {
      console.error('[ProjectCard] loadMembers failed:', e);
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

  get responsibleShortName(): string {
    return this.args.responsibleShortName ?? '—';
  }

  userStoriesDone = 0;
  userStoriesTotal = 0;
  sprintDone = 0;
  sprintTotal = 0;

  <template>
    <div
      role="button"
      tabindex="0"
      class="card bg-base-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      {{on "click" (fn @onOpen @project)}}
      data-test-project-card
      ...attributes
    >
      <div class="card-body p-5 gap-3">
        <div class="flex items-start justify-between">
          <div
            class="bg-primary text-primary-content rounded-xl size-14 flex items-center justify-center"
          >
            <span class="text-xl font-bold">{{this.initials}}</span>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold">{{@project.name}}</h3>
          <div class="mt-1">
            <StatusBadge @status={{@project.status}} />
          </div>
        </div>

        <p class="text-sm opacity-70 line-clamp-2">{{@project.description}}</p>

        <div class="mt-1">
          <div class="flex justify-between text-xs opacity-70 mb-1">
            <span>{{t "projects.card.userStories"}}</span>
            <span>{{this.userStoriesDone}}/{{this.userStoriesTotal}}</span>
          </div>
          <progress
            class="progress progress-primary w-full h-1.5"
            value={{this.userStoriesDone}}
            max={{this.userStoriesTotal}}
          ></progress>
        </div>

        <div>
          <div class="flex justify-between text-xs opacity-70 mb-1">
            <span>{{t "projects.card.currentSprint"}}</span>
            <span>{{this.sprintDone}}/{{this.sprintTotal}}</span>
          </div>
          <progress
            class="progress progress-primary w-full h-1.5"
            value={{this.sprintDone}}
            max={{this.sprintTotal}}
          ></progress>
        </div>

        <div class="flex items-center justify-between mt-1 text-xs opacity-70">
          <span class="flex items-center gap-1">
            <CalendarIcon />
            {{t "projects.card.createdOn"}}
            {{this.formattedDate}}
          </span>
          <div class="flex items-center gap-1">
            <KanbanIcon />
            <ChartIcon />
          </div>
        </div>

        <div class="flex items-center justify-between">
          <MemberAvatarStack @members={{this.members}} />
          <span class="text-xs opacity-70 flex items-center gap-1">
            <UserIcon />
            {{this.responsibleShortName}}
          </span>
        </div>
      </div>
    </div>
  </template>
}
