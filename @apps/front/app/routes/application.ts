import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type { IntlService } from 'ember-intl';
import { setupWorker } from 'msw/browser';
import { initialize as initializeUserLib } from '@libs/users-front';
import { getOwner } from '@ember/-internals/owner';
import type SessionService from '@apps/front/services/session';
import allUsersHandlers from '@libs/users-front/http-mocks/all';
import type ThemeService from '@libs/shared-front/services/theme';
import setTheme from '../utils/set-theme';
import translationsForFrFr from 'virtual:ember-intl/translations/fr-fr';
import translationsForEnUs from 'virtual:ember-intl/translations/en-us';

export default class ApplicationRoute extends Route {
  @service declare intl: IntlService;
  @service declare session: SessionService;
  @service declare theme: ThemeService;
  worker?: ReturnType<typeof setupWorker>;

  async beforeModel() {
    this.theme.setup();
    setTheme();
    this.intl.setLocale('en-us');

    this.intl.addTranslations('fr-fr', translationsForFrFr);
    this.intl.addTranslations('en-us', translationsForEnUs);

    // Skip MSW when running against real backend (e2e tests)
    if (import.meta.env.VITE_MOCK_API !== 'false') {
      const worker = setupWorker(...allUsersHandlers);
      this.worker = worker;
      await worker.start({
        onUnhandledRequest: 'bypass',
      });
    }

    await initializeUserLib(getOwner(this)!);
  }

  willDestroy() {
    this.worker?.stop();
    return super.willDestroy();
  }
}
