import { email, object, string } from 'zod';
import type z from 'zod';
import type { IntlService } from 'ember-intl';

export const createUserValidationSchema = (intl: IntlService) =>
  object({
    firstName: string(),
    lastName: string(
      intl.t('users.forms.user.validation.lastNameRequired')
    ).min(1, intl.t('users.forms.user.validation.lastNameRequired')),
    email: email(intl.t('users.forms.user.validation.invalidEmail')),
    password: string(
      intl.t('users.forms.user.validation.passwordRequired')
    ).min(8, intl.t('users.forms.user.validation.passwordTooShort')),
    id: string().optional().nullable(),
  });

export const editUserValidationSchema = (intl: IntlService) =>
  object({
    firstName: string(),
    lastName: string(
      intl.t('users.forms.user.validation.lastNameRequired')
    ).min(1, intl.t('users.forms.user.validation.lastNameRequired')),
    password: string().optional().nullable(),
    email: email(intl.t('users.forms.user.validation.invalidEmail')),
    id: string(),
  });

export type ValidatedUser = z.infer<
  ReturnType<typeof createUserValidationSchema>
>;

export type UpdatedUser = z.infer<ReturnType<typeof editUserValidationSchema>>;

// Default export so the addon's auto-generated `_app_/` re-export
// (`export { default } from "..."`) resolves. Validation files are not Ember
// components but the rollup `addon.appReexports(['components/**/*.js'])`
// pattern still emits a default-import wrapper for them.
export default { createUserValidationSchema, editUserValidationSchema };
