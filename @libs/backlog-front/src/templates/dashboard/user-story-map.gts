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
  @tracked selectedEpicForUS: Epic | null = null;

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

  <template>
    <div>
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">{{t "userStoryMap.title"}}</h1>
          <p class="opacity-70 mt-1">{{t "userStoryMap.subtitle"}}</p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn btn-sm btn-secondary"
            {{on "click" this.openAddEpic}}
          >
            {{t "userStoryMap.newEpic"}}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-primary"
            {{on "click" (fn this.openAddUS null)}}
          >
            {{t "userStoryMap.newUserStory"}}
          </button>
          <button
            type="button"
            class="btn btn-sm"
            disabled
            title={{t "backlog.newTaskDisabled"}}
          >
            {{t "userStoryMap.newTask"}}
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
            />
          {{else}}
            <div class="py-12 text-center opacity-60">
              {{t "userStoryMap.emptyState"}}
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
  </template>
}
