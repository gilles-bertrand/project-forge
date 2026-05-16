import Application from "ember-strict-application-resolver";
import IntlService from "ember-intl/services/intl";
import compatModules from "@embroider/virtual/compat-modules";
import PageTitleService from "ember-page-title/services/page-title";
import EmberRouter from "@ember/routing/router";
import type Owner from "@ember/owner";

class Router extends EmberRouter {
  location = "none";
  rootURL = "/";
}

Router.map(function () {
  this.route("dashboard", function () {
    this.route("sprints");
  });
});

export class TestApp extends Application {
  podModulePrefix = "";
  // Minimal modules — no moduleRegistry() to avoid Vite reload issues
  modules = {
    "./router": Router,
    "./services/intl": { default: IntlService },
    "./services/page-title": { default: PageTitleService },
    ...compatModules,
  };
}

const SPRINTS_FR = {
  sprints: {
    title: "Sprints",
    subtitle: "Gérez vos sprints Scrum",
    actions: {
      planSprint: "+ Planifier un sprint",
      history: "Historique",
      stopSprint: "Stopper",
      startSprint: "Planifier",
    },
    status: {
      planned: "À faire",
      active: "En cours",
      completed: "Terminé",
    },
    card: {
      goalLabel: "Objectif du sprint",
      velocityLabel: "Vélocité",
      progress: "{done}/{total} tâches ({percent}%)",
      tasksLabel: "Tâches ({count})",
      tasksEmpty: "Aucune tâche assignée",
    },
    pagination: {
      range: "Sprint {from} à {to} sur {total}",
    },
    modal: {
      add: {
        title: "Planifier un sprint",
        closeAria: "Fermer",
        name: "Nom du sprint",
        namePlaceholder: "Ex: Sprint 1 — Authentification",
        goal: "Objectif",
        goalPlaceholder: "Ex: Finaliser le flow login...",
        startDate: "Date de début",
        endDate: "Date de fin",
        velocity: "Vélocité initiale (pts)",
        cancel: "Annuler",
        submit: "Créer le sprint",
        submitting: "Création...",
        errorFallback: "Erreur lors de la création",
      },
    },
    dropHint: "Glissez une tâche ici",
  },
};

export function initializeTestApp(owner: Owner, locale = "fr-fr"): void {
  // eslint-disable-next-line ember/no-private-routing-service
  const router = owner.lookup("router:main") as Router;
  router.setupRouter();
  const intl = owner.lookup("service:intl");
  intl.addTranslations("fr-fr", SPRINTS_FR);
  intl.setLocale(locale);
  intl.setOnMissingTranslation((key: string) => `t:${key}`);
}
