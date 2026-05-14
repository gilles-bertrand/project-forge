import Application from 'ember-strict-application-resolver';
import { moduleRegistry, forRouter } from '#src/index.js';
import IntlService from 'ember-intl/services/intl';
import compatModules from '@embroider/virtual/compat-modules';
import EmberRouter from '@ember/routing/router';

class Router extends EmberRouter {
  location = 'none';
  rootURL = '/';
}

Router.map(function () {
  this.route('dashboard', { path: '/' }, function () {
    forRouter.call(this);
  });
});

export class TestApp extends Application {
  podModulePrefix = '';
  modules = {
    './router': Router,
    './services/intl': { default: IntlService },
    ...moduleRegistry(),
    ...compatModules,
  };
}
