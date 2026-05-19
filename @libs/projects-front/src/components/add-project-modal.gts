import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t, type IntlService } from 'ember-intl';
import type { Store } from '@warp-drive/core';
import type SessionService from 'ember-simple-auth/services/session';
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

const STATUS_VALUES: ProjectStatus[] = ['planned', 'active', 'paused'];

export default class AddProjectModal extends Component<AddProjectModalSignature> {
  @service declare projects: ProjectsService;
  @service declare currentUser: CurrentUserService;
  @service declare store: Store;
  @service declare intl: IntlService;
  @service declare session: SessionService;

  @tracked name = '';
  @tracked description = '';
  @tracked status: ProjectStatus = 'planned';
  @tracked responsibleId = '';
  @tracked selectedMemberIds: string[] = [];
  @tracked users: UserLite[] = [];
  @tracked submitting = false;
  @tracked error = '';

  constructor(owner: unknown, args: AddProjectModalSignature['Args']) {
    super(owner as never, args);
    void this.loadUsers();
  }

  async loadUsers() {
    try {
      const auth = this.session.data.authenticated as
        | { data?: { accessToken?: string } }
        | undefined;
      const accessToken = auth?.data?.accessToken;
      const response = await fetch('/api/v1/users', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
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

  get statusOptions(): { value: ProjectStatus; label: string }[] {
    return STATUS_VALUES.map((value) => ({
      value,
      label: this.intl.t(`projects.status.${value}`),
    }));
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
        err instanceof Error
          ? err.message
          : this.intl.t('projects.modal.add.errorFallback');
    } finally {
      this.submitting = false;
    }
  }

  <template>
    <dialog class="modal modal-open" data-test-add-project-modal>
      <div class="modal-box max-w-2xl bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{t "projects.modal.add.title"}}</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "projects.modal.add.closeAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        <form {{on "submit" this.submit}} class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label text-sm font-medium" for="proj-name">
                {{t "projects.modal.add.name"}}
                *
              </label>
              <input
                id="proj-name"
                type="text"
                class="input input-bordered w-full"
                placeholder={{t "projects.modal.add.namePlaceholder"}}
                value={{this.name}}
                {{on "input" this.onNameInput}}
                required
              />
            </div>
            <div>
              <label class="label text-sm font-medium" for="proj-status">
                {{t "projects.modal.add.status"}}
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
              {{t "projects.modal.add.description"}}
            </label>
            <textarea
              id="proj-description"
              class="textarea textarea-bordered w-full h-24"
              placeholder={{t "projects.modal.add.descriptionPlaceholder"}}
              {{on "input" this.onDescriptionInput}}
            >{{this.description}}</textarea>
          </div>

          <div>
            <label class="label text-sm font-medium" for="proj-responsible">
              {{t "projects.modal.add.lead"}}
              *
            </label>
            <select
              id="proj-responsible"
              class="select select-bordered w-full"
              {{on "change" this.onResponsibleChange}}
              required
            >
              <option value="" disabled selected={{this.isNoResponsible}}>
                {{t "projects.modal.add.leadPlaceholder"}}
              </option>
              {{#each this.users as |u|}}
                <option value={{u.id}}>
                  {{u.firstName}}
                  {{u.lastName}}
                </option>
              {{/each}}
            </select>
          </div>

          <div>
            <span class="label text-sm font-medium">
              {{t
                "projects.modal.add.membersWithCount"
                count=this.selectedMemberIds.length
              }}
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
            >{{t "projects.modal.add.cancel"}}</button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={{this.cannotSubmit}}
            >
              {{if
                this.submitting
                (t "projects.modal.add.submitting")
                (t "projects.modal.add.submit")
              }}
            </button>
          </div>
        </form>
      </div>
      <div class="modal-backdrop" {{on "click" @onClose}}></div>
    </dialog>
  </template>
}
