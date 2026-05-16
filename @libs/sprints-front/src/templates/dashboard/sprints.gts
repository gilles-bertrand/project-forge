import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import SprintCard from '../../components/sprint-card.gts';
import AddSprintModal from '../../components/add-sprint-modal.gts';
import SprintsPagination from '../../components/sprints-pagination.gts';
import TaskRow from '@libs/backlog-front/components/task-row';
import type SprintsService from '../../services/sprints.ts';
import type { SprintData } from '../../services/sprints.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { Task } from '@libs/backlog-front/schemas/tasks';

interface SprintsTemplateSignature {
  Args: {
    model: { projectId: string | null; sprints: SprintData[] };
  };
}

const PAGE_SIZE = 3;

export default class DashboardSprintsTemplate extends Component<SprintsTemplateSignature> {
  @service declare sprints: SprintsService;
  @service declare currentProject: CurrentProjectService;

  @tracked addOpen = false;
  @tracked offset = 0;
  @tracked errorMessage: string | null = null;
  @tracked backlogTasks: Task[] = [];
  @tracked tasksBySprintCache: Record<string, Task[]> = {};

  constructor(owner: unknown, args: SprintsTemplateSignature['Args']) {
    super(owner as never, args);
    void this.loadBacklogTasks();
    void this.loadAllSprintTasks();
  }

  private async loadBacklogTasks() {
    const projectId = this.args.model.projectId;
    if (!projectId) return;
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`);
      const json = (await res.json()) as {
        data: Array<{ id: string; attributes: Omit<Task, 'id'> }>;
      };
      const allTasks = json.data.map((t) => ({ id: t.id, ...t.attributes }));
      this.backlogTasks = allTasks.filter((t) => !t.sprintId);
    } catch {
      this.backlogTasks = [];
    }
  }

  private async loadAllSprintTasks() {
    const cache: Record<string, Task[]> = {};
    for (const sprint of this.args.model.sprints) {
      if (!sprint.id) continue;
      try {
        const res = await fetch(`/api/v1/sprints/${sprint.id}/tasks`);
        const json = (await res.json()) as {
          data: Array<{ id: string; attributes: Omit<Task, 'id'> }>;
        };
        cache[sprint.id] = json.data.map((t) => ({
          id: t.id,
          ...t.attributes,
        }));
      } catch {
        cache[sprint.id] = [];
      }
    }
    this.tasksBySprintCache = cache;
  }

  tasksFor = (sprintId: string): Task[] => {
    return this.tasksBySprintCache[sprintId] ?? [];
  };

  get visibleSprints(): SprintData[] {
    return this.args.model.sprints.slice(
      this.offset,
      this.offset + PAGE_SIZE
    );
  }

  get total(): number {
    return this.args.model.sprints.length;
  }

  @action openAdd() {
    this.addOpen = true;
  }

  @action closeAdd() {
    this.addOpen = false;
    void this.loadAllSprintTasks();
  }

  @action onPrev() {
    this.offset = Math.max(0, this.offset - PAGE_SIZE);
  }

  @action onNext() {
    if (this.offset + PAGE_SIZE < this.total) {
      this.offset = this.offset + PAGE_SIZE;
    }
  }

  @action async onStart(sprintId: string) {
    const projectId = this.args.model.projectId;
    if (!projectId) return;
    try {
      await this.sprints.start(sprintId, projectId);
    } catch (err: unknown) {
      this.errorMessage =
        err instanceof Error ? err.message : 'Start sprint failed';
      setTimeout(() => {
        this.errorMessage = null;
      }, 4000);
    }
  }

  @action async onStop(sprintId: string) {
    const projectId = this.args.model.projectId;
    if (!projectId) return;
    try {
      await this.sprints.stop(sprintId, projectId);
    } catch (err: unknown) {
      this.errorMessage =
        err instanceof Error ? err.message : 'Stop sprint failed';
      setTimeout(() => {
        this.errorMessage = null;
      }, 4000);
    }
  }

  @action async onPlanTask(taskId: string, sprintId: string) {
    const task = this.backlogTasks.find((t) => t.id === taskId);
    if (!task) return;
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { type: 'tasks', id: taskId, attributes: { sprintId } },
        }),
      });
      if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);
      // Refresh both backlog tasks and sprint tasks
      this.backlogTasks = this.backlogTasks.filter((t) => t.id !== taskId);
      void this.loadAllSprintTasks();
    } catch (err: unknown) {
      this.errorMessage =
        err instanceof Error ? err.message : 'Move task failed';
      setTimeout(() => {
        this.errorMessage = null;
      }, 4000);
    }
  }

  <template>
    <div>
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">{{t "sprints.title"}}</h1>
          <p class="opacity-70 mt-1">{{t "sprints.subtitle"}}</p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn btn-sm"
            disabled
            title={{t "sprints.actions.history"}}
          >
            ⟲
            {{t "sprints.actions.history"}}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-primary"
            {{on "click" this.openAdd}}
          >
            {{t "sprints.actions.planSprint"}}
          </button>
        </div>
      </div>

      {{#if @model.projectId}}
        {{#if this.total}}
          <SprintsPagination
            class="mb-4"
            @offset={{this.offset}}
            @total={{this.total}}
            @pageSize={{PAGE_SIZE}}
            @onPrev={{this.onPrev}}
            @onNext={{this.onNext}}
          />

          <div class="grid grid-cols-3 gap-4">
            {{#each this.visibleSprints as |sprint|}}
              <SprintCard
                @sprint={{sprint}}
                @tasks={{this.tasksFor sprint.id}}
                @onStart={{this.onStart}}
                @onStop={{this.onStop}}
                @onPlanTask={{this.onPlanTask}}
              />
            {{/each}}
          </div>

          {{#if this.backlogTasks.length}}
            <div class="mt-8">
              <h2 class="text-xl font-bold mb-3">Backlog ({{this.backlogTasks.length}})</h2>
              <p class="text-xs opacity-60 mb-3">{{t "sprints.dropHint"}}</p>
              <div class="flex flex-col gap-2 max-w-xl">
                {{#each this.backlogTasks as |task|}}
                  <TaskRow @task={{task}} @draggable={{true}} />
                {{/each}}
              </div>
            </div>
          {{/if}}
        {{else}}
          <div class="alert alert-info">
            <span>Aucun sprint pour ce projet.</span>
          </div>
        {{/if}}

        {{#if this.errorMessage}}
          <div class="alert alert-error mt-4 text-sm" role="alert">
            {{this.errorMessage}}
          </div>
        {{/if}}
      {{else}}
        <div class="alert alert-info">
          <span>Sélectionnez un projet dans le header pour voir les sprints.</span>
        </div>
      {{/if}}
    </div>

    {{#if this.addOpen}}
      <AddSprintModal @onClose={{this.closeAdd}} />
    {{/if}}
  </template>
}
