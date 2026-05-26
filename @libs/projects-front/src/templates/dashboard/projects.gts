import { service } from '@ember/service';
import Component from '@glimmer/component';
import type { TOC } from '@ember/component/template-only';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { fn } from '@ember/helper';
import { on } from '@ember/modifier';
import { t, type IntlService } from 'ember-intl';
import TpkButton from '@triptyk/ember-input/components/tpk-button';
import TpkConfirmModalPrefab from '@triptyk/ember-ui/components/prefabs/tpk-confirm-modal-prefab';
import ProjectCard from '../../components/project-card.gts';
import ProjectFormModal from '../../components/project-form-modal.gts';
import ProjectsTable from '../../components/projects-table.gts';
import type ProjectsService from '../../services/projects.ts';
import type { Project } from '../../schemas/projects.ts';
import type { MemberLite } from '../../components/member-avatar-stack.gts';
import type RouterService from '@ember/routing/router-service';
import type CurrentProjectService from '@libs/shell-front/services/current-project';

const GridViewIcon: TOC<{ Element: SVGSVGElement }> = <template>
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
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
    />
  </svg>
</template>;

const ListViewIcon: TOC<{ Element: SVGSVGElement }> = <template>
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
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
</template>;

const VIEW_MODE_KEY = 'sprintforge:projects-view-mode';
type ViewMode = 'grid' | 'list';

function readViewMode(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_MODE_KEY);
    return v === 'list' || v === 'grid' ? v : 'grid';
  } catch {
    return 'grid';
  }
}

function writeViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // ignore (private mode, quota, etc.)
  }
}

export default class DashboardProjectsTemplate extends Component {
  @service declare projects: ProjectsService;
  @service declare router: RouterService;
  @service declare currentProject: CurrentProjectService;
  @service declare intl: IntlService;

  @tracked viewMode: ViewMode = readViewMode();
  @tracked addModalOpen = false;
  @tracked editProject: Project | null = null;
  @tracked deleteTarget: Project | null = null;
  @tracked deleteError = '';
  @tracked tableReload: (() => void) | null = null;
  @tracked private freshMembersMap: Map<string, MemberLite[]> = new Map();

  @action registerTableReload(reload: () => void) {
    this.tableReload = reload;
  }

  membersForProject = (projectId: string | null | undefined): MemberLite[] | undefined => {
    if (!projectId) return undefined;
    return this.freshMembersMap.get(projectId);
  };

  isCurrentProject = (projectId: string | null | undefined): boolean => {
    return !!projectId && projectId === this.currentProject.currentProjectId;
  };

  @action async handleUpdated(updatedProject: Project) {
    this.editProject = null;
    if (updatedProject.id) {
      try {
        const members = await this.projects.loadMembers(updatedProject.id);
        const next = new Map(this.freshMembersMap);
        next.set(updatedProject.id, members);
        this.freshMembersMap = next;
      } catch {
        // membres restent ceux du cache lazy si le rechargement échoue
      }
    }
    this.tableReload?.();
  }

  get isDeleteModalOpen(): boolean {
    return this.deleteTarget !== null;
  }

  get isGridMode(): boolean {
    return this.viewMode === 'grid';
  }

  get isListMode(): boolean {
    return this.viewMode === 'list';
  }

  get deleteConfirmQuestion(): string {
    if (!this.deleteTarget) return '';
    const title = this.intl.t('projects.delete.confirm.title');
    const body = this.intl.t('projects.delete.confirm.body');
    const prefix = this.deleteError ? `⚠ ${this.deleteError}\n\n` : '';
    return `${prefix}${title}\n\n${body}`;
  }

  @action openAdd() {
    this.addModalOpen = true;
  }

  @action closeAdd() {
    this.addModalOpen = false;
  }

  @action selectProject(project: Project) {
    if (project.id) {
      this.currentProject.setCurrent(project.id);
    }
  }

  @action openEdit(p: Project) {
    this.editProject = p;
  }

  @action closeEdit() {
    this.editProject = null;
  }

  @action requestDelete(p: Project) {
    this.deleteTarget = p;
  }

  @action cancelDelete() {
    this.deleteTarget = null;
    this.deleteError = '';
  }

  @action async confirmDelete() {
    if (!this.deleteTarget?.id) return;
    try {
      this.deleteError = '';
      await this.projects.delete(this.deleteTarget.id);
      if (this.currentProject.currentProjectId === this.deleteTarget.id) {
        this.currentProject.clear();
        const ids = this.projects.list.map((p) => p.id!).filter(Boolean);
        this.currentProject.ensureDefault(ids);
      }
      this.deleteTarget = null;
      this.deleteError = '';
      this.tableReload?.();
    } catch {
      this.deleteError = this.intl.t('projects.delete.error.generic');
    }
  }

  @action handleCreated(project: Project) {
    this.addModalOpen = false;
    if (project.id) {
      this.currentProject.setCurrent(project.id);
      void this.router.transitionTo('dashboard.kanban');
    }
  }

  @action setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    writeViewMode(mode);
  }

  <template>
    <div>
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">{{t "projects.title"}}</h1>
          <p class="opacity-70 mt-1">{{t "projects.subtitle"}}</p>
        </div>
        <div class="flex items-center gap-2">
          <TpkButton
            @label={{t "projects.newProject"}}
            @onClick={{this.openAdd}}
            class="btn-primary"
            data-test-new-project
          >
            {{t "projects.newProject"}}
          </TpkButton>
          <button
            type="button"
            class="btn btn-sm {{if this.isGridMode 'btn-primary' 'btn-ghost'}}"
            aria-label={{t "projects.view.gridAria"}}
            data-test-view-grid
            {{on "click" (fn this.setViewMode "grid")}}
          >
            <GridViewIcon />{{t "projects.view.grid"}}
          </button>
          <button
            type="button"
            class="btn btn-sm {{if this.isListMode 'btn-primary' 'btn-ghost'}}"
            aria-label={{t "projects.view.listAria"}}
            data-test-view-list
            {{on "click" (fn this.setViewMode "list")}}
          >
            <ListViewIcon />{{t "projects.view.list"}}
          </button>
        </div>
      </div>

      {{#if this.isGridMode}}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {{#each this.projects.list as |p|}}
            <ProjectCard
              @project={{p}}
              @members={{this.membersForProject p.id}}
              @isCurrent={{this.isCurrentProject p.id}}
              @onActivate={{this.selectProject}}
              @onEdit={{this.openEdit}}
              @onDelete={{this.requestDelete}}
            />
          {{else}}
            <div class="col-span-full flex flex-col items-center gap-3 py-16 text-base-content/40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                class="size-12 stroke-current"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                />
              </svg>
              <p class="text-sm">{{t "projects.emptyState"}}</p>
            </div>
          {{/each}}
        </div>
      {{else}}
        <ProjectsTable
          @onActivate={{this.selectProject}}
          @onEdit={{this.openEdit}}
          @onDelete={{this.requestDelete}}
          @registerReload={{this.registerTableReload}}
        />
      {{/if}}

      {{#if this.addModalOpen}}
        <ProjectFormModal @onClose={{this.closeAdd}} @onCreated={{this.handleCreated}} />
      {{/if}}

      {{#if this.editProject}}
        <ProjectFormModal
          @project={{this.editProject}}
          @onClose={{this.closeEdit}}
          @onUpdated={{this.handleUpdated}}
        />
      {{/if}}

      <TpkConfirmModalPrefab
        @isOpen={{this.isDeleteModalOpen}}
        @onClose={{this.cancelDelete}}
        @onConfirm={{this.confirmDelete}}
        @icon=""
        @cancelText={{t "projects.delete.confirm.cancel"}}
        @confirmText={{t "projects.delete.confirm.confirm"}}
        @confirmQuestion={{this.deleteConfirmQuestion}}
      />
    </div>
  </template>
}
