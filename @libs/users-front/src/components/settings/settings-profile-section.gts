import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t, type IntlService } from 'ember-intl';
import { service } from '@ember/service';

interface SettingsProfileSectionSignature {
  Args: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

class SettingsProfileSection extends Component<SettingsProfileSectionSignature> {
  @service declare intl: IntlService;

  @tracked firstName = '';
  @tracked lastName = '';
  @tracked submitting = false;
  @tracked successMessage = '';
  @tracked errorMessage = '';

  constructor(owner: unknown, args: SettingsProfileSectionSignature['Args']) {
    super(owner as never, args);
    this.firstName = args.firstName;
    this.lastName = args.lastName;
  }

  get canSave(): boolean {
    return (
      this.firstName.trim().length > 0 &&
      this.lastName.trim().length > 0 &&
      !this.submitting
    );
  }

  get cannotSave(): boolean {
    return !this.canSave;
  }

  @action
  onFirstNameInput(e: Event) {
    this.firstName = (e.target as HTMLInputElement).value;
  }

  @action
  onLastNameInput(e: Event) {
    this.lastName = (e.target as HTMLInputElement).value;
  }

  @action
  async save(e: Event) {
    e.preventDefault();
    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';
    try {
      await fetch(`/api/v1/users/${this.args.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            type: 'users',
            id: this.args.userId,
            attributes: { firstName: this.firstName, lastName: this.lastName },
          },
        }),
      });
      this.successMessage = this.intl.t('settings.messages.profileSaved');
    } catch {
      this.errorMessage = this.intl.t('settings.profile.errors.serverError');
    } finally {
      this.submitting = false;
    }
  }

  <template>
    <div class="card bg-base-200 shadow p-6" data-test-profile-section>
      <h2 class="text-xl font-bold mb-4">{{t "settings.profile.title"}}</h2>
      <form {{on "submit" this.save}} class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label text-sm font-medium" for="profile-firstName">{{t
                "settings.profile.fields.firstName"
              }}</label>
            <input
              id="profile-firstName"
              type="text"
              class="input input-bordered w-full"
              value={{this.firstName}}
              {{on "input" this.onFirstNameInput}}
            />
          </div>
          <div>
            <label class="label text-sm font-medium" for="profile-lastName">{{t
                "settings.profile.fields.lastName"
              }}</label>
            <input
              id="profile-lastName"
              type="text"
              class="input input-bordered w-full"
              value={{this.lastName}}
              {{on "input" this.onLastNameInput}}
            />
          </div>
        </div>
        <div>
          <label class="label text-sm font-medium" for="profile-email">{{t
              "settings.profile.fields.email"
            }}</label>
          <input
            id="profile-email"
            type="email"
            class="input input-bordered w-full opacity-60"
            value={{@email}}
            disabled
          />
        </div>
        <div>
          <label class="label text-sm font-medium" for="profile-role">{{t
              "settings.profile.fields.role"
            }}</label>
          <input
            id="profile-role"
            type="text"
            class="input input-bordered w-full opacity-60"
            value={{@role}}
            disabled
          />
        </div>
        {{#if this.successMessage}}
          <p
            class="text-success text-sm"
            data-test-success
          >{{this.successMessage}}</p>
        {{/if}}
        {{#if this.errorMessage}}
          <p
            class="text-error text-sm"
            data-test-error
          >{{this.errorMessage}}</p>
        {{/if}}
        <div class="flex justify-end">
          <button
            type="submit"
            class="btn btn-primary"
            disabled={{this.cannotSave}}
          >
            {{if
              this.submitting
              (t "settings.profile.actions.saving")
              (t "settings.profile.actions.save")
            }}
          </button>
        </div>
      </form>
    </div>
  </template>
}

export default SettingsProfileSection;
