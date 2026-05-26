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
    this.route("backlog");
    this.route("sprints");
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
      editAria: "Modifier ce projet",
      deleteAria: "Supprimer ce projet",
      epicsLabel: "Épiques",
      userStoriesLabel: "US",
      tasksLabel: "Tâches",
      sprintsLabel: "Sprints",
      moreMembers: "membres supplémentaires",
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
      edit: {
        title: "Modifier le projet",
        submit: "Enregistrer",
        submitting: "Enregistrement...",
        errorFallback: "Erreur lors de la mise à jour",
      },
    },
    action: {
      backlogAria: "Voir le backlog",
      kanbanAria: "Voir le kanban",
      userStoryMapAria: "Voir la user story map",
      sprintsAria: "Voir les sprints",
    },
    view: {
      grid: "Grille",
      gridAria: "Affichage en grille",
      list: "Liste",
      listAria: "Affichage en liste",
    },
    table: {
      headers: {
        name: "Nom",
        status: "Statut",
        responsible: "Responsable",
        members: "Membres",
        createdAt: "Créé le",
        actions: "Raccourcis",
      },
      actions: {
        edit: "Modifier",
        delete: "Supprimer",
        backlog: "Backlog",
        kanban: "Kanban",
        sprints: "Sprints",
      },
    },
    delete: {
      confirm: {
        title: "Supprimer ce projet ?",
        body: "Cette action est irréversible.",
        cancel: "Annuler",
        confirm: "Supprimer",
      },
      error: {
        generic: "Erreur lors de la suppression du projet.",
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
      editAria: "Edit this project",
      deleteAria: "Delete this project",
      epicsLabel: "Epics",
      userStoriesLabel: "US",
      tasksLabel: "Tasks",
      sprintsLabel: "Sprints",
      moreMembers: "more members",
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
      edit: {
        title: "Edit project",
        submit: "Save",
        submitting: "Saving...",
        errorFallback: "Error during update",
      },
    },
    action: {
      backlogAria: "View backlog",
      kanbanAria: "View kanban",
      userStoryMapAria: "View user story map",
      sprintsAria: "View sprints",
    },
    view: {
      grid: "Grid",
      gridAria: "Grid view",
      list: "List",
      listAria: "List view",
    },
    table: {
      headers: {
        name: "Name",
        status: "Status",
        responsible: "Lead",
        members: "Members",
        createdAt: "Created",
        actions: "Shortcuts",
      },
      actions: {
        edit: "Edit",
        delete: "Delete",
        backlog: "Backlog",
        kanban: "Kanban",
        sprints: "Sprints",
      },
    },
    delete: {
      confirm: {
        title: "Delete this project?",
        body: "This action is irreversible.",
        cancel: "Cancel",
        confirm: "Delete",
      },
      error: {
        generic: "Error while deleting the project.",
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
