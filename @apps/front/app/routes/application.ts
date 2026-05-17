import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type { IntlService } from 'ember-intl';
import { setupWorker } from 'msw/browser';
import { initialize as initializeUserLib } from '@libs/users-front';
import { initialize as initializeShellLib } from '@libs/shell-front';
import { initialize as initializeProjectsLib } from '@libs/projects-front';
import { initialize as initializeBacklogLib } from '@libs/backlog-front';
import { initialize as initializeSprintsLib } from '@libs/sprints-front';
import { initialize as initializeTimeTrackingLib } from '@libs/time-tracking-front';
import { initialize as initializeDashboardLib } from '@libs/dashboard-front';
import { getOwner } from '@ember/-internals/owner';
import type SessionService from '@apps/front/services/session';
import allUsersHandlers from '@libs/users-front/http-mocks/all';
import allProjectsHandlers from '@libs/projects-front/http-mocks/all';
import { allBacklogHandlers } from '@libs/backlog-front/http-mocks/all';
import { allSprintsHandlers } from '@libs/sprints-front/http-mocks/all';
import { allTimeEntriesHandlers } from '@libs/time-tracking-front/http-mocks/time-entries';
import { searchHandlers } from '@libs/shell-front/http-mocks/search';
import type ThemeService from '@libs/shared-front/services/theme';
import translationsForFrFr from 'virtual:ember-intl/translations/fr-fr';
import translationsForEnUs from 'virtual:ember-intl/translations/en-us';

export default class ApplicationRoute extends Route {
  @service declare intl: IntlService;
  @service declare session: SessionService;
  @service declare theme: ThemeService;
  worker?: ReturnType<typeof setupWorker>;

  async beforeModel() {
    this.theme.setup();
    this.intl.setLocale('en-us');

    this.intl.addTranslations('fr-fr', translationsForFrFr);
    this.intl.addTranslations('en-us', translationsForEnUs);

    // Skip MSW when running against real backend (e2e tests)
    if (import.meta.env.VITE_MOCK_API !== 'false') {
      const worker = setupWorker(
        ...allUsersHandlers,
        ...allProjectsHandlers,
        ...allBacklogHandlers,
        ...allSprintsHandlers,
        ...allTimeEntriesHandlers,
        ...searchHandlers
      );
      this.worker = worker;
      await worker.start({
        onUnhandledRequest: 'bypass',
      });
    }

    await initializeUserLib(getOwner(this)!);
    await initializeShellLib(getOwner(this)!);
    await initializeProjectsLib(getOwner(this)!);
    await initializeBacklogLib(getOwner(this)!);
    await initializeSprintsLib(getOwner(this)!);
    await initializeTimeTrackingLib(getOwner(this)!);
    await initializeDashboardLib(getOwner(this)!);
  }

  willDestroy() {
    this.worker?.stop();
    return super.willDestroy();
  }
}
