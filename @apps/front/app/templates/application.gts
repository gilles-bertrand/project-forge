import { pageTitle } from 'ember-page-title';
import FlashMessage from 'ember-cli-flash/components/flash-message';
import Component from '@glimmer/component';
import { service } from '@ember/service';
import type FlashMessageService from 'ember-cli-flash/services/flash-messages';
import type AddItemRouterService from '@libs/shared-front/services/add-item-router';
import AddProjectModal from '@libs/projects-front/components/add-project-modal';
import AddEpicModal from '@libs/backlog-front/components/add-epic-modal';
import AddUserStoryModal from '@libs/backlog-front/components/add-user-story-modal';
import AddTaskModal from '@libs/backlog-front/components/add-task-modal';
import AddSprintModal from '@libs/sprints-front/components/add-sprint-modal';
import LogTimeModal from '@libs/time-tracking-front/components/log-time-modal';
import AddUserModal from '@libs/users-front/components/add-user-modal';

interface ApplicationSignature {
  Args: {
    model: unknown;
    controller: unknown;
  };
}

class ApplicationTemplate extends Component<ApplicationSignature> {
  @service declare flashMessages: FlashMessageService;
  @service declare addItemRouter: AddItemRouterService;

  get showProject() {
    return this.addItemRouter.openType === 'project';
  }
  get showEpic() {
    return this.addItemRouter.openType === 'epic';
  }
  get showUserStory() {
    return this.addItemRouter.openType === 'user-story';
  }
  get showTask() {
    return this.addItemRouter.openType === 'task';
  }
  get showSprint() {
    return this.addItemRouter.openType === 'sprint';
  }
  get showTimeEntry() {
    return this.addItemRouter.openType === 'time-entry';
  }
  get showUser() {
    return this.addItemRouter.openType === 'user';
  }

  <template>
    {{pageTitle "Application"}}
    <div id="tpk-modal"></div>
    <div class="alerts">
      {{#each this.flashMessages.arrangedQueue as |flash|}}
        <FlashMessage @flash={{flash}} />
      {{/each}}
    </div>

    {{#if this.showProject}}
      <AddProjectModal @onClose={{this.addItemRouter.close}} />
    {{/if}}
    {{#if this.showEpic}}
      <AddEpicModal @onClose={{this.addItemRouter.close}} />
    {{/if}}
    {{#if this.showUserStory}}
      <AddUserStoryModal
        @onClose={{this.addItemRouter.close}}
        @preselectedEpicId={{this.addItemRouter.context.preselectedEpicId}}
      />
    {{/if}}
    {{#if this.showTask}}
      <AddTaskModal
        @onClose={{this.addItemRouter.close}}
        @preselectedUserStoryId={{this.addItemRouter.context.preselectedUserStoryId}}
      />
    {{/if}}
    {{#if this.showSprint}}
      <AddSprintModal @onClose={{this.addItemRouter.close}} />
    {{/if}}
    {{#if this.showTimeEntry}}
      <LogTimeModal
        @onClose={{this.addItemRouter.close}}
        @onSaved={{this.addItemRouter.close}}
      />
    {{/if}}
    {{#if this.showUser}}
      <AddUserModal @onClose={{this.addItemRouter.close}} />
    {{/if}}

    {{outlet}}
  </template>
}

export default ApplicationTemplate;
