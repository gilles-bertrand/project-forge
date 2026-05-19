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
    this.route("time-tracking");
  });
});

export class TestApp extends Application {
  podModulePrefix = "";
  modules = {
    "./router": Router,
    "./services/intl": { default: IntlService },
    "./services/page-title": { default: PageTitleService },
    ...compatModules,
  };
}

const TIME_TRACKING_FR = {
  "time-tracking": {
    title: "Suivi du temps",
    subtitle: "Heures enregistrées par projet et utilisateur",
    actions: { logTime: "+ Enregistrer" },
    summary: {
      weekHours: "Heures cette semaine",
      monthHours: "Heures ce mois",
      taskCount: "Tâches loggées",
    },
    filters: {
      project: "Projet",
      period: "Période",
      user: "Utilisateur",
      periodWeek: "Cette semaine",
      periodMonth: "Ce mois",
      periodAll: "Tous",
    },
    table: {
      date: "Date",
      task: "Tâche",
      project: "Projet",
      user: "Utilisateur",
      hours: "Heures",
      description: "Description",
      actions: "Actions",
      empty: "Aucune entrée de temps enregistrée",
    },
    modal: {
      logTime: {
        title: "Enregistrer du temps",
        closeAria: "Fermer",
        taskLabel: "Tâche",
        taskPlaceholder: "Sélectionner une tâche...",
        hoursLabel: "Durée (heures)",
        hoursPlaceholder: "Ex: 2.5",
        dateLabel: "Date",
        descriptionLabel: "Description (optionnel)",
        descriptionPlaceholder: "Ce que vous avez fait...",
        submit: "Enregistrer",
        submitting: "Enregistrement...",
        cancel: "Annuler",
        errorFallback: "Erreur lors de l'enregistrement",
        errors: {
          hoursPositive: "La durée doit être supérieure à 0",
          dateInFuture: "La date ne peut pas être dans le futur",
          taskRequired: "Veuillez sélectionner une tâche",
        },
      },
    },
  },
};

export function initializeTestApp(owner: Owner, locale = "fr-fr"): void {
  // eslint-disable-next-line ember/no-private-routing-service
  const router = owner.lookup("router:main") as Router;
  router.setupRouter();
  const intl = owner.lookup("service:intl");
  intl.addTranslations("fr-fr", TIME_TRACKING_FR);
  intl.setLocale(locale);
  intl.setOnMissingTranslation((key: string) => `t:${key}`);
}
