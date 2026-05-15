import Application from "ember-strict-application-resolver";
import { moduleRegistry } from "#src/index.ts";
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
    this.route("projects");
    this.route("kanban");
  });
});

export class TestApp extends Application {
  podModulePrefix = "";
  modules = {
    "./router": Router,
    "./services/intl": { default: IntlService },
    "./services/page-title": { default: PageTitleService },
    ...moduleRegistry(),
    ...compatModules,
  };
}

const TRANSLATIONS_FR = {
  projects: {
    title: "Projets",
    subtitle: "Gérez tous vos projets Scrum",
    newProject: "+ Nouveau projet",
    emptyState: "Aucun projet pour le moment.",
    card: {
      userStories: "User Stories",
      currentSprint: "Sprint en cours",
      createdOn: "Créé le",
    },
    status: {
      planned: "Planifié",
      active: "Actif",
      paused: "En pause",
      completed: "Terminé",
      cancelled: "Annulé",
      archived: "Archivé",
    },
    modal: {
      add: {
        title: "Nouveau projet",
        closeAria: "Fermer",
        name: "Nom du projet",
        namePlaceholder: "Ex: E-Commerce Platform",
        status: "Statut initial",
        description: "Description",
        descriptionPlaceholder: "Description du projet...",
        lead: "Responsable du projet",
        leadPlaceholder: "Sélectionner un responsable",
        members: "Membres de l'équipe",
        membersWithCount: "Membres de l'équipe ({count} sélectionnés)",
        cancel: "Annuler",
        submit: "Créer le projet",
        submitting: "Création...",
        errorFallback: "Erreur lors de la création",
      },
      detail: {
        closeAria: "Fermer",
        responsible: "Responsable: {name}",
        description: "Description",
        progress: "Progression du projet",
        userStoriesCompleted: "User Stories complétées",
        userStoriesRatio: "{done} / {total} User Stories",
        stats: {
          title: "Statistiques",
          epics: "Épiques",
          userStories: "User Stories",
          tasks: "Tâches",
          sprints: "Sprints",
          hint: "Statistiques détaillées disponibles en P10",
        },
        team: "Équipe",
        teamPlaceholder:
          "Liste des membres disponible quand la lib P5+ sera prête.",
        close: "Fermer",
        viewKanban: "Voir le Kanban",
      },
    },
  },
};

const TRANSLATIONS_EN = {
  projects: {
    title: "Projects",
    subtitle: "Manage all your Scrum projects",
    newProject: "+ New project",
    emptyState: "No projects yet.",
    card: {
      userStories: "User Stories",
      currentSprint: "Current Sprint",
      createdOn: "Created on",
    },
    status: {
      planned: "Planned",
      active: "Active",
      paused: "Paused",
      completed: "Completed",
      cancelled: "Cancelled",
      archived: "Archived",
    },
    modal: {
      add: {
        title: "New project",
        closeAria: "Close",
        name: "Project name",
        namePlaceholder: "Ex: E-Commerce Platform",
        status: "Initial status",
        description: "Description",
        descriptionPlaceholder: "Project description...",
        lead: "Project lead",
        leadPlaceholder: "Select a lead",
        members: "Team members",
        membersWithCount: "Team members ({count} selected)",
        cancel: "Cancel",
        submit: "Create project",
        submitting: "Creating...",
        errorFallback: "Error during creation",
      },
      detail: {
        closeAria: "Close",
        responsible: "Lead: {name}",
        description: "Description",
        progress: "Project progress",
        userStoriesCompleted: "User Stories completed",
        userStoriesRatio: "{done} / {total} User Stories",
        stats: {
          title: "Statistics",
          epics: "Epics",
          userStories: "User Stories",
          tasks: "Tasks",
          sprints: "Sprints",
          hint: "Detailed statistics available in P10",
        },
        team: "Team",
        teamPlaceholder: "Member list available when P5+ lib is ready.",
        close: "Close",
        viewKanban: "View Kanban",
      },
    },
  },
};

export function initializeTestApp(owner: Owner, locale: string): void {
  // eslint-disable-next-line ember/no-private-routing-service
  const router = owner.lookup("router:main") as Router;
  router.setupRouter();
  const intl = owner.lookup("service:intl");
  intl.addTranslations("fr-fr", TRANSLATIONS_FR);
  intl.addTranslations("en-us", TRANSLATIONS_EN);
  intl.setLocale(locale);
  intl.setOnMissingTranslation((key) => `t:${key}`);
}
