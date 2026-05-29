import Application from 'ember-strict-application-resolver';
import { authRoutes, forRouter, initialize } from '#src/index.js';
import IntlService from 'ember-intl/services/intl';
import compatModules from '@embroider/virtual/compat-modules';
import PageTitleService from 'ember-page-title/services/page-title';
import ThemeService from '#src/services/theme.ts';
import HandleSaveService from '#src/services/handle-save.ts';
import ErrorReporterService from '#src/services/error-reporter.ts';
import EmberRouter from '@ember/routing/router';
import type Owner from '@ember/owner';
import { useLegacyStore } from '@warp-drive/legacy';
import { JSONAPICache } from '@warp-drive/json-api';
import '@warp-drive/ember/install';
import FlashMessageService from 'ember-cli-flash/services/flash-messages';

class Router extends EmberRouter {
  location = 'none';
  rootURL = '/';
}

Router.map(function () {
  this.route('dashboard', function () {
    forRouter.call(this);
  });
  authRoutes.call(this);
});

export class TestApp extends Application {
  podModulePrefix = '';
  modules = {
    './router': Router,
    './services/intl': { default: IntlService },
    './services/page-title': { default: PageTitleService },
    './services/flash-message': { default: FlashMessageService },
    // Register only the services under test manually. Using moduleRegistry()'s
    // eager import.meta.glob pulls every src module (incl. new components) into
    // the test graph, making Vite re-optimize deps mid-run → "Vite unexpectedly
    // reloaded a test" failures. See feedback-testapp-no-moduleregistry.
    './services/theme': { default: ThemeService },
    './services/handle-save': { default: HandleSaveService },
    './services/error-reporter': { default: ErrorReporterService },
    ...compatModules,
  };
}

export default class TestStore extends useLegacyStore({
  linksMode: false,
  legacyRequests: true,
  modelFragments: true,
  cache: JSONAPICache,
  schemas: [],
}) {}

export async function initializeTestApp(owner: Owner, locale: string) {
  owner.register('service:store', TestStore);
  owner.register('service:flash-messages', FlashMessageService);
  owner.register('config:environment', { flashMessageDefaults: {} });
  // eslint-disable-next-line ember/no-private-routing-service
  const router = owner.lookup('router:main') as Router;

  router.setupRouter();
  const intl = owner.lookup('service:intl');
  intl.setLocale(locale);
  intl.setOnMissingTranslation((key) => `t:${key}`);
  await initialize(owner);
}
