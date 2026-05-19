import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t, type IntlService } from 'ember-intl';
import type RouterService from '@ember/routing/router-service';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { Project } from '../schemas/projects.ts';
import StatusBadge from './status-badge.gts';

interface ProjectDetailModalSignature {
  Args: {
    project: Project;
    onClose: () => void;
  };
}

type StatItem = {
  key: 'epics' | 'userStories' | 'tasks' | 'sprints';
  label: string;
  value: string;
  color: string;
};

export default class ProjectDetailModal extends Component<ProjectDetailModalSignature> {
  @service declare router: RouterService;
  @service declare currentProject: CurrentProjectService;
  @service declare intl: IntlService;

  get initials(): string {
    const name = this.args.project.name;
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  }

  get stats(): StatItem[] {
    return [
      {
        key: 'epics',
        label: this.intl.t('projects.modal.detail.stats.epics'),
        value: '0/0',
        color: 'text-secondary',
      },
      {
        key: 'userStories',
        label: this.intl.t('projects.modal.detail.stats.userStories'),
        value: '0/0',
        color: 'text-primary',
      },
      {
        key: 'tasks',
        label: this.intl.t('projects.modal.detail.stats.tasks'),
        value: '0/0',
        color: 'text-info',
      },
      {
        key: 'sprints',
        label: this.intl.t('projects.modal.detail.stats.sprints'),
        value: '0/0',
        color: 'text-accent',
      },
    ];
  }

  @action goToKanban() {
    const id = this.args.project.id;
    if (id) this.currentProject.setCurrent(id);
    void this.router.transitionTo('dashboard.kanban');
    this.args.onClose();
  }

  <template>
    <dialog class="modal modal-open" data-test-project-detail-modal>
      <div class="modal-box max-w-3xl bg-base-200 max-h-[90vh]">

        {{!-- Header --}}
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-4">
            <div
              class="bg-primary text-primary-content rounded-xl size-14 flex items-center justify-center"
            >
              <span class="text-xl font-bold">{{this.initials}}</span>
            </div>
            <div>
              <h2 class="text-xl font-bold">{{@project.name}}</h2>
              <div class="flex items-center gap-3 mt-1">
                <StatusBadge @status={{@project.status}} />
                <span class="text-sm opacity-70">
                  {{t
                    "projects.modal.detail.responsible"
                    name=@project.responsibleId
                  }}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "projects.modal.detail.closeAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        {{!-- Description --}}
        <section class="mb-4">
          <h3 class="text-base font-semibold mb-1">
            {{t "projects.modal.detail.description"}}
          </h3>
          <p class="text-sm opacity-80">{{@project.description}}</p>
        </section>

        {{!-- Progression --}}
        <section class="mb-4">
          <h3 class="text-base font-semibold mb-2">
            {{t "projects.modal.detail.progress"}}
          </h3>
          <div class="bg-base-100 rounded-lg p-3">
            <div class="flex justify-between text-sm mb-1">
              <span>{{t "projects.modal.detail.userStoriesCompleted"}}</span>
              <span>0%</span>
            </div>
            <progress
              class="progress progress-primary w-full"
              value="0"
              max="100"
            ></progress>
            <p class="text-xs opacity-60 mt-1">
              {{t
                "projects.modal.detail.userStoriesRatio"
                done=0
                total=0
              }}
            </p>
          </div>
        </section>

        {{!-- Statistiques --}}
        <section class="mb-4">
          <h3 class="text-base font-semibold mb-2">
            {{t "projects.modal.detail.stats.title"}}
          </h3>
          <div class="grid grid-cols-4 gap-3">
            {{#each this.stats as |s|}}
              <div class="bg-base-100 rounded-lg p-3">
                <div class="text-xs opacity-70 {{s.color}}">{{s.label}}</div>
                <div class="text-xl font-bold mt-1">{{s.value}}</div>
              </div>
            {{/each}}
          </div>
          <p class="text-xs opacity-50 mt-2">
            ⓘ
            {{t "projects.modal.detail.stats.hint"}}
          </p>
        </section>

        {{!-- Équipe (placeholder) --}}
        <section class="mb-4">
          <h3 class="text-base font-semibold mb-2">
            {{t "projects.modal.detail.team"}}
          </h3>
          <p class="text-sm opacity-60">
            {{t "projects.modal.detail.teamPlaceholder"}}
          </p>
        </section>

        {{!-- Footer --}}
        <div class="modal-action">
          <button type="button" class="btn" {{on "click" @onClose}}>
            {{t "projects.modal.detail.close"}}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            {{on "click" this.goToKanban}}
          >
            {{t "projects.modal.detail.viewKanban"}}
          </button>
        </div>
      </div>
      <div class="modal-backdrop" {{on "click" @onClose}}></div>
    </dialog>
  </template>
}
