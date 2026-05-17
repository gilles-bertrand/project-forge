import Application from "ember-strict-application-resolver";
import { moduleRegistry, forRouter } from "#src/index.js";
import IntlService from "ember-intl/services/intl";
import compatModules from "@embroider/virtual/compat-modules";
import EmberRouter from "@ember/routing/router";
import type Owner from "@ember/owner";

class Router extends EmberRouter {
  location = "none";
  rootURL = "/";
}

Router.map(function () {
  this.route("dashboard", { path: "/" }, function () {
    forRouter.call(this);
  });
});

export class TestApp extends Application {
  podModulePrefix = "";
  modules = {
    "./router": Router,
    "./services/intl": { default: IntlService },
    ...moduleRegistry(),
    ...compatModules,
  };
}

const SHELL_FR = {
  shell: {
    addItem: {
      title: 'Que voulez-vous ajouter ?',
      project: 'Projet',
      epic: 'Epic',
      'user-story': 'User Story',
      task: 'Tâche',
      sprint: 'Sprint',
      'time-entry': 'Saisie de temps',
    },
    header: { searchPlaceholder: 'Rechercher...', recordTime: 'Enregistrer du temps', add: 'Ajouter' },
  },
};

export function initializeTestApp(owner: Owner, locale = 'fr-fr'): void {
  const intl = owner.lookup('service:intl');
  intl.addTranslations('fr-fr', SHELL_FR);
  intl.setLocale(locale);
  intl.setOnMissingTranslation((key: string) => `t:${key}`);
}
