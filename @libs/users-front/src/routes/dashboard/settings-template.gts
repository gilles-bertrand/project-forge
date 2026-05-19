import type { TOC } from '@ember/component/template-only';
import { t } from 'ember-intl';
import SettingsProfileSection from '#src/components/settings/settings-profile-section.gts';
import SettingsNotificationsSection from '#src/components/settings/settings-notifications-section.gts';
import SettingsSecuritySection from '#src/components/settings/settings-security-section.gts';
import type DashboardSettingsRoute from './settings.gts';

interface DashboardSettingsTemplateSignature {
  Args: { model: Awaited<ReturnType<DashboardSettingsRoute['model']>> };
}

const DashboardSettingsTemplate: TOC<DashboardSettingsTemplateSignature> =
  <template>
    <div class="space-y-6 max-w-3xl">
      <header>
        <h1 class="text-3xl font-bold" data-test-title>{{t
            "settings.title"
          }}</h1>
        <p class="opacity-60">{{t "settings.subtitle"}}</p>
      </header>
      <SettingsProfileSection
        @userId={{@model.userId}}
        @firstName={{@model.firstName}}
        @lastName={{@model.lastName}}
        @email={{@model.email}}
        @role={{@model.role}}
      />
      <SettingsNotificationsSection
        @userId={{@model.userId}}
        @initialPrefs={{@model.notifPrefs}}
      />
      <SettingsSecuritySection @userId={{@model.userId}} />
    </div>
  </template>;

export default DashboardSettingsTemplate;
