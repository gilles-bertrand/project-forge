import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import BacklogFilters from '../../components/backlog-filters.gts';
import TaskRow from '../../components/task-row.gts';
import AddTaskModal from '../../components/add-task-modal.gts';
import TaskDetailModal from '../../components/task-detail-modal.gts';
import type TasksService from '../../services/tasks.ts';
import type UserStoriesService from '../../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { Task } from '../../schemas/tasks.ts';
import type { UserStory } from '../../schemas/user-stories.ts';

interface BacklogTemplateSignature {
  Args: { model: { tasks: Task[]; userStories: UserStory[] } };
}

export default class DashboardBacklogTemplate extends Component<BacklogTemplateSignature> {
  @service declare tasks: TasksService;
  @service declare userStories: UserStoriesService;
  @service declare currentProject: CurrentProjectService;

  @tracked private _filteredTasks: Task[] | null = null;
  @tracked addTaskOpen = false;
  @tracked detailTask: Task | null = null;

  get displayedTasks(): Task[] {
    return this._filteredTasks ?? this.args.model.tasks;
  }

  @action onFilter(filtered: Task[]) {
    this._filteredTasks = filtered;
  }

  @action openAddTask() {
    this.addTaskOpen = true;
  }

  @action closeAddTask() {
    this.addTaskOpen = false;
  }

  @action openDetail(task: Task) {
    this.detailTask = task;
  }

  @action closeDetail() {
    this.detailTask = null;
  }

  get userStoryFor(): (task: Task) => UserStory | null {
    const usMap = new Map(this.args.model.userStories.map((us) => [us.id, us]));
    return (task: Task) =>
      task.userStoryId ? (usMap.get(task.userStoryId) ?? null) : null;
  }

  <template>
    <div>
      <div class="flex items-start justify-between mb-4">
        <div>
          <h1 class="text-3xl font-bold">{{t "backlog.title"}}</h1>
          <p class="opacity-70 mt-1">
            {{t "backlog.subtitle" count=this.displayedTasks.length}}
          </p>
        </div>
        <button
          type="button"
          class="btn btn-primary"
          {{on "click" this.openAddTask}}
        >
          {{t "backlog.newTask"}}
        </button>
      </div>

      {{#if this.currentProject.currentProjectId}}
        <BacklogFilters
          @tasks={{@model.tasks}}
          @userStories={{@model.userStories}}
          @onFilter={{this.onFilter}}
        />

        <div class="mt-4 space-y-2">
          {{#each this.displayedTasks as |task|}}
            <TaskRow
              @task={{task}}
              @userStory={{this.userStoryFor task}}
              @onOpen={{this.openDetail}}
            />
          {{else}}
            <div class="py-12 text-center opacity-60">
              {{t "backlog.emptyState"}}
            </div>
          {{/each}}
        </div>

        <div class="mt-4 text-xs opacity-40 text-right">
          {{t "backlog.dragHint"}}
        </div>
      {{else}}
        <div class="alert alert-info">
          <span>{{t "backlog.noProjectSelected"}}</span>
        </div>
      {{/if}}
    </div>

    {{#if this.addTaskOpen}}
      <AddTaskModal @onClose={{this.closeAddTask}} />
    {{/if}}

    {{#if this.detailTask}}
      <TaskDetailModal
        @task={{this.detailTask}}
        @userStory={{this.userStoryFor this.detailTask}}
        @onClose={{this.closeDetail}}
      />
    {{/if}}
  </template>
}
