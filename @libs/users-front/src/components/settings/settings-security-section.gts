import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t, type IntlService } from 'ember-intl';
import { service } from '@ember/service';

interface SettingsSecuritySectionSignature {
  Args: {
    userId: string;
  };
}

class SettingsSecuritySection extends Component<SettingsSecuritySectionSignature> {
  @service declare intl: IntlService;

  @tracked currentPassword = '';
  @tracked newPassword = '';
  @tracked confirmPassword = '';
  @tracked submitting = false;
  @tracked successMessage = '';
  @tracked errorMessage = '';

  get passwordMismatch(): boolean {
    return (
      this.newPassword.length > 0 &&
      this.confirmPassword.length > 0 &&
      this.newPassword !== this.confirmPassword
    );
  }

  get newPasswordTooShort(): boolean {
    return this.newPassword.length > 0 && this.newPassword.length < 8;
  }

  get canSubmit(): boolean {
    return (
      this.currentPassword.length > 0 &&
      this.newPassword.length >= 8 &&
      this.newPassword === this.confirmPassword &&
      !this.submitting
    );
  }

  get cannotSubmit(): boolean {
    return !this.canSubmit;
  }

  @action
  onCurrentInput(e: Event) {
    this.currentPassword = (e.target as HTMLInputElement).value;
  }

  @action
  onNewInput(e: Event) {
    this.newPassword = (e.target as HTMLInputElement).value;
  }

  @action
  onConfirmInput(e: Event) {
    this.confirmPassword = (e.target as HTMLInputElement).value;
  }

  @action
  async changePassword(e: Event) {
    e.preventDefault();
    if (!this.canSubmit) return;
    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';
    try {
      const res = await fetch(
        `/api/v1/users/${this.args.userId}/change-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: {
              attributes: {
                currentPassword: this.currentPassword,
                newPassword: this.newPassword,
              },
            },
          }),
        }
      );
      if (!res.ok) {
        throw new Error('error');
      }
      this.successMessage = this.intl.t('settings.messages.passwordChanged');
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    } catch {
      this.errorMessage = this.intl.t('settings.security.errors.serverError');
    } finally {
      this.submitting = false;
    }
  }

  <template>
    <div class="card bg-base-200 shadow p-6" data-test-security-section>
      <h2 class="text-xl font-bold mb-4">🔒 {{t "settings.security.title"}}</h2>
      <form {{on "submit" this.changePassword}} class="flex flex-col gap-4">
        <div>
          <label class="label text-sm" for="sec-current">{{t
              "settings.security.fields.currentPassword"
            }}</label>
          <input
            id="sec-current"
            type="password"
            class="input input-bordered w-full"
            value={{this.currentPassword}}
            {{on "input" this.onCurrentInput}}
            data-test-current-password
          />
        </div>
        <div>
          <label class="label text-sm" for="sec-new">{{t
              "settings.security.fields.newPassword"
            }}</label>
          <input
            id="sec-new"
            type="password"
            class="input input-bordered w-full"
            value={{this.newPassword}}
            {{on "input" this.onNewInput}}
            data-test-new-password
          />
          {{#if this.newPasswordTooShort}}
            <p class="text-error text-xs mt-1" data-test-error-short>{{t
                "settings.security.errors.passwordTooShort"
              }}</p>
          {{/if}}
        </div>
        <div>
          <label class="label text-sm" for="sec-confirm">{{t
              "settings.security.fields.confirmPassword"
            }}</label>
          <input
            id="sec-confirm"
            type="password"
            class="input input-bordered w-full"
            value={{this.confirmPassword}}
            {{on "input" this.onConfirmInput}}
            data-test-confirm-password
          />
          {{#if this.passwordMismatch}}
            <p class="text-error text-xs mt-1" data-test-error-mismatch>{{t
                "settings.security.errors.passwordMismatch"
              }}</p>
          {{/if}}
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
            disabled={{this.cannotSubmit}}
          >
            {{if
              this.submitting
              (t "settings.security.actions.changing")
              (t "settings.security.actions.changePassword")
            }}
          </button>
        </div>
      </form>
    </div>
  </template>
}

export default SettingsSecuritySection;
