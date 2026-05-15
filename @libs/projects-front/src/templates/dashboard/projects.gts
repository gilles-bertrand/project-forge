import { service } from '@ember/service';
import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { t } from 'ember-intl';
import TpkButton from '@triptyk/ember-input/components/tpk-button';
import ProjectCard from '../../components/project-card.gts';
import AddProjectModal from '../../components/add-project-modal.gts';
import ProjectDetailModal from '../../components/project-detail-modal.gts';
import type ProjectsService from '../../services/projects.ts';
import type { Project } from '../../schemas/projects.ts';

export default class DashboardProjectsTemplate extends Component {
  @service declare projects: ProjectsService;
  @tracked addModalOpen = false;
  @tracked detailProject: Project | null = null;

  @action openAdd() {
    this.addModalOpen = true;
  }

  @action closeAdd() {
    this.addModalOpen = false;
  }

  @action openDetail(p: Project) {
    this.detailProject = p;
  }

  @action closeDetail() {
    this.detailProject = null;
  }

  <template>
    <div>
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">{{t "projects.title"}}</h1>
          <p class="opacity-70 mt-1">{{t "projects.subtitle"}}</p>
        </div>
        <TpkButton
          @label={{t "projects.newProject"}}
          @onClick={{this.openAdd}}
          class="btn-primary"
        >
          {{t "projects.newProject"}}
        </TpkButton>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {{#each this.projects.list as |p|}}
          <ProjectCard @project={{p}} @onOpen={{this.openDetail}} />
        {{else}}
          <div class="col-span-full text-center opacity-60 py-12">
            {{t "projects.emptyState"}}
          </div>
        {{/each}}
      </div>

      {{#if this.addModalOpen}}
        <AddProjectModal @onClose={{this.closeAdd}} />
      {{/if}}
      {{#if this.detailProject}}
        <ProjectDetailModal
          @project={{this.detailProject}}
          @onClose={{this.closeDetail}}
        />
      {{/if}}
    </div>
  </template>
}
