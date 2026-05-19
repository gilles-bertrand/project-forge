import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import type SessionService from 'ember-simple-auth/services/session';
import {
  clickable,
  create,
  fillable,
  isVisible,
  text,
} from 'ember-cli-page-object';
import { createLoginValidationSchema } from './login-validation.ts';
import type z from 'zod';
import TpkForm from '@triptyk/ember-input-validation/components/tpk-form';
import { LoginChangeset } from '#src/changesets/login.ts';
import type CurrentUserService from '#src/services/current-user.ts';
import { t } from 'ember-intl';
import type { IntlService } from 'ember-intl';
import AuthLayout from '../auth-layout.gts';
import { LinkTo } from '@ember/routing';
import type RouterService from '@ember/routing/router-service';
import EyeIcon from '@triptyk/ember-input-validation/assets/icons/eye';
import EyeShutIcon from '@triptyk/ember-input-validation/assets/icons/eye-shut';

export default class LoginForm extends Component {
  @service declare session: SessionService;
  @service declare currentUser: CurrentUserService;
  @service declare intl: IntlService;
  @service declare router: RouterService;

  @tracked errorMessage = '';
  @tracked showPassword = false;

  get passwordType() {
    return this.showPassword ? 'text' : 'password';
  }

  @action
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  changeset = new LoginChangeset({
    email: 'deflorenne.amaury@triptyk.eu',
    password: '123456789',
  });

  get loginValidationSchema(): ReturnType<typeof createLoginValidationSchema> {
    return createLoginValidationSchema(this.intl);
  }

  onSubmit = (
    data: z.infer<ReturnType<typeof createLoginValidationSchema>>
  ) => {
    this.errorMessage = '';
    const result = this.session.authenticate('authenticator:jwt', data);
    result?.catch?.((error: unknown) => {
      this.errorMessage = this.translateError(error);
    });
  };

  private translateError(error: unknown): string {
    const status = this.extractStatus(error);
    if (status === 401 || status === 400 || status === 403) {
      return this.intl.t('users.forms.login.error.invalidCredentials');
    }
    return this.intl.t('users.forms.login.error.generic');
  }

  private extractStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    const candidate = error as Record<string, unknown>;

    if (typeof candidate.status === 'number') return candidate.status;
    if (typeof candidate.status === 'string') {
      const parsed = Number(candidate.status);
      if (!isNaN(parsed)) return parsed;
    }
    if (typeof candidate.statusCode === 'number') return candidate.statusCode;

    if (
      Array.isArray(candidate.errors) &&
      candidate.errors.length > 0 &&
      typeof candidate.errors[0] === 'object'
    ) {
      const firstError = candidate.errors[0] as Record<string, unknown>;
      const errStatus = Number(firstError.status);
      if (!isNaN(errStatus)) return errStatus;
    }

    if (typeof candidate.response === 'object' && candidate.response !== null) {
      const resp = candidate.response as Record<string, unknown>;
      const respStatus = Number(resp.status);
      if (!isNaN(respStatus)) return respStatus;
    }

    return undefined;
  }

  <template>
    <AuthLayout data-test-login-form>
      <h2 class="text-xl font-semibold mb-6">
        {{t "users.forms.login.title"}}
      </h2>
      {{#if this.errorMessage}}
        <div
          class="alert-danger text-sm mb-4"
          role="alert"
          data-test-login-error
        >
          {{this.errorMessage}}
        </div>
      {{/if}}
      <TpkForm
        @changeset={{this.changeset}}
        @onSubmit={{this.onSubmit}}
        @reactive={{true}}
        @validationSchema={{this.loginValidationSchema}}
        class="flex flex-col gap-4"
        as |F|
      >
        <F.TpkEmailPrefab
          @label={{t "users.forms.login.email"}}
          @validationField="email"
        />
        <div class="relative" data-test-tpk-prefab-password-container="password">
          <F.TpkInputPrefab
            @label={{t "users.forms.login.password"}}
            @validationField="password"
            @type={{this.passwordType}}
          />
          <button
            type="button"
            class="tpk-password-toggle-button"
            title={{if this.showPassword "hide" "show"}}
            {{on "click" this.togglePassword}}
            data-test-tpk-password-toggle-button
          >
            {{#if this.showPassword}}
              <EyeIcon class="tpk-password-toggle-icon" />
            {{else}}
              <EyeShutIcon class="tpk-password-toggle-icon" />
            {{/if}}
          </button>
        </div>
        <button type="submit" class="btn btn-primary w-full mt-2">
          {{t "users.forms.login.submit"}}
        </button>
      </TpkForm>
      <div class="mt-4 text-center">
        <LinkTo
          @route="forgot-password"
          class="text-sm text-primary hover:underline"
        >
          {{t "users.forms.login.forgotPassword"}}
        </LinkTo>
      </div>
    </AuthLayout>
  </template>
}

export const pageObject = create({
  scope: '[data-test-login-form]',
  email: fillable('[data-test-tpk-prefab-email-container="email"] input'),
  password: fillable(
    '[data-test-tpk-prefab-password-container="password"] input'
  ),
  submit: clickable('button[type="submit"]'),
  errorVisible: isVisible('[data-test-login-error]'),
  errorText: text('[data-test-login-error]'),
});
