import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import UserStoryCard from '../../components/user-story-card.gts';
import BacklogEpicFilter from '../../components/backlog-epic-filter.gts';
import AddUserStoryModal from '../../components/add-user-story-modal.gts';
import EditUserStoryModal from '../../components/edit-user-story-modal.gts';
import AddTaskModal from '../../components/add-task-modal.gts';
import TaskDetailModal from '../../components/task-detail-modal.gts';
import type EpicsService from '../../services/epics.ts';
import type TasksService from '../../services/tasks.ts';
import type UserStoriesService from '../../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type RouterService from '@ember/routing/router-service';
import type { Epic } from '../../schemas/epics.ts';
import type { UserStory } from '../../schemas/user-stories.ts';
import type { Task } from '../../schemas/tasks.ts';

const NO_EPIC_COLOR = '#6B7280';
const ORPHAN_KEY = 'none';

interface BacklogTemplateSignature {
  Args: {
    model: { epics: Epic[]; userStories: UserStory[]; tasks: Task[] };
    // Route controller — carries the `task` query param so the detail modal
    // is deep-linkable / shareable. Typed structurally so it accepts the real
    // controller and is trivially fakeable in tests.
    controller?: { task: string | null };
  };
}

interface Group {
  epic: Epic | null;
  stories: UserStory[];
}

export default class DashboardBacklogTemplate extends Component<BacklogTemplateSignature> {
  @service declare epics: EpicsService;
  @service declare userStories: UserStoriesService;
  @service declare tasks: TasksService;
  @service declare currentProject: CurrentProjectService;
  // Only accessed as a fallback when the route does not pass @controller.
  @service declare router: RouterService;

  @tracked activeEpicId: string | null = null;
  @tracked collapsedEpics = new Set<string>();
  @tracked expandedStories = new Set<string>();
  @tracked addUSOpen = false;
  @tracked addTaskOpen = false;
  @tracked _editUSTarget: UserStory | null = null;
  // Reactive source of truth for the detail modal. The URL (`?task=`) is kept
  // in sync as a best-effort enhancement, but the modal never depends on it.
  @tracked _detailTask: Task | null = null;

  constructor(owner: unknown, args: BacklogTemplateSignature['Args']) {
    super(owner as never, args);
    // Deep-link on load: open the modal if the shared URL carries a task id.
    const id = this.taskParamFromUrl();
    if (id) {
      const found = this.tasksList.find((task) => task.id === id);
      if (found) this._detailTask = found;
    }
  }

  private taskParamFromUrl(): string | null {
    if (this.args.controller) return this.args.controller.task;
    try {
      const qp = this.router.currentRoute?.queryParams as
        | Record<string, string | undefined>
        | undefined;
      return qp?.['task'] ?? null;
    } catch {
      return null;
    }
  }

  // Sources of truth: WarpDrive services (tracked) — the route @model is a
  // one-shot snapshot that goes stale after create/update/delete mutations.
  get epicsList(): Epic[] {
    return this.epics.list;
  }

  get userStoriesList(): UserStory[] {
    return this.userStories.list;
  }

  get tasksList(): Task[] {
    return this.tasks.all;
  }

  // Hide the edit modal if the project changes while it is open, rather than
  // submit against the wrong scope.
  get editUSTarget(): UserStory | null {
    const target = this._editUSTarget;
    if (!target) return null;
    if (target.projectId !== this.currentProject.currentProjectId) return null;
    return target;
  }

  get tasksForUS(): (us: UserStory) => Task[] {
    const byUs = new Map<string, Task[]>();
    for (const task of this.tasksList) {
      if (!task.userStoryId) continue;
      const arr = byUs.get(task.userStoryId);
      if (arr) arr.push(task);
      else byUs.set(task.userStoryId, [task]);
    }
    return (us: UserStory) => (us.id ? (byUs.get(us.id) ?? []) : []);
  }

  get userStoryFor(): (task: Task) => UserStory | null {
    const map = new Map(this.userStoriesList.map((us) => [us.id, us]));
    return (task: Task) =>
      task.userStoryId ? (map.get(task.userStoryId) ?? null) : null;
  }

  private sortByRank(stories: UserStory[]): UserStory[] {
    return [...stories].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  }

  get filteredUserStories(): UserStory[] {
    const all = this.activeEpicId
      ? this.userStoriesList.filter((us) => us.epicId === this.activeEpicId)
      : this.userStoriesList;
    return this.sortByRank(all);
  }

  // US grouped by epic in epic order, with a trailing "no epic" group.
  get groupedUserStories(): Group[] {
    const byEpic = new Map<string | null, UserStory[]>();
    for (const us of this.filteredUserStories) {
      const key = us.epicId ?? null;
      const arr = byEpic.get(key);
      if (arr) arr.push(us);
      else byEpic.set(key, [us]);
    }
    const groups: Group[] = [];
    for (const epic of this.epicsList) {
      const arr = byEpic.get(epic.id);
      if (arr?.length) groups.push({ epic, stories: arr });
    }
    const orphans = byEpic.get(null);
    if (orphans?.length) groups.push({ epic: null, stories: orphans });
    return groups;
  }

  get groupKeys(): string[] {
    return this.groupedUserStories.map((g) => g.epic?.id ?? ORPHAN_KEY);
  }

  get allCollapsed(): boolean {
    const keys = this.groupKeys;
    return keys.length > 0 && keys.every((k) => this.collapsedEpics.has(k));
  }

  groupKey = (group: Group): string => group.epic?.id ?? ORPHAN_KEY;

  groupDotStyle = (epic: Epic | null): string =>
    `background-color: ${epic?.color ?? NO_EPIC_COLOR}`;

  isEpicCollapsed = (key: string): boolean => this.collapsedEpics.has(key);

  // Positive form for templates: strict-mode .gts can't use the `not` helper
  // without importing it, so we expose the inverse directly.
  isEpicExpanded = (key: string): boolean => !this.collapsedEpics.has(key);

  isStoryExpanded = (us: UserStory): boolean =>
    us.id ? this.expandedStories.has(us.id) : false;

  @action selectEpic(epicId: string | null) {
    this.activeEpicId = epicId;
  }

  @action toggleEpic(key: string) {
    const next = new Set(this.collapsedEpics);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.collapsedEpics = next;
  }

  @action toggleStory(us: UserStory) {
    if (!us.id) return;
    const next = new Set(this.expandedStories);
    if (next.has(us.id)) next.delete(us.id);
    else next.add(us.id);
    this.expandedStories = next;
  }

  @action toggleCollapseAll() {
    this.collapsedEpics = this.allCollapsed
      ? new Set()
      : new Set(this.groupKeys);
  }

  @action openAddUS() {
    this.addUSOpen = true;
  }

  @action closeAddUS() {
    this.addUSOpen = false;
  }

  @action openAddTask() {
    this.addTaskOpen = true;
  }

  @action closeAddTask() {
    this.addTaskOpen = false;
  }

  @action openEditUS(us: UserStory) {
    this._editUSTarget = us;
  }

  @action closeEditUS() {
    this._editUSTarget = null;
  }

  get detailTask(): Task | null {
    return this._detailTask;
  }

  // Best-effort URL sync so the open task is shareable (/backlog?task=<id>).
  // Wrapped: a routing hiccup must never prevent the modal from opening.
  private syncTaskParam(id: string | null) {
    try {
      if (this.args.controller) {
        this.args.controller.task = id;
      } else {
        this.router.transitionTo({ queryParams: { task: id } });
      }
    } catch {
      // ignore — the modal is driven by tracked state, not the URL
    }
  }

  @action openTaskDetail(task: Task) {
    this._detailTask = task;
    this.syncTaskParam(task.id ?? null);
  }

  @action closeTaskDetail() {
    this._detailTask = null;
    this.syncTaskParam(null);
  }

  <template>
    <div>
      <div class="flex items-start justify-between mb-4">
        <div>
          <h1 class="text-3xl font-bold">{{t "backlog.title"}}</h1>
          <p class="opacity-70 mt-1">
            {{t
              "backlog.subtitleStories"
              count=this.filteredUserStories.length
            }}
          </p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn btn-sm"
            data-test-backlog-collapse-all
            {{on "click" this.toggleCollapseAll}}
          >
            {{#if this.allCollapsed}}
              {{t "backlog.expandAll"}}
            {{else}}
              {{t "backlog.collapseAll"}}
            {{/if}}
          </button>
          <button
            type="button"
            class="btn btn-sm"
            {{on "click" this.openAddTask}}
          >
            {{t "backlog.newTask"}}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-primary"
            {{on "click" this.openAddUS}}
          >
            {{t "backlog.newUserStory"}}
          </button>
        </div>
      </div>

      {{#if this.currentProject.currentProjectId}}
        <BacklogEpicFilter
          @epics={{this.epicsList}}
          @activeEpicId={{this.activeEpicId}}
          @onSelect={{this.selectEpic}}
        />

        {{#if this.filteredUserStories.length}}
          <div class="mt-4 space-y-6">
            {{#each this.groupedUserStories as |group|}}
              <section data-test-backlog-epic-group={{this.groupKey group}}>
                <button
                  type="button"
                  class="flex items-center gap-2 mb-2 w-full text-left hover:opacity-80"
                  aria-expanded={{if
                    (this.isEpicExpanded (this.groupKey group))
                    "true"
                    "false"
                  }}
                  data-test-backlog-epic-collapse={{this.groupKey group}}
                  {{on "click" (fn this.toggleEpic (this.groupKey group))}}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="size-3 flex-shrink-0 opacity-50 transition-transform
                      {{if
                        (this.isEpicExpanded (this.groupKey group))
                        'rotate-90'
                      }}"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span
                    class="size-3 rounded-full flex-shrink-0"
                    style={{this.groupDotStyle group.epic}}
                    aria-hidden="true"
                  ></span>
                  <span class="text-sm font-semibold uppercase tracking-wide">
                    {{#if group.epic}}
                      {{group.epic.title}}
                    {{else}}
                      {{t "backlog.card.noEpic"}}
                    {{/if}}
                  </span>
                  <span
                    class="text-xs opacity-50"
                  >({{group.stories.length}})</span>
                </button>

                {{#if (this.isEpicExpanded (this.groupKey group))}}
                  <div
                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start"
                  >
                    {{#each group.stories as |us|}}
                      <UserStoryCard
                        @userStory={{us}}
                        @epic={{group.epic}}
                        @tasks={{this.tasksForUS us}}
                        @expanded={{this.isStoryExpanded us}}
                        @onOpen={{this.openEditUS}}
                        @onToggle={{this.toggleStory}}
                        @onOpenTask={{this.openTaskDetail}}
                      />
                    {{/each}}
                  </div>
                {{/if}}
              </section>
            {{/each}}
          </div>
        {{else}}
          <div class="py-12 text-center opacity-60">
            {{t "backlog.emptyStateStories"}}
          </div>
        {{/if}}
      {{else}}
        <div class="alert alert-info">
          <span>{{t "backlog.noProjectSelected"}}</span>
        </div>
      {{/if}}
    </div>

    {{#if this.addUSOpen}}
      <AddUserStoryModal @onClose={{this.closeAddUS}} />
    {{/if}}

    {{#if this.addTaskOpen}}
      <AddTaskModal @onClose={{this.closeAddTask}} />
    {{/if}}

    {{#if this.editUSTarget}}
      <EditUserStoryModal
        @userStory={{this.editUSTarget}}
        @onClose={{this.closeEditUS}}
      />
    {{/if}}

    {{#if this.detailTask}}
      <TaskDetailModal
        @task={{this.detailTask}}
        @userStory={{this.userStoryFor this.detailTask}}
        @onClose={{this.closeTaskDetail}}
      />
    {{/if}}
  </template>
}
