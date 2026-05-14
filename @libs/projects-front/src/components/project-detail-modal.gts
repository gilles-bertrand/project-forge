import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
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

export default class ProjectDetailModal extends Component<ProjectDetailModalSignature> {
  @service declare router: RouterService;
  @service declare currentProject: CurrentProjectService;

  get initials(): string {
    const name = this.args.project.name;
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  }

  // Placeholders P4 — réels en P10 (aggregation cross-domain)
  stats = [
    { label: 'Épiques', value: '0/0', color: 'text-secondary' },
    { label: 'User Stories', value: '0/0', color: 'text-primary' },
    { label: 'Tâches', value: '0/0', color: 'text-info' },
    { label: 'Sprints', value: '0/0', color: 'text-accent' },
  ];

  @action goToKanban() {
    // Q1: setCurrent avant navigate pour que /kanban sache quel projet afficher
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
                  Responsable: {{@project.responsibleId}}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label="Fermer"
            {{on "click" @onClose}}
          >✕</button>
        </div>

        {{!-- Description --}}
        <section class="mb-4">
          <h3 class="text-base font-semibold mb-1">Description</h3>
          <p class="text-sm opacity-80">{{@project.description}}</p>
        </section>

        {{!-- Progression --}}
        <section class="mb-4">
          <h3 class="text-base font-semibold mb-2">Progression du projet</h3>
          <div class="bg-base-100 rounded-lg p-3">
            <div class="flex justify-between text-sm mb-1">
              <span>User Stories complétées</span>
              <span>0%</span>
            </div>
            <progress
              class="progress progress-primary w-full"
              value="0"
              max="100"
            ></progress>
            <p class="text-xs opacity-60 mt-1">0 / 0 User Stories</p>
          </div>
        </section>

        {{!-- Statistiques --}}
        <section class="mb-4">
          <h3 class="text-base font-semibold mb-2">Statistiques</h3>
          <div class="grid grid-cols-4 gap-3">
            {{#each this.stats as |s|}}
              <div class="bg-base-100 rounded-lg p-3">
                <div class="text-xs opacity-70 {{s.color}}">{{s.label}}</div>
                <div class="text-xl font-bold mt-1">{{s.value}}</div>
              </div>
            {{/each}}
          </div>
          <p class="text-xs opacity-50 mt-2">
            ⓘ Statistiques détaillées disponibles en P10
          </p>
        </section>

        {{!-- Équipe (placeholder) --}}
        <section class="mb-4">
          <h3 class="text-base font-semibold mb-2">Équipe</h3>
          <p class="text-sm opacity-60">
            Liste des membres disponible quand la lib P5+ sera prête.
          </p>
        </section>

        {{!-- Footer --}}
        <div class="modal-action">
          <button type="button" class="btn" {{on "click" @onClose}}>
            Fermer
          </button>
          <button
            type="button"
            class="btn btn-primary"
            {{on "click" this.goToKanban}}
          >
            Voir le Kanban
          </button>
        </div>
      </div>
      <div class="modal-backdrop" {{on "click" @onClose}}></div>
    </dialog>
  </template>
}
