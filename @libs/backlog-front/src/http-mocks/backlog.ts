/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: openapi-msw migration — refactor `notFound()` to use `response(404).json(...)`
// helper from openapi-msw so 404 responses are narrowed to the OpenAPI 404 schema,
// then switch this import to `import { createOpenApiHttp } from 'openapi-msw'`.
// Also: `/api/v1/tasks/:id/history` is NOT declared in the backend OpenAPI schema
// and will need to stay on raw `http` until the backend exposes it.
import { http, HttpResponse } from 'msw';
import type { EpicStatus } from '#src/schemas/epics.ts';
import type {
  TaskNature,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '#src/schemas/tasks.ts';

type MockEpic = {
  id: string;
  type: 'epics';
  attributes: {
    title: string;
    description: string;
    projectId: string;
    status: EpicStatus;
    createdAt: string;
    updatedAt: string;
  };
};

type MockUserStory = {
  id: string;
  type: 'user-stories';
  attributes: {
    title: string;
    description: string;
    projectId: string;
    epicId: string | null;
    status: 'todo' | 'in-progress' | 'done';
    points: number;
    priority: number;
    createdAt: string;
    updatedAt: string;
  };
};

type MockTask = {
  id: string;
  type: 'tasks';
  attributes: {
    number: number;
    title: string;
    description: string;
    status: TaskStatus;
    type: TaskType;
    nature: TaskNature;
    priority: TaskPriority;
    points: number;
    estimatedHours: number | null;
    projectId: string;
    userStoryId: string | null;
    epicId: string | null;
    sprintId: string | null;
    createdById: string;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

const NOW = '2025-03-01T10:00:00Z';

let mockEpics: MockEpic[] = [
  {
    id: 'epic-1',
    type: 'epics',
    attributes: {
      title: 'Authentication & Onboarding',
      description: 'Authentification et onboarding',
      projectId: 'proj-1',
      status: 'in-progress',
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'epic-2',
    type: 'epics',
    attributes: {
      title: 'Project Management',
      description: 'Création et gestion des projets Scrum',
      projectId: 'proj-1',
      status: 'todo',
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'epic-3',
    type: 'epics',
    attributes: {
      title: 'Reporting & Analytics',
      description: 'Tableaux de bord et métriques de performance',
      projectId: 'proj-1',
      status: 'todo',
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
];

let mockUserStories: MockUserStory[] = [
  // Epic-1
  {
    id: 'us-1',
    type: 'user-stories',
    attributes: {
      title: 'Login avec email / mot de passe',
      description: 'Login avec email et mot de passe',
      projectId: 'proj-1',
      epicId: 'epic-1',
      status: 'done',
      points: 3,
      priority: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'us-2',
    type: 'user-stories',
    attributes: {
      title: 'Réinitialisation du mot de passe',
      description: 'Recuperer acces au compte via email',
      projectId: 'proj-1',
      epicId: 'epic-1',
      status: 'in-progress',
      points: 5,
      priority: 2,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'us-3',
    type: 'user-stories',
    attributes: {
      title: 'Profil utilisateur',
      description: 'Modification du profil utilisateur',
      projectId: 'proj-1',
      epicId: 'epic-1',
      status: 'todo',
      points: 2,
      priority: 3,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  // Epic-2
  {
    id: 'us-4',
    type: 'user-stories',
    attributes: {
      title: 'Créer un projet',
      description: 'En tant que chef de projet je veux créer un nouveau projet',
      projectId: 'proj-1',
      epicId: 'epic-2',
      status: 'done',
      points: 5,
      priority: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'us-5',
    type: 'user-stories',
    attributes: {
      title: 'Inviter des membres',
      description: 'En tant que chef de projet je veux ajouter des membres',
      projectId: 'proj-1',
      epicId: 'epic-2',
      status: 'todo',
      points: 3,
      priority: 2,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  // Epic-3
  {
    id: 'us-6',
    type: 'user-stories',
    attributes: {
      title: 'Tableau de bord KPIs',
      description: 'En tant que PM je veux voir les métriques clés',
      projectId: 'proj-1',
      epicId: 'epic-3',
      status: 'todo',
      points: 8,
      priority: 1,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'us-7',
    type: 'user-stories',
    attributes: {
      title: 'Export rapport PDF',
      description: 'En tant que PM je veux exporter les données',
      projectId: 'proj-1',
      epicId: 'epic-3',
      status: 'todo',
      points: 5,
      priority: 2,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  // US orphelines (sans épique)
  {
    id: 'us-8',
    type: 'user-stories',
    attributes: {
      title: 'Mode hors-ligne',
      description: 'Acces offline sans connexion internet',
      projectId: 'proj-1',
      epicId: null,
      status: 'todo',
      points: 13,
      priority: 3,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'us-9',
    type: 'user-stories',
    attributes: {
      title: 'Notifications email',
      description:
        "En tant qu'utilisateur je veux recevoir des alertes par email",
      projectId: 'proj-1',
      epicId: null,
      status: 'todo',
      points: 3,
      priority: 3,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
];

type MockComment = {
  id: string;
  type: 'task-comments';
  attributes: {
    taskId: string;
    authorId: string;
    content: string;
    createdAt: string;
  };
};

type MockHistoryEvent = {
  id: string;
  type: 'task-history';
  attributes: {
    taskId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedById: string;
    createdAt: string;
  };
};

type MockAssignee = {
  id: string;
  type: 'users';
  attributes: {
    email: string;
    firstName: string;
    lastName: string;
  };
};

let mockTasks: MockTask[] = [
  // Backlog tasks (sprintId: null)
  {
    id: 'task-1',
    type: 'tasks',
    attributes: {
      number: 1,
      title: 'Implémenter JWT refresh token',
      description: 'Ajouter la gestion du refresh token côté backend',
      status: 'todo',
      type: 'Backend',
      nature: 'Feature',
      priority: 'Haute',
      points: 3,
      estimatedHours: 4,
      projectId: 'proj-1',
      userStoryId: 'us-2',
      epicId: 'epic-1',
      sprintId: null,
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-2',
    type: 'tasks',
    attributes: {
      number: 2,
      title: 'Page de profil UI',
      description: 'Créer la page de profil utilisateur',
      status: 'todo',
      type: 'Frontend',
      nature: 'Feature',
      priority: 'Moyenne',
      points: 2,
      estimatedHours: 3,
      projectId: 'proj-1',
      userStoryId: 'us-3',
      epicId: 'epic-1',
      sprintId: null,
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-3',
    type: 'tasks',
    attributes: {
      number: 3,
      title: 'Fix bug formulaire reset password',
      description: 'Le bouton submit ne réagit pas dans Safari',
      status: 'todo',
      type: 'Frontend',
      nature: 'Bug',
      priority: 'Haute',
      points: 1,
      estimatedHours: 1,
      projectId: 'proj-1',
      userStoryId: 'us-2',
      epicId: 'epic-1',
      sprintId: null,
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-4',
    type: 'tasks',
    attributes: {
      number: 4,
      title: 'API membres projet',
      description: 'Endpoint GET /projects/:id/members',
      status: 'todo',
      type: 'Backend',
      nature: 'Feature',
      priority: 'Moyenne',
      points: 2,
      estimatedHours: 2,
      projectId: 'proj-1',
      userStoryId: 'us-5',
      epicId: 'epic-2',
      sprintId: null,
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-5',
    type: 'tasks',
    attributes: {
      number: 5,
      title: 'Composant invitation email',
      description: 'UI pour inviter un membre par email',
      status: 'todo',
      type: 'Frontend',
      nature: 'Feature',
      priority: 'Moyenne',
      points: 2,
      estimatedHours: 3,
      projectId: 'proj-1',
      userStoryId: 'us-5',
      epicId: 'epic-2',
      sprintId: null,
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-6',
    type: 'tasks',
    attributes: {
      number: 6,
      title: 'Requête agrégation KPIs',
      description: 'Query SQL pour les métriques du dashboard',
      status: 'todo',
      type: 'Database',
      nature: 'Feature',
      priority: 'Haute',
      points: 5,
      estimatedHours: 6,
      projectId: 'proj-1',
      userStoryId: 'us-6',
      epicId: 'epic-3',
      sprintId: null,
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-7',
    type: 'tasks',
    attributes: {
      number: 7,
      title: 'Intégration export PDF',
      description: 'Utiliser puppeteer pour la génération PDF',
      status: 'todo',
      type: 'Backend',
      nature: 'Feature',
      priority: 'Basse',
      points: 3,
      estimatedHours: 4,
      projectId: 'proj-1',
      userStoryId: 'us-7',
      epicId: 'epic-3',
      sprintId: null,
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-8',
    type: 'tasks',
    attributes: {
      number: 8,
      title: 'Techdebt: migrer vers Zod 4',
      description: 'Mettre à jour les schémas de validation',
      status: 'todo',
      type: 'Backend',
      nature: 'Techdebt',
      priority: 'Basse',
      points: 2,
      estimatedHours: 2,
      projectId: 'proj-1',
      userStoryId: null,
      epicId: null,
      sprintId: null,
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-9',
    type: 'tasks',
    attributes: {
      number: 9,
      title: 'Audit sécurité authentification',
      description: 'Revoir la configuration des cookies de session',
      status: 'todo',
      type: 'Security',
      nature: 'Spike',
      priority: 'Haute',
      points: 3,
      estimatedHours: 4,
      projectId: 'proj-1',
      userStoryId: null,
      epicId: null,
      sprintId: null,
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  // Sprint tasks (sprintId !== null)
  {
    id: 'task-10',
    type: 'tasks',
    attributes: {
      number: 10,
      title: 'Page de connexion',
      description: 'UI de la page de login',
      status: 'done',
      type: 'Frontend',
      nature: 'Feature',
      priority: 'Haute',
      points: 3,
      estimatedHours: 4,
      projectId: 'proj-1',
      userStoryId: 'us-1',
      epicId: 'epic-1',
      sprintId: 'sprint-1',
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-11',
    type: 'tasks',
    attributes: {
      number: 11,
      title: 'Route POST /auth/login',
      description: 'Endpoint backend authentification JWT',
      status: 'done',
      type: 'Backend',
      nature: 'Feature',
      priority: 'Haute',
      points: 2,
      estimatedHours: 3,
      projectId: 'proj-1',
      userStoryId: 'us-1',
      epicId: 'epic-1',
      sprintId: 'sprint-1',
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-12',
    type: 'tasks',
    attributes: {
      number: 12,
      title: 'Schéma base de données projets',
      description: 'Migration MikroORM pour la table projects',
      status: 'done',
      type: 'Database',
      nature: 'Feature',
      priority: 'Haute',
      points: 2,
      estimatedHours: 2,
      projectId: 'proj-1',
      userStoryId: 'us-4',
      epicId: 'epic-2',
      sprintId: 'sprint-1',
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-13',
    type: 'tasks',
    attributes: {
      number: 13,
      title: 'Route POST /projects',
      description: 'Endpoint création de projet',
      status: 'in-progress',
      type: 'Backend',
      nature: 'Feature',
      priority: 'Moyenne',
      points: 3,
      estimatedHours: 3,
      projectId: 'proj-1',
      userStoryId: 'us-4',
      epicId: 'epic-2',
      sprintId: 'sprint-1',
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-14',
    type: 'tasks',
    attributes: {
      number: 14,
      title: 'Page /projects grille cards',
      description: 'Route frontend avec la grille de ProjectCard',
      status: 'in-progress',
      type: 'Frontend',
      nature: 'Feature',
      priority: 'Moyenne',
      points: 5,
      estimatedHours: 6,
      projectId: 'proj-1',
      userStoryId: 'us-4',
      epicId: 'epic-2',
      sprintId: 'sprint-1',
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-15',
    type: 'tasks',
    attributes: {
      number: 15,
      title: 'Setup CI/CD pipeline',
      description: 'Configurer GitHub Actions pour le déploiement',
      status: 'todo',
      type: 'DevOps',
      nature: 'Infra',
      priority: 'Haute',
      points: 5,
      estimatedHours: 8,
      projectId: 'proj-1',
      userStoryId: null,
      epicId: null,
      sprintId: null,
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-16',
    type: 'tasks',
    attributes: {
      number: 16,
      title: 'Tests E2E login flow',
      description: 'Playwright tests pour le flux de connexion',
      status: 'todo',
      type: 'Testing',
      nature: 'Feature',
      priority: 'Moyenne',
      points: 3,
      estimatedHours: 4,
      projectId: 'proj-1',
      userStoryId: 'us-1',
      epicId: 'epic-1',
      sprintId: null,
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-17',
    type: 'tasks',
    attributes: {
      number: 17,
      title: 'Design system tokens',
      description: 'Variables CSS pour la cohérence visuelle',
      status: 'todo',
      type: 'UX',
      nature: 'Feature',
      priority: 'Basse',
      points: 2,
      estimatedHours: 3,
      projectId: 'proj-1',
      userStoryId: null,
      epicId: null,
      sprintId: null,
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: 'task-18',
    type: 'tasks',
    attributes: {
      number: 18,
      title: 'Hotfix: crash sur mobile Safari',
      description: 'Fix du crash au rechargement',
      status: 'in-progress',
      type: 'Frontend',
      nature: 'Hotfix',
      priority: 'Critique',
      points: 1,
      estimatedHours: 1,
      projectId: 'proj-1',
      userStoryId: null,
      epicId: null,
      sprintId: 'sprint-1',
      createdById: 'user-2',
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
];

const mockComments: MockComment[] = [
  {
    id: 'comment-1',
    type: 'task-comments',
    attributes: {
      taskId: 'task-1',
      authorId: 'user-2',
      content: 'Vérifier avec le PM la priorité de cette tâche.',
      createdAt: NOW,
    },
  },
  {
    id: 'comment-2',
    type: 'task-comments',
    attributes: {
      taskId: 'task-1',
      authorId: 'user-2',
      content: 'Bloqué sur la rotation des clés — voir issue #42.',
      createdAt: NOW,
    },
  },
  {
    id: 'comment-3',
    type: 'task-comments',
    attributes: {
      taskId: 'task-2',
      authorId: 'user-2',
      content: "Maquette validée par l'équipe design.",
      createdAt: NOW,
    },
  },
];

const mockHistory: MockHistoryEvent[] = [
  {
    id: 'hist-1',
    type: 'task-history',
    attributes: {
      taskId: 'task-1',
      field: 'status',
      oldValue: null,
      newValue: 'todo',
      changedById: 'user-2',
      createdAt: NOW,
    },
  },
  {
    id: 'hist-2',
    type: 'task-history',
    attributes: {
      taskId: 'task-1',
      field: 'priority',
      oldValue: 'Moyenne',
      newValue: 'Haute',
      changedById: 'user-2',
      createdAt: NOW,
    },
  },
  {
    id: 'hist-3',
    type: 'task-history',
    attributes: {
      taskId: 'task-2',
      field: 'status',
      oldValue: null,
      newValue: 'todo',
      changedById: 'user-2',
      createdAt: NOW,
    },
  },
];

const mockAssignees: MockAssignee[] = [
  {
    id: 'user-1',
    type: 'users',
    attributes: {
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Dupont',
    },
  },
  {
    id: 'user-2',
    type: 'users',
    attributes: {
      email: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Martin',
    },
  },
];

// Sprint mocks moved to @libs/sprints-front/http-mocks/sprints.ts in P8.

function notFound(id: string) {
  return HttpResponse.json(
    {
      errors: [
        {
          status: '404',
          title: 'Not Found',
          code: 'NOT_FOUND',
          detail: `Resource with id ${id} not found`,
        },
      ],
    },
    { status: 404 }
  );
}

export const allBacklogHandlers = [
  // Epics
  http.get('/api/v1/projects/:id/epics', (req) => {
    const { id } = req.params as { id: string };
    return HttpResponse.json({
      data: mockEpics.filter((e) => e.attributes.projectId === id),
      meta: {
        count: mockEpics.filter((e) => e.attributes.projectId === id).length,
      },
    });
  }),

  http.get('/api/v1/epics/:id', (req) => {
    const { id } = req.params as { id: string };
    const epic = mockEpics.find((e) => e.id === id);
    if (!epic) return notFound(id);
    return HttpResponse.json({ data: epic });
  }),

  http.get('/api/v1/epics/:id/user-stories', (req) => {
    const { id } = req.params as { id: string };
    return HttpResponse.json({
      data: mockUserStories.filter((us) => us.attributes.epicId === id),
      meta: {
        count: mockUserStories.filter((us) => us.attributes.epicId === id)
          .length,
      },
    });
  }),

  http.post('/api/v1/epics', async (req) => {
    const json = (await req.request.json()) as Record<string, any>;
    const attributes = json.data?.attributes ?? {};
    const id = (json.data?.id as string | undefined) ?? `epic-${Date.now()}`;
    const created: MockEpic = {
      id,
      type: 'epics',
      attributes: {
        title: attributes.title ?? '',
        description: attributes.description ?? '',
        projectId: attributes.projectId ?? '',
        status: (attributes.status as EpicStatus) ?? 'todo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    mockEpics = [...mockEpics, created];
    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  // User Stories
  http.get('/api/v1/projects/:id/user-stories', (req) => {
    const { id } = req.params as { id: string };
    return HttpResponse.json({
      data: mockUserStories.filter((us) => us.attributes.projectId === id),
      meta: {
        count: mockUserStories.filter((us) => us.attributes.projectId === id)
          .length,
      },
    });
  }),

  http.get('/api/v1/user-stories/:id', (req) => {
    const { id } = req.params as { id: string };
    const us = mockUserStories.find((u) => u.id === id);
    if (!us) return notFound(id);
    return HttpResponse.json({ data: us });
  }),

  http.get('/api/v1/user-stories/:id/tasks', (req) => {
    const { id } = req.params as { id: string };
    return HttpResponse.json({
      data: mockTasks.filter((t) => t.attributes.userStoryId === id),
      meta: {
        count: mockTasks.filter((t) => t.attributes.userStoryId === id).length,
      },
    });
  }),

  http.post('/api/v1/user-stories', async (req) => {
    const json = (await req.request.json()) as Record<string, any>;
    const attributes = json.data?.attributes ?? {};
    const id = (json.data?.id as string | undefined) ?? `us-${Date.now()}`;
    const created: MockUserStory = {
      id,
      type: 'user-stories',
      attributes: {
        title: attributes.title ?? '',
        description: attributes.description ?? '',
        projectId: attributes.projectId ?? '',
        epicId: (attributes.epicId as string | null) ?? null,
        status: attributes.status ?? 'todo',
        points: (attributes.points as number) ?? 1,
        priority: (attributes.priority as number) ?? 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    mockUserStories = [...mockUserStories, created];
    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  // Tasks
  http.get('/api/v1/projects/:id/tasks', (req) => {
    const { id } = req.params as { id: string };
    const tasks = mockTasks.filter((t) => t.attributes.projectId === id);
    return HttpResponse.json({
      data: tasks,
      meta: { count: tasks.length, total: tasks.length, pages: 1 },
    });
  }),

  http.get('/api/v1/tasks/:id', (req) => {
    const { id } = req.params as { id: string };
    const task = mockTasks.find((t) => t.id === id);
    if (!task) return notFound(id);
    return HttpResponse.json({ data: task });
  }),

  http.post('/api/v1/tasks', async (req) => {
    const json = (await req.request.json()) as Record<string, any>;
    const attributes = json.data?.attributes ?? {};
    const maxNumber = mockTasks.reduce(
      (max, t) => Math.max(max, t.attributes.number),
      0
    );
    const id = `task-${Date.now()}`;
    const created: MockTask = {
      id,
      type: 'tasks',
      attributes: {
        number: maxNumber + 1,
        title: attributes.title ?? '',
        description: attributes.description ?? '',
        status: (attributes.status as TaskStatus) ?? 'todo',
        type: attributes.type ?? 'Frontend',
        nature: attributes.nature ?? 'Feature',
        priority: (attributes.priority as TaskPriority) ?? 'Moyenne',
        points: (attributes.points as number) ?? 1,
        estimatedHours: (attributes.estimatedHours as number | null) ?? null,
        projectId: attributes.projectId ?? '',
        userStoryId: (attributes.userStoryId as string | null) ?? null,
        epicId: (attributes.epicId as string | null) ?? null,
        sprintId: (attributes.sprintId as string | null) ?? null,
        createdById: attributes.createdById ?? 'user-2',
        dueDate: (attributes.dueDate as string | null) ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    mockTasks = [...mockTasks, created];
    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  http.patch('/api/v1/tasks/:id', async (req) => {
    const { id } = req.params as { id: string };
    const json = (await req.request.json()) as Record<string, any>;
    const attributes = json.data?.attributes ?? {};
    const idx = mockTasks.findIndex((t) => t.id === id);
    if (idx === -1) return notFound(id);
    const updated: MockTask = {
      ...mockTasks[idx]!,
      attributes: {
        ...mockTasks[idx]!.attributes,
        ...attributes,
        updatedAt: new Date().toISOString(),
      },
    };
    mockTasks = mockTasks.map((t) => (t.id === id ? updated : t));
    return HttpResponse.json({ data: updated });
  }),

  http.get('/api/v1/tasks/:id/comments', (req) => {
    const { id } = req.params as { id: string };
    const comments = mockComments.filter((c) => c.attributes.taskId === id);
    return HttpResponse.json({
      data: comments,
      meta: { count: comments.length },
    });
  }),

  http.get('/api/v1/tasks/:id/history', (req) => {
    const { id } = req.params as { id: string };
    const events = mockHistory.filter((h) => h.attributes.taskId === id);
    return HttpResponse.json({ data: events, meta: { count: events.length } });
  }),

  http.get('/api/v1/tasks/:id/assignees', () => {
    return HttpResponse.json({
      data: mockAssignees,
      meta: { count: mockAssignees.length },
    });
  }),

  // Sprint tasks (kept here — mockTasks live in this file)
  http.get('/api/v1/sprints/:id/tasks', (req) => {
    const { id } = req.params as { id: string };
    const tasks = mockTasks.filter((t) => t.attributes.sprintId === id);
    return HttpResponse.json({
      data: tasks,
      meta: { count: tasks.length },
    });
  }),
];

export default allBacklogHandlers;
