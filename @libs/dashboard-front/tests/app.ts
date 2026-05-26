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
    this.route("index", { path: "/" });
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

const DASHBOARD_FR = {
  dashboard: {
    title: "Tableau de bord",
    subtitle: "Sprint en cours - Tâches du sprint",
    kpi: {
      completedTasks: "Tâches terminées",
      hoursWorked: "Heures travaillées",
      storyPoints: "Points d'efforts",
    },
    sprintTasks: "Tâches du sprint ({count})",
    noActiveSprint: "Aucun sprint actif",
    noSprintTasks: "Aucune tâche dans ce sprint.",
    noProject: {
      title: "Aucun projet sélectionné",
      subtitle: "Sélectionnez un projet ou créez-en un pour commencer.",
      cta: { create: "Créer un projet", select: "Sélectionner" },
    },
    noSprint: {
      title: "Projet : {name}",
      subtitle: "Aucun sprint actif sur ce projet.",
      cta: {
        startSprint: "Démarrer un sprint",
        viewBacklog: "Voir le backlog",
      },
    },
    counts: {
      tasksInProgress: "Tâches en cours",
      tasksDone: "Tâches terminées",
    },
  },
};

export function initializeTestApp(owner: Owner, locale = "fr-fr"): void {
  // eslint-disable-next-line ember/no-private-routing-service
  const router = owner.lookup("router:main") as Router;
  router.setupRouter();
  const intl = owner.lookup("service:intl");
  intl.addTranslations("fr-fr", DASHBOARD_FR);
  intl.setLocale(locale);
  intl.setOnMissingTranslation((key: string) => `t:${key}`);
}
