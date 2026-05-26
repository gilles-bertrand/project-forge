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
import type { Project, ProjectStatus } from '../schemas/projects.ts';

type UserLite = { id: string; firstName: string; lastName: string; email: string };

interface ProjectFormModalSignature {
  Args: {
    project?: Project | null;
    onClose: () => void;
    onCreated?: (project: Project) => void;
    onUpdated?: (project: Project) => void;
  };
}

const STATUS_VALUES: ProjectStatus[] = ['planned', 'active', 'paused'];

export default class ProjectFormModal extends Component<ProjectFormModalSignature> {
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
  @tracked sprintDurationDays = 14;
  @tracked defaultVelocityPoints = 20;
  @tracked private originalMemberIds: string[] = [];
  @tracked membersLoaded = false;

  constructor(owner: unknown, args: ProjectFormModalSignature['Args']) {
    super(owner as never, args);
    if (this.mode === 'edit' && args.project) {
      this.name = args.project.name;
      this.description = args.project.description;
      this.status = args.project.status;
      this.responsibleId = args.project.responsibleId;
      this.sprintDurationDays = (args.project as unknown as { sprintDurationDays?: number }).sprintDurationDays ?? 14;
      this.defaultVelocityPoints = (args.project as unknown as { defaultVelocityPoints?: number }).defaultVelocityPoints ?? 20;
      void this.loadMembersAndUsers(args.project.id!);
    } else {
      void this.loadUsers().finally(() => {
        this.membersLoaded = true;
      });
    }
  }

  get mode(): 'create' | 'edit' {
    return this.args.project ? 'edit' : 'create';
  }

  get titleLabel(): string {
    return this.intl.t(this.mode === 'create' ? 'projects.modal.add.title' : 'projects.modal.edit.title');
  }

  get submitLabel(): string {
    return this.intl.t(this.mode === 'create' ? 'projects.modal.add.submit' : 'projects.modal.edit.submit');
  }

  get submittingLabel(): string {
    return this.intl.t(this.mode === 'create' ? 'projects.modal.add.submitting' : 'projects.modal.edit.submitting');
  }

  get errorFallbackLabel(): string {
    return this.intl.t(this.mode === 'create' ? 'projects.modal.add.errorFallback' : 'projects.modal.edit.errorFallback');
  }

  get statusOptions(): { value: ProjectStatus; label: string }[] {
    return STATUS_VALUES.map((v) => ({ value: v, label: this.intl.t(`projects.status.${v}`) }));
  }

  get canSubmit(): boolean {
    return (
      this.name.trim().length > 0 &&
      this.responsibleId.length > 0 &&
      !this.submitting &&
      this.membersLoaded
    );
  }

  get cannotSubmit(): boolean {
    return !this.canSubmit;
  }

  get isNoResponsible(): boolean {
    return this.responsibleId === '';
  }

  isStatusSelected = (v: ProjectStatus): boolean => this.status === v;
  isMemberSelected = (id: string): boolean => this.selectedMemberIds.includes(id);
  isResponsible = (id: string): boolean => id === this.responsibleId;
  toggleMemberHandler = (id: string) => () => this.toggleMember(id);

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
      console.error('[ProjectFormModal] loadUsers failed:', e);
    }
  }

  async loadMembersAndUsers(projectId: string) {
    this.membersLoaded = false;
    await this.loadUsers();
    try {
      const members = await this.projects.loadMembers(projectId);
      const ids = members.map((m) => m.id);
      this.originalMemberIds = [...ids];
      // Ensure responsible is always included in selected members
      const withResponsible =
        ids.includes(this.responsibleId) || !this.responsibleId
          ? ids
          : [...ids, this.responsibleId];
      this.selectedMemberIds = [...withResponsible];
    } catch (e) {
      console.error('[ProjectFormModal] loadMembers failed:', e);
    } finally {
      this.membersLoaded = true;
    }
  }

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
    const newId = (e.target as HTMLSelectElement).value;
    const previousResponsibleId = this.responsibleId;
    this.responsibleId = newId;

    // Remove the previous responsible from members if they were auto-added
    // (i.e., not part of the project's original membership in edit mode).
    if (
      previousResponsibleId &&
      previousResponsibleId !== newId &&
      !this.originalMemberIds.includes(previousResponsibleId)
    ) {
      this.selectedMemberIds = this.selectedMemberIds.filter(
        (id) => id !== previousResponsibleId,
      );
    }

    // Auto-add the new responsible as a member (they're always a member).
    if (newId && !this.selectedMemberIds.includes(newId)) {
      this.selectedMemberIds = [...this.selectedMemberIds, newId];
    }
  }

  @action toggleMember(id: string) {
    if (id === this.responsibleId) return; // responsible is always a member
    if (this.selectedMemberIds.includes(id)) {
      this.selectedMemberIds = this.selectedMemberIds.filter((m) => m !== id);
    } else {
      this.selectedMemberIds = [...this.selectedMemberIds, id];
    }
  }

  @action onSprintDurationInput(e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    if (v >= 1 && v <= 60) this.sprintDurationDays = v;
  }

  @action onDefaultVelocityInput(e: Event) {
    const v = Number((e.target as HTMLInputElement).value);
    if (v >= 1 && v <= 200) this.defaultVelocityPoints = v;
  }

  @action async submit(e: Event) {
    e.preventDefault();
    if (!this.canSubmit) return;
    this.submitting = true;
    this.error = '';

    try {
      if (this.mode === 'create') {
        const createdById = this.currentUser.currentUser?.id ?? this.responsibleId;
        const created = await this.projects.create({
          name: this.name.trim(),
          description: this.description.trim(),
          status: this.status,
          responsibleId: this.responsibleId,
          createdById,
        });
        this.args.onCreated?.(created);
      } else {
        const project = this.args.project!;
        const projectId = project.id!;

        const updated = await this.projects.update(projectId, {
          name: this.name.trim(),
          description: this.description.trim(),
          status: this.status,
          responsibleId: this.responsibleId,
          sprintDurationDays: this.sprintDurationDays,
          defaultVelocityPoints: this.defaultVelocityPoints,
        });

        const toAdd = this.selectedMemberIds.filter(
          (id) => !this.originalMemberIds.includes(id)
        );
        const toRemove = this.originalMemberIds.filter(
          (id) => !this.selectedMemberIds.includes(id)
        );

        await Promise.all([
          ...toAdd.map((id) => this.projects.addMember(projectId, id)),
          ...toRemove.map((id) => this.projects.removeMember(projectId, id)),
        ]);

        this.args.onUpdated?.(updated);
      }

      this.args.onClose();
    } catch (err: unknown) {
      this.error =
        err instanceof Error ? err.message : this.errorFallbackLabel;
    } finally {
      this.submitting = false;
    }
  }

  <template>
    <dialog
      class="modal modal-open"
      data-test-project-form-modal
      data-test-project-form-mode={{this.mode}}
    >
      <div class="modal-box max-w-2xl bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{this.titleLabel}}</h3>
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
                {{t "projects.modal.add.name"}} *
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
                  <option value={{opt.value}} selected={{this.isStatusSelected opt.value}}>
                    {{opt.label}}
                  </option>
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
              {{t "projects.modal.add.lead"}} *
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
                <option value={{u.id}}>{{u.firstName}} {{u.lastName}}</option>
              {{/each}}
            </select>
          </div>

          <div>
            <span class="label text-sm font-medium">
              {{t "projects.modal.add.membersWithCount" count=this.selectedMemberIds.length}}
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
                    disabled={{this.isResponsible u.id}}
                    {{on "change" (this.toggleMemberHandler u.id)}}
                  />
                  <span class="text-sm">{{u.firstName}} {{u.lastName}}</span>
                  {{#if (this.isResponsible u.id)}}
                    <span class="badge badge-primary badge-xs ml-auto">Resp.</span>
                  {{/if}}
                </label>
              {{/each}}
            </div>
          </div>

          {{!-- Sprint config --}}
          <div class="border-t border-base-300/40 pt-4">
            <h3 class="text-sm font-semibold mb-3 opacity-70">
              {{t "projects.modal.sprintConfig"}}
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label text-sm font-medium" for="sprint-duration">
                  {{t "projects.modal.sprintDuration"}}
                </label>
                <input
                  id="sprint-duration"
                  type="number"
                  class="input input-bordered input-sm w-full"
                  min="1"
                  max="60"
                  value={{this.sprintDurationDays}}
                  {{on "input" this.onSprintDurationInput}}
                />
              </div>
              <div>
                <label class="label text-sm font-medium" for="sprint-velocity">
                  {{t "projects.modal.sprintVelocity"}}
                </label>
                <input
                  id="sprint-velocity"
                  type="number"
                  class="input input-bordered input-sm w-full"
                  min="1"
                  max="200"
                  value={{this.defaultVelocityPoints}}
                  {{on "input" this.onDefaultVelocityInput}}
                />
              </div>
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
              {{if this.submitting this.submittingLabel this.submitLabel}}
            </button>
          </div>
        </form>
      </div>
      <div class="modal-backdrop" {{on "click" @onClose}}></div>
    </dialog>
  </template>
}
