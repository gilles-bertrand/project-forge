import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
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

export default class LoginForm extends Component {
  @service declare session: SessionService;
  @service declare currentUser: CurrentUserService;
  @service declare intl: IntlService;
  @service declare router: RouterService;

  @tracked errorMessage = '';

  changeset = new LoginChangeset({
    email: 'deflorenne.amaury@triptyk.eu',
    password: '123456789',
  });

  get loginValidationSchema(): ReturnType<typeof createLoginValidationSchema> {
    return createLoginValidationSchema(this.intl);
  }

  onSubmit = async (
    data: z.infer<ReturnType<typeof createLoginValidationSchema>>
  ) => {
    this.errorMessage = '';
    try {
      await this.session.authenticate('authenticator:jwt', data);
    } catch (error) {
      this.errorMessage = this.translateError(error);
    }
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
    const candidate = error as { status?: unknown; statusCode?: unknown };
    if (typeof candidate.status === 'number') return candidate.status;
    if (typeof candidate.statusCode === 'number') return candidate.statusCode;
    return undefined;
  }

  <template>
    <AuthLayout data-test-login-form>
      <h2 class="text-xl font-semibold mb-6">
        {{t "users.forms.login.title"}}
      </h2>
      {{#if this.errorMessage}}
        <div
          class="alert alert-error text-sm mb-4"
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
        <F.TpkPasswordPrefab
          @label={{t "users.forms.login.password"}}
          @validationField="password"
        />
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
