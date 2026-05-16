import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { fn } from '@ember/helper';
import { t, type IntlService } from 'ember-intl';
import { service } from '@ember/service';

interface NotifPrefs {
  email: boolean;
  assignedTasks: boolean;
  weeklyDigest: boolean;
}

interface SettingsNotificationsSectionSignature {
  Args: {
    userId: string;
    initialPrefs: NotifPrefs;
  };
}

class SettingsNotificationsSection extends Component<SettingsNotificationsSectionSignature> {
  @service declare intl: IntlService;

  @tracked prefs: NotifPrefs;
  @tracked successMessage = '';

  constructor(
    owner: unknown,
    args: SettingsNotificationsSectionSignature['Args']
  ) {
    super(owner as never, args);
    this.prefs = { ...args.initialPrefs };
  }

  @action
  toggle(key: keyof NotifPrefs) {
    this.prefs = { ...this.prefs, [key]: !this.prefs[key] };
    void fetch(`/api/v1/users/${this.args.userId}/notifications`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { type: 'user-notifications', attributes: this.prefs },
      }),
    }).then(() => {
      this.successMessage = this.intl.t('settings.messages.notificationsSaved');
    });
  }

  <template>
    <div class="card bg-base-200 shadow p-6" data-test-notifications-section>
      <h2 class="text-xl font-bold mb-4">🔔
        {{t "settings.notifications.title"}}</h2>
      <div class="flex flex-col gap-3">
        <label class="flex items-center justify-between cursor-pointer">
          <span>{{t "settings.notifications.items.email"}}</span>
          <input
            type="checkbox"
            class="toggle toggle-primary"
            checked={{this.prefs.email}}
            {{on "change" (fn this.toggle "email")}}
            data-test-toggle-email
          />
        </label>
        <label class="flex items-center justify-between cursor-pointer">
          <span>{{t "settings.notifications.items.assignedTasks"}}</span>
          <input
            type="checkbox"
            class="toggle toggle-primary"
            checked={{this.prefs.assignedTasks}}
            {{on "change" (fn this.toggle "assignedTasks")}}
            data-test-toggle-assigned-tasks
          />
        </label>
        <label class="flex items-center justify-between cursor-pointer">
          <span>{{t "settings.notifications.items.weeklyDigest"}}</span>
          <input
            type="checkbox"
            class="toggle toggle-primary"
            checked={{this.prefs.weeklyDigest}}
            {{on "change" (fn this.toggle "weeklyDigest")}}
            data-test-toggle-weekly-digest
          />
        </label>
      </div>
      {{#if this.successMessage}}
        <p
          class="text-success text-sm mt-2"
          data-test-success
        >{{this.successMessage}}</p>
      {{/if}}
    </div>
  </template>
}

export default SettingsNotificationsSection;
