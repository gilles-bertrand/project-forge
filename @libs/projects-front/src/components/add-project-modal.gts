import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import type { Store } from '@warp-drive/core';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type ProjectsService from '../services/projects.ts';
import type { ProjectStatus } from '../schemas/projects.ts';

type UserLite = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

interface AddProjectModalSignature {
  Args: { onClose: () => void };
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'planned', label: 'Planifié' },
  { value: 'active', label: 'Actif' },
  { value: 'paused', label: 'En pause' },
];

export default class AddProjectModal extends Component<AddProjectModalSignature> {
  @service declare projects: ProjectsService;
  @service declare currentUser: CurrentUserService;
  @service declare store: Store;

  @tracked name = '';
  @tracked description = '';
  @tracked status: ProjectStatus = 'planned';
  @tracked responsibleId = '';
  @tracked selectedMemberIds: string[] = [];
  @tracked users: UserLite[] = [];
  @tracked submitting = false;
  @tracked error = '';

  statusOptions = STATUS_OPTIONS;

  constructor(owner: unknown, args: AddProjectModalSignature['Args']) {
    super(owner as never, args);
    void this.loadUsers();
  }

  async loadUsers() {
    try {
      const response = await fetch('/api/v1/users');
      const json = (await response.json()) as {
        data: { id: string; attributes: UserLite }[];
      };
      this.users = json.data.map((u) => ({
        id: u.id,
        firstName: u.attributes.firstName,
        lastName: u.attributes.lastName,
        email: u.attributes.email,
      }));
    } catch (e) {
      console.error('[AddProjectModal] loadUsers failed:', e);
    }
  }

  get canSubmit(): boolean {
    return (
      this.name.trim().length > 0 &&
      this.responsibleId.length > 0 &&
      !this.submitting
    );
  }

  get cannotSubmit(): boolean {
    return !this.canSubmit;
  }

  get isNoResponsible(): boolean {
    return this.responsibleId === '';
  }

  isStatusSelected = (v: ProjectStatus): boolean => this.status === v;
  isMemberSelected = (id: string): boolean =>
    this.selectedMemberIds.includes(id);
  toggleMemberHandler = (id: string) => () => this.toggleMember(id);

  @action onNameInput(e: Event) {
    this.name = (e.target as HTMLInputElement).value;
  }

  @action onDescriptionInput(e: Event) {
    this.description = (e.target as HTMLTextAreaElement).value;
  }

  @action onStatusChange(e: Event) {
    this.status = (e.target as HTMLSelectElement).value as ProjectStatus;
  }

  @action onResponsibleChange(e: Event) {
    this.responsibleId = (e.target as HTMLSelectElement).value;
  }

  @action toggleMember(id: string) {
    if (this.selectedMemberIds.includes(id)) {
      this.selectedMemberIds = this.selectedMemberIds.filter((m) => m !== id);
    } else {
      this.selectedMemberIds = [...this.selectedMemberIds, id];
    }
  }

  @action async submit(e: Event) {
    e.preventDefault();
    if (!this.canSubmit) return;
    this.submitting = true;
    this.error = '';
    try {
      const createdById =
        this.currentUser.currentUser?.id ?? this.responsibleId;
      await this.projects.create({
        name: this.name.trim(),
        description: this.description.trim(),
        status: this.status,
        responsibleId: this.responsibleId,
        createdById,
      });
      this.args.onClose();
    } catch (err: unknown) {
      this.error =
        err instanceof Error ? err.message : 'Erreur lors de la création';
    } finally {
      this.submitting = false;
    }
  }

  <template>
    <dialog class="modal modal-open" data-test-add-project-modal>
      <div class="modal-box max-w-2xl bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">Nouveau projet</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label="Fermer"
            {{on "click" @onClose}}
          >✕</button>
        </div>

        <form {{on "submit" this.submit}} class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label text-sm font-medium" for="proj-name">
                Nom du projet *
              </label>
              <input
                id="proj-name"
                type="text"
                class="input input-bordered w-full"
                placeholder="Ex: E-Commerce Platform"
                value={{this.name}}
                {{on "input" this.onNameInput}}
                required
              />
            </div>
            <div>
              <label class="label text-sm font-medium" for="proj-status">
                Statut initial
              </label>
              <select
                id="proj-status"
                class="select select-bordered w-full"
                {{on "change" this.onStatusChange}}
              >
                {{#each this.statusOptions as |opt|}}
                  <option
                    value={{opt.value}}
                    selected={{this.isStatusSelected opt.value}}
                  >{{opt.label}}</option>
                {{/each}}
              </select>
            </div>
          </div>

          <div>
            <label class="label text-sm font-medium" for="proj-description">
              Description
            </label>
            <textarea
              id="proj-description"
              class="textarea textarea-bordered w-full h-24"
              placeholder="Description du projet..."
              {{on "input" this.onDescriptionInput}}
            >{{this.description}}</textarea>
          </div>

          <div>
            <label class="label text-sm font-medium" for="proj-responsible">
              Responsable du projet *
            </label>
            <select
              id="proj-responsible"
              class="select select-bordered w-full"
              {{on "change" this.onResponsibleChange}}
              required
            >
              <option value="" disabled selected={{this.isNoResponsible}}>
                Sélectionner un responsable
              </option>
              {{#each this.users as |u|}}
                <option value={{u.id}}>
                  {{u.firstName}} {{u.lastName}}
                </option>
              {{/each}}
            </select>
          </div>

          <div>
            <span class="label text-sm font-medium">
              Membres de l'équipe ({{this.selectedMemberIds.length}}
              sélectionnés)
            </span>
            <div
              class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto mt-1 p-2 rounded bg-base-100"
            >
              {{#each this.users as |u|}}
                <label
                  class="flex items-center gap-2 p-2 rounded hover:bg-base-200 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    class="checkbox checkbox-primary checkbox-sm"
                    checked={{this.isMemberSelected u.id}}
                    {{on "change" (this.toggleMemberHandler u.id)}}
                  />
                  <span class="text-sm">
                    {{u.firstName}}
                    {{u.lastName}}
                  </span>
                </label>
              {{/each}}
            </div>
          </div>

          {{#if this.error}}
            <div class="alert alert-error text-sm">{{this.error}}</div>
          {{/if}}

          <div class="modal-action mt-2">
            <button
              type="button"
              class="btn"
              disabled={{this.submitting}}
              {{on "click" @onClose}}
            >Annuler</button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={{this.cannotSubmit}}
            >
              {{if this.submitting "Création..." "Créer le projet"}}
            </button>
          </div>
        </form>
      </div>
      <div class="modal-backdrop" {{on "click" @onClose}}></div>
    </dialog>
  </template>
}
