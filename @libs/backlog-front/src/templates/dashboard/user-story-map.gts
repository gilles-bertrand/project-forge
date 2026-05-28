import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import EpicRow from '../../components/epic-row.gts';
import AddEpicModal from '../../components/add-epic-modal.gts';
import EditEpicModal from '../../components/edit-epic-modal.gts';
import DeleteEpicConfirmModal from '../../components/delete-epic-confirm-modal.gts';
import AddUserStoryModal from '../../components/add-user-story-modal.gts';
import EditUserStoryModal from '../../components/edit-user-story-modal.gts';
import DeleteUserStoryConfirmModal from '../../components/delete-user-story-confirm-modal.gts';
import AddTaskModal from '../../components/add-task-modal.gts';
import TaskDetailModal from '../../components/task-detail-modal.gts';
import type EpicsService from '../../services/epics.ts';
import type UserStoriesService from '../../services/user-stories.ts';
import type TasksService from '../../services/tasks.ts';
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
  @service declare userStories: UserStoriesService;
  @service declare tasks: TasksService;
  @service declare currentProject: CurrentProjectService;

  @tracked addEpicOpen = false;
  @tracked addUSOpen = false;
  @tracked addTaskOpen = false;
  @tracked addTaskForUSId: string | null = null;
  @tracked detailTask: Task | null = null;
  @tracked selectedEpicForUS: Epic | null = null;
  @tracked editEpicTarget: Epic | null = null;
  @tracked deleteEpicTarget: Epic | null = null;
  @tracked _editUSTarget: UserStory | null = null;
  @tracked _deleteUSTarget: UserStory | null = null;

  // Sources of truth: WarpDrive services (tracked) — the route's @model is a
  // one-shot snapshot and goes stale after update/delete mutations.
  get epicsList(): Epic[] {
    return this.epics.list;
  }

  get userStoriesList(): UserStory[] {
    return this.userStories.list;
  }

  get tasksList(): Task[] {
    return this.tasks.all;
  }

  // Guard modal targets against project switch — if the user changes project
  // while a modal is open, hide the modal rather than submit to the wrong scope.
  get editUSTarget(): UserStory | null {
    const target = this._editUSTarget;
    if (!target) return null;
    if (target.projectId !== this.currentProject.currentProjectId) return null;
    return target;
  }

  get deleteUSTarget(): UserStory | null {
    const target = this._deleteUSTarget;
    if (!target) return null;
    if (target.projectId !== this.currentProject.currentProjectId) return null;
    return target;
  }

  get userStoryFor(): (task: Task) => UserStory | null {
    const usMap = new Map(this.userStoriesList.map((us) => [us.id, us]));
    return (task: Task) =>
      task.userStoryId ? (usMap.get(task.userStoryId) ?? null) : null;
  }

  get orphanCountFor(): (epic: Epic) => number {
    return (epic: Epic) =>
      this.userStoriesList.filter((us) => us.epicId === epic.id).length;
  }

  get taskCountForUS(): (us: UserStory) => number {
    return (us: UserStory) =>
      this.tasksList.filter((t) => t.userStoryId === us.id).length;
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
    this.addTaskForUSId = null;
    this.addTaskOpen = true;
  }

  @action openAddTaskForUS(us: UserStory) {
    this.addTaskForUSId = us.id;
    this.addTaskOpen = true;
  }

  @action closeAddTask() {
    this.addTaskOpen = false;
    this.addTaskForUSId = null;
  }

  @action openDetail(task: Task) {
    this.detailTask = task;
  }

  @action closeDetail() {
    this.detailTask = null;
  }

  @action openEditEpic(epic: Epic) {
    this.editEpicTarget = epic;
  }

  @action closeEditEpic() {
    this.editEpicTarget = null;
  }

  @action openDeleteEpic(epic: Epic) {
    this.deleteEpicTarget = epic;
  }

  @action closeDeleteEpic() {
    this.deleteEpicTarget = null;
  }

  @action async confirmDeleteEpic() {
    const epic = this.deleteEpicTarget;
    const projectId = this.currentProject.currentProjectId;
    const epicId = epic?.id;
    if (!epic || !epicId || !projectId) return;
    await this.epics.delete(epicId, projectId);
    this.deleteEpicTarget = null;
  }

  @action openEditUS(us: UserStory) {
    this._editUSTarget = us;
  }

  @action closeEditUS() {
    this._editUSTarget = null;
  }

  @action openDeleteUS(us: UserStory) {
    this._deleteUSTarget = us;
  }

  @action closeDeleteUS() {
    this._deleteUSTarget = null;
  }

  @action async confirmDeleteUS() {
    const us = this._deleteUSTarget;
    const projectId = this.currentProject.currentProjectId;
    const usId = us?.id;
    if (!us || !usId || !projectId) return;
    await this.userStories.delete(usId, projectId);
    this._deleteUSTarget = null;
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
          {{#each this.epicsList as |epic|}}
            <EpicRow
              @epic={{epic}}
              @userStories={{this.userStoriesList}}
              @tasks={{this.tasksList}}
              @onAddUserStory={{this.openAddUS}}
              @onOpenTask={{this.openDetail}}
              @onEditEpic={{this.openEditEpic}}
              @onDeleteEpic={{this.openDeleteEpic}}
              @onEditUserStory={{this.openEditUS}}
              @onDeleteUserStory={{this.openDeleteUS}}
              @onAddTask={{this.openAddTaskForUS}}
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
      <AddTaskModal
        @onClose={{this.closeAddTask}}
        @preselectedUserStoryId={{this.addTaskForUSId}}
      />
    {{/if}}

    {{#if this.detailTask}}
      <TaskDetailModal
        @task={{this.detailTask}}
        @userStory={{this.userStoryFor this.detailTask}}
        @onClose={{this.closeDetail}}
      />
    {{/if}}

    {{#if this.editEpicTarget}}
      <EditEpicModal
        @epic={{this.editEpicTarget}}
        @onClose={{this.closeEditEpic}}
      />
    {{/if}}

    {{#if this.deleteEpicTarget}}
      <DeleteEpicConfirmModal
        @epic={{this.deleteEpicTarget}}
        @orphanCount={{this.orphanCountFor this.deleteEpicTarget}}
        @onConfirm={{this.confirmDeleteEpic}}
        @onClose={{this.closeDeleteEpic}}
      />
    {{/if}}

    {{#if this.editUSTarget}}
      <EditUserStoryModal
        @userStory={{this.editUSTarget}}
        @onClose={{this.closeEditUS}}
      />
    {{/if}}

    {{#if this.deleteUSTarget}}
      <DeleteUserStoryConfirmModal
        @userStory={{this.deleteUSTarget}}
        @taskCount={{this.taskCountForUS this.deleteUSTarget}}
        @onConfirm={{this.confirmDeleteUS}}
        @onClose={{this.closeDeleteUS}}
      />
    {{/if}}
  </template>
}
