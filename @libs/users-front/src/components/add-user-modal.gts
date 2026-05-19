import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t, type IntlService } from 'ember-intl';
import type SessionService from 'ember-simple-auth/services/session';

type UserRole =
  | 'Product Owner'
  | 'Scrum Master'
  | 'Developer'
  | 'Designer UX'
  | 'QA Tester'
  | 'DevOps';

const ROLE_VALUES: UserRole[] = [
  'Product Owner',
  'Scrum Master',
  'Developer',
  'Designer UX',
  'QA Tester',
  'DevOps',
];

const COLOR_VALUES = [
  '#7FDBCA',
  '#F48FB1',
  '#A78BFA',
  '#FBBF24',
  '#60A5FA',
  '#F97316',
  '#34D399',
] as const;

interface AddUserModalSignature {
  Args: { onClose: () => void };
}

export default class AddUserModal extends Component<AddUserModalSignature> {
  @service declare session: SessionService;
  @service declare intl: IntlService;

  @tracked firstName = '';
  @tracked lastName = '';
  @tracked email = '';
  @tracked password = '';
  @tracked role: UserRole = 'Developer';
  @tracked color: string = COLOR_VALUES[0];
  @tracked submitting = false;
  @tracked error = '';

  get roleOptions(): UserRole[] {
    return ROLE_VALUES;
  }

  get colorOptions(): readonly string[] {
    return COLOR_VALUES;
  }

  get canSubmit(): boolean {
    return (
      this.firstName.trim().length > 0 &&
      this.lastName.trim().length > 0 &&
      /\S+@\S+\.\S+/.test(this.email) &&
      this.password.length >= 8 &&
      !this.submitting
    );
  }

  get cannotSubmit(): boolean {
    return !this.canSubmit;
  }

  isRoleSelected = (v: UserRole) => this.role === v;
  isColorSelected = (v: string) => this.color === v;

  @action onFirstNameInput(e: Event) {
    this.firstName = (e.target as HTMLInputElement).value;
  }
  @action onLastNameInput(e: Event) {
    this.lastName = (e.target as HTMLInputElement).value;
  }
  @action onEmailInput(e: Event) {
    this.email = (e.target as HTMLInputElement).value;
  }
  @action onPasswordInput(e: Event) {
    this.password = (e.target as HTMLInputElement).value;
  }
  @action onRoleChange(e: Event) {
    this.role = (e.target as HTMLSelectElement).value as UserRole;
  }
  selectColorHandler = (c: string) => () => {
    this.color = c;
  };

  @action async submit(e: Event) {
    e.preventDefault();
    if (!this.canSubmit) return;
    this.submitting = true;
    this.error = '';
    try {
      const auth = this.session.data.authenticated as
        | { data?: { accessToken?: string } }
        | undefined;
      const accessToken = auth?.data?.accessToken;
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          data: {
            attributes: {
              email: this.email.trim(),
              firstName: this.firstName.trim(),
              lastName: this.lastName.trim(),
              password: this.password,
              role: this.role,
              color: this.color,
            },
          },
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          errors?: { detail?: string; title?: string }[];
        };
        throw new Error(
          body.errors?.[0]?.detail ??
            body.errors?.[0]?.title ??
            `HTTP ${res.status}`
        );
      }
      this.args.onClose();
      // Hard reload the users list page so the new user appears.
      if (window.location.pathname.startsWith('/users')) {
        window.location.reload();
      }
    } catch (err: unknown) {
      this.error =
        err instanceof Error
          ? err.message
          : this.intl.t('users.modal.add.errorFallback');
    } finally {
      this.submitting = false;
    }
  }

  <template>
    <dialog class="modal modal-open" data-test-add-user-modal>
      <div class="modal-box max-w-2xl bg-base-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">{{t "users.modal.add.title"}}</h3>
          <button
            type="button"
            class="btn btn-sm btn-circle btn-ghost"
            aria-label={{t "users.modal.add.closeAria"}}
            {{on "click" @onClose}}
          >✕</button>
        </div>

        <form {{on "submit" this.submit}} class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label text-sm font-medium" for="user-firstName">
                {{t "users.modal.add.firstName"}}
                *
              </label>
              <input
                id="user-firstName"
                type="text"
                class="input input-bordered w-full"
                placeholder={{t "users.modal.add.firstNamePlaceholder"}}
                value={{this.firstName}}
                {{on "input" this.onFirstNameInput}}
                required
              />
            </div>
            <div>
              <label class="label text-sm font-medium" for="user-lastName">
                {{t "users.modal.add.lastName"}}
                *
              </label>
              <input
                id="user-lastName"
                type="text"
                class="input input-bordered w-full"
                placeholder={{t "users.modal.add.lastNamePlaceholder"}}
                value={{this.lastName}}
                {{on "input" this.onLastNameInput}}
                required
              />
            </div>
          </div>

          <div>
            <label class="label text-sm font-medium" for="user-email">
              {{t "users.modal.add.email"}}
              *
            </label>
            <input
              id="user-email"
              type="email"
              class="input input-bordered w-full"
              placeholder={{t "users.modal.add.emailPlaceholder"}}
              value={{this.email}}
              {{on "input" this.onEmailInput}}
              required
            />
          </div>

          <div>
            <label class="label text-sm font-medium" for="user-password">
              {{t "users.modal.add.password"}}
              *
            </label>
            <input
              id="user-password"
              type="password"
              class="input input-bordered w-full"
              placeholder={{t "users.modal.add.passwordPlaceholder"}}
              value={{this.password}}
              {{on "input" this.onPasswordInput}}
              required
              minlength="8"
            />
          </div>

          <div>
            <label class="label text-sm font-medium" for="user-role">
              {{t "users.modal.add.role"}}
              *
            </label>
            <select
              id="user-role"
              class="select select-bordered w-full"
              {{on "change" this.onRoleChange}}
            >
              {{#each this.roleOptions as |opt|}}
                <option value={{opt}} selected={{this.isRoleSelected opt}}>
                  {{opt}}
                </option>
              {{/each}}
            </select>
          </div>

          <div>
            <span class="label text-sm font-medium">{{t
                "users.modal.add.color"
              }}</span>
            <div class="flex flex-wrap gap-2 mt-1">
              {{#each this.colorOptions as |c|}}
                {{! template-lint-disable no-inline-styles style-concatenation }}
                <button
                  type="button"
                  class="w-8 h-8 rounded-full border-2 transition-all
                    {{if
                      (this.isColorSelected c)
                      'border-primary scale-110'
                      'border-transparent'
                    }}"
                  style="background-color: {{c}}"
                  aria-label="Color {{c}}"
                  {{on "click" (this.selectColorHandler c)}}
                ></button>
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
            >{{t "users.modal.add.cancel"}}</button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={{this.cannotSubmit}}
            >
              {{if
                this.submitting
                (t "users.modal.add.submitting")
                (t "users.modal.add.submit")
              }}
            </button>
          </div>
        </form>
      </div>
      <button
        type="button"
        class="modal-backdrop"
        aria-label={{t "users.modal.add.closeAria"}}
        {{on "click" @onClose}}
      ></button>
    </dialog>
  </template>
}
