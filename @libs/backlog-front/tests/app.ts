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
    subtitleStories: '{count} user stories',
    emptyState: 'Aucune tâche dans le backlog.',
    emptyStateStories: 'Aucune user story dans le backlog.',
    newTask: '+ Nouvelle tâche',
    newUserStory: '+ Nouvelle US',
    tasksTitle: 'Tâches attachées',
    collapseAll: 'Tout réduire',
    expandAll: 'Tout déployer',
    newTaskDisabled: 'Disponible en P6',
    noProjectSelected: 'Sélectionnez un projet.',
    dragHint: 'Glissez vers un sprint (P8)',
    card: {
      tasksCount: 'tâches',
      noEpic: 'Sans épique',
      toggleTasksAria: 'Afficher ou masquer les tâches',
    },
    groupToggle: { grouped: 'Grouper par épique', flat: 'Vue à plat' },
    taskRow: { points: '{count} pts', linkedToUS: '→ {title}' },
    filters: {
      all: 'Tous',
      allEpics: 'Toutes les épiques',
      epicSearchPlaceholder: 'Rechercher une épique…',
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
    status: {
      todo: 'À faire',
      'in-progress': 'En cours',
      done: 'Terminé',
      suggested: 'Sandbox',
      accepted: 'Backlog',
      estimated: 'Backlog estimé',
      planned: 'Sprint Backlog',
    },
    priority: {
      Basse: 'Basse',
      Moyenne: 'Moyenne',
      Haute: 'Haute',
      Critique: 'Critique',
    },
    epicType: {
      functional: 'Fonctionnelle',
      architectural: 'Architecturale',
    },
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
        type: 'Type',
        color: 'Couleur',
        cancel: 'Annuler',
        submit: "Créer l'épique",
        submitting: 'Création...',
        errorFallback: 'Erreur',
      },
      editEpic: {
        title: "Modifier l'épique",
        closeAria: 'Fermer',
        name: 'Titre',
        description: 'Description',
        status: 'Statut',
        type: 'Type',
        color: 'Couleur',
        cancel: 'Annuler',
        submit: 'Enregistrer',
        submitting: 'Enregistrement...',
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
      addTask: {
        title: 'Nouvelle tâche',
        closeAria: 'Fermer',
        name: 'Titre',
        namePlaceholder: 'Ex: Implémenter...',
        description: 'Description',
        descriptionPlaceholder: 'Détails de la tâche...',
        type: 'Type',
        nature: 'Nature',
        priority: 'Priorité',
        points: 'Points',
        estimatedHours: 'Temps estimé (heures)',
        userStory: 'User Story (optionnel)',
        userStoryPlaceholder: 'Aucune US',
        assignees: 'Assignés',
        cancel: 'Annuler',
        submit: 'Créer la tâche',
        submitting: 'Création...',
        errorFallback: 'Erreur',
      },
      taskDetail: {
        closeAria: 'Fermer',
        metaCreated: 'Créé par {author} • {date}',
        tabs: {
          details: 'Détails',
          comments: 'Commentaires',
          history: 'Historique',
        },
        descriptionTitle: 'Description',
        acceptanceCriteriaTitle: "Critères d'acceptation",
        acceptanceCriteriaPlaceholder: 'Aucun critère défini (P12).',
        attachmentsTitle: 'Pièces jointes',
        attachmentsPlaceholder: 'Aucune pièce jointe.',
        uploadDisabled: 'Upload (P12)',
        meta: {
          assignee: 'Assigné à',
          noAssignee: 'Non assigné',
          project: 'Projet',
          sprint: 'Sprint',
          userStory: 'User Story',
          noUserStory: 'Aucune',
          status: 'Statut',
          priority: 'Priorité',
          points: 'Points',
          time: 'Temps estimé',
          assigneeSearch: 'Rechercher un membre…',
          assignPlaceholder: 'Assigner des membres…',
          assigneeCount: '{count} assigné(s)',
          noMembers: 'Aucun membre dans ce projet.',
        },
        commentsEmpty: 'Aucun commentaire pour cette tâche.',
        historyEmpty: 'Aucun historique disponible.',
        edit: 'Modifier',
        editMode: 'Mode édition',
        titleLabel: 'Titre',
        unsavedChanges: 'Modifications non enregistrées',
        cancel: 'Annuler',
        save: 'Enregistrer',
        saving: 'Enregistrement…',
        errorFallback: "Échec de l'enregistrement.",
        logTime: 'Logger du temps',
        logTimeDisabled: 'Disponible en P9',
        close: 'Fermer',
      },
    },
    kanban: {
      title: 'Kanban',
      subtitle: 'Vue du sprint actif',
      noActiveSprint: 'Aucun sprint actif.',
      columns: {
        todo: 'À faire',
        'in-progress': 'En cours',
        testing: 'À tester',
        uat: 'UAT',
        done: 'Terminé',
      },
      cardCount: '{count} cartes',
      dragHint: 'Glissez une tâche ici',
      filters: { all: 'Toutes les tâches', mine: 'Mes tâches' },
      sprintHeader: {
        points: '{completed}/{total} pts',
        completion: '{percent}% complete',
        navPrev: 'Sprint précédent',
        navNext: 'Sprint suivant',
        navDisabled: 'Disponible en P8',
        goalLabel: 'Objectif',
      },
    },
  },
  'user-story-map': {
    title: 'User Story Map',
    subtitle: 'Hiérarchie : Épiques → US → Tâches',
    newEpic: '+ Nouvelle épique',
    newUserStory: '+ Nouvelle US',
    newTask: '+ Nouvelle tâche',
    epicLabel: 'Épique',
    usLabel: 'US',
    usCount: 'US',
    taskCount: 'tâches',
    tasks: 'tâches',
    noUserStories: 'Aucune user story.',
    noTasks: 'Aucune tâche.',
    addUserStoryInline: 'Ajouter une US',
    emptyState: 'Aucune épique.',
    editUserStoryModal: {
      title: 'Modifier la user story',
      closeAria: 'Fermer',
      errorFallback: 'Erreur',
      invalidTransition: 'Transition invalide : {from} → {to}.',
      pointsNone: '— sans points —',
      fields: {
        title: 'Titre',
        description: 'Description',
        status: 'Statut',
        points: 'Points',
        priority: 'Priorité',
      },
      actions: {
        save: 'Sauvegarder',
        saving: 'Sauvegarde...',
        cancel: 'Annuler',
      },
    },
  },
  tasks: {
    status: {
      todo: 'À faire',
      'in-progress': 'En cours',
      testing: 'À tester',
      uat: 'UAT',
      done: 'Terminé',
    },
    priority: {
      Basse: 'Basse',
      Moyenne: 'Moyenne',
      Haute: 'Haute',
      Critique: 'Critique',
    },
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
