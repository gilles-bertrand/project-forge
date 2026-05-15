import Application from 'ember-strict-application-resolver';

import IntlService from 'ember-intl/services/intl';
import compatModules from '@embroider/virtual/compat-modules';
import PageTitleService from 'ember-page-title/services/page-title';
import EmberRouter from '@ember/routing/router';
import type Owner from '@ember/owner';

class Router extends EmberRouter {
  location = 'none';
  rootURL = '/';
}

Router.map(function () {
  this.route('dashboard', function () {
    this.route('backlog');
    this.route('user-story-map');
  });
});

export class TestApp extends Application {
  podModulePrefix = '';
  // Minimal modules — services are registered individually in each test.
  // We avoid moduleRegistry() to prevent eager import.meta.glob that triggers Vite reloads.
  modules = {
    './router': Router,
    './services/intl': { default: IntlService },
    './services/page-title': { default: PageTitleService },
    ...compatModules,
  };
}

const BACKLOG_FR = {
  backlog: {
    title: 'Backlog',
    subtitle: 'Tâches non assignées ({count})',
    emptyState: 'Aucune tâche dans le backlog.',
    newTask: '+ Nouvelle tâche',
    newTaskDisabled: 'Disponible en P6',
    noProjectSelected: 'Sélectionnez un projet.',
    dragHint: 'Glissez vers un sprint (P8)',
    taskRow: { points: '{count} pts', linkedToUS: '→ {title}' },
    filters: {
      all: 'Tous',
      nature: {
        Bug: 'Bug',
        Feature: 'Feature',
        Maintenance: 'Maintenance',
        Hotfix: 'Hotfix',
        Refacto: 'Refacto',
        Techdebt: 'Techdebt',
        Spike: 'Spike',
        Review: 'Review',
        Deployment: 'Deployment',
        Infra: 'Infra',
      },
      type: {
        Frontend: 'Frontend',
        Backend: 'Backend',
        Database: 'Database',
        UX: 'UX',
        Analyse: 'Analyse',
        DevOps: 'DevOps',
        API: 'API',
        Security: 'Security',
        Testing: 'Testing',
      },
    },
    status: { todo: 'À faire', 'in-progress': 'En cours', done: 'Terminé' },
    modal: {
      addEpic: {
        title: 'Nouvelle épique',
        closeAria: 'Fermer',
        project: 'Projet',
        name: 'Titre',
        namePlaceholder: 'Ex: Système...',
        description: 'Description',
        descriptionPlaceholder: 'Objectifs...',
        status: 'Statut initial',
        cancel: 'Annuler',
        submit: "Créer l'épique",
        submitting: 'Création...',
        errorFallback: 'Erreur',
      },
      addUserStory: {
        title: 'Nouvelle User Story',
        closeAria: 'Fermer',
        name: 'Titre',
        namePlaceholder: 'En tant que...',
        description: 'Description',
        descriptionPlaceholder: 'Détails...',
        parentEpic: 'Épique (optionnel)',
        parentEpicPlaceholder: 'Aucune épique',
        status: 'Statut',
        points: 'Points',
        priority: 'Priorité',
        cancel: 'Annuler',
        submit: 'Créer la User Story',
        submitting: 'Création...',
        errorFallback: 'Erreur',
      },
    },
  },
  userStoryMap: {
    title: 'User Story Map',
    subtitle: 'Hiérarchie : Épiques → US → Tâches',
    newEpic: '+ Nouvelle épique',
    newUserStory: '+ Nouvelle US',
    newTask: '+ Nouvelle tâche',
    epicLabel: 'Épique',
    usCount: 'US',
    taskCount: 'tâches',
    tasks: 'tâches',
    noUserStories: 'Aucune user story.',
    noTasks: 'Aucune tâche.',
    addUserStoryInline: 'Ajouter une US',
    emptyState: 'Aucune épique.',
  },
};

export function initializeTestApp(owner: Owner, locale = 'fr-fr'): void {
  // eslint-disable-next-line ember/no-private-routing-service
  const router = owner.lookup('router:main') as Router;
  router.setupRouter();
  const intl = owner.lookup('service:intl');
  intl.addTranslations('fr-fr', BACKLOG_FR);
  intl.setLocale(locale);
  intl.setOnMissingTranslation((key: string) => `t:${key}`);
}
