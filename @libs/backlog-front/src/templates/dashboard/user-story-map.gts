import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import EpicRow from '../../components/epic-row.gts';
import AddEpicModal from '../../components/add-epic-modal.gts';
import AddUserStoryModal from '../../components/add-user-story-modal.gts';
import AddTaskModal from '../../components/add-task-modal.gts';
import TaskDetailModal from '../../components/task-detail-modal.gts';
import type EpicsService from '../../services/epics.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { Epic } from '../../schemas/epics.ts';
import type { UserStory } from '../../schemas/user-stories.ts';
import type { Task } from '../../schemas/tasks.ts';

interface USMTemplateSignature {
  Args: {
    model: { epics: Epic[]; userStories: UserStory[]; tasks: Task[] };
  };
}

export default class DashboardUserStoryMapTemplate extends Component<USMTemplateSignature> {
  @service declare epics: EpicsService;
  @service declare currentProject: CurrentProjectService;

  @tracked addEpicOpen = false;
  @tracked addUSOpen = false;
  @tracked addTaskOpen = false;
  @tracked detailTask: Task | null = null;
  @tracked selectedEpicForUS: Epic | null = null;

  get userStoryFor(): (task: Task) => UserStory | null {
    const usMap = new Map(this.args.model.userStories.map((us) => [us.id, us]));
    return (task: Task) =>
      task.userStoryId ? (usMap.get(task.userStoryId) ?? null) : null;
  }

  @action openAddEpic() {
    this.addEpicOpen = true;
  }

  @action closeAddEpic() {
    this.addEpicOpen = false;
  }

  @action openAddUS(epic?: Epic) {
    this.selectedEpicForUS = epic ?? null;
    this.addUSOpen = true;
  }

  @action closeAddUS() {
    this.addUSOpen = false;
    this.selectedEpicForUS = null;
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

  <template>
    <div>
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">{{t "user-story-map.title"}}</h1>
          <p class="opacity-70 mt-1">{{t "user-story-map.subtitle"}}</p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn btn-sm btn-secondary"
            {{on "click" this.openAddEpic}}
          >
            {{t "user-story-map.newEpic"}}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-primary"
            {{on "click" (fn this.openAddUS null)}}
          >
            {{t "user-story-map.newUserStory"}}
          </button>
          <button
            type="button"
            class="btn btn-sm"
            {{on "click" this.openAddTask}}
          >
            {{t "user-story-map.newTask"}}
          </button>
        </div>
      </div>

      {{#if this.currentProject.currentProjectId}}
        <div class="space-y-2">
          {{#each @model.epics as |epic|}}
            <EpicRow
              @epic={{epic}}
              @userStories={{@model.userStories}}
              @tasks={{@model.tasks}}
              @onAddUserStory={{this.openAddUS}}
              @onOpenTask={{this.openDetail}}
            />
          {{else}}
            <div class="py-12 text-center opacity-60">
              {{t "user-story-map.emptyState"}}
            </div>
          {{/each}}
        </div>
      {{else}}
        <div class="alert alert-info">
          <span>{{t "backlog.noProjectSelected"}}</span>
        </div>
      {{/if}}
    </div>

    {{#if this.addEpicOpen}}
      <AddEpicModal @onClose={{this.closeAddEpic}} />
    {{/if}}

    {{#if this.addUSOpen}}
      <AddUserStoryModal
        @onClose={{this.closeAddUS}}
        @preselectedEpicId={{this.selectedEpicForUS.id}}
      />
    {{/if}}

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
