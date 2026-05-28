/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { http, HttpResponse } from 'msw';
import type { EpicStatus, EpicType } from '#src/schemas/epics.ts';
import type { StoryPriority, StoryStatus } from '#src/schemas/user-stories.ts';
import type {
  TaskNature,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '#src/schemas/tasks.ts';

type SatelliteOwnerType = 'task' | 'story' | 'epic' | 'project';

type MockEpic = {
  id: string;
  type: 'epics';
  attributes: {
    title: string;
    description: string;
    notes: string | null;
    color: string;
    type: EpicType;
    value: number | null;
    rank: number;
    projectId: string;
    createdById: string | null;
    status: EpicStatus;
    tags: string[];
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
    notes: string | null;
    color: string | null;
    projectId: string;
    epicId: string | null;
    sprintId: string | null;
    status: StoryStatus;
    points: number | null;
    priority: StoryPriority;
    rank: number;
    value: number | null;
    createdById: string | null;
    tags: string[];
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

function makeEpic(
  attrs: Partial<MockEpic['attributes']> & {
    id: string;
    title: string;
    projectId: string;
  }
): MockEpic {
  const { id, ...rest } = attrs;
  return {
    id,
    type: 'epics',
    attributes: {
      description: '',
      notes: null,
      color: '#6B7280',
      type: 'functional',
      value: null,
      rank: 0,
      createdById: 'user-2',
      status: 'todo',
      tags: [],
      createdAt: NOW,
      updatedAt: NOW,
      ...rest,
    },
  };
}

let mockEpics: MockEpic[] = [
  makeEpic({
    id: 'epic-1',
    title: 'Authentication & Onboarding',
    description: 'Authentification et onboarding',
    projectId: 'proj-1',
    status: 'in-progress',
    color: '#3B82F6',
    type: 'functional',
    rank: 1,
  }),
  makeEpic({
    id: 'epic-2',
    title: 'Project Management',
    description: 'Création et gestion des projets Scrum',
    projectId: 'proj-1',
    color: '#10B981',
    rank: 2,
  }),
  makeEpic({
    id: 'epic-3',
    title: 'Reporting & Analytics',
    description: 'Tableaux de bord et métriques de performance',
    projectId: 'proj-1',
    color: '#F59E0B',
    type: 'architectural',
    rank: 3,
  }),
];

function makeStory(
  attrs: Partial<MockUserStory['attributes']> & {
    id: string;
    title: string;
    projectId: string;
  }
): MockUserStory {
  const { id, ...rest } = attrs;
  return {
    id,
    type: 'user-stories',
    attributes: {
      description: '',
      notes: null,
      color: null,
      epicId: null,
      sprintId: null,
      status: 'accepted',
      points: null,
      priority: 'Moyenne',
      rank: 0,
      value: null,
      createdById: 'user-2',
      tags: [],
      createdAt: NOW,
      updatedAt: NOW,
      ...rest,
    },
  };
}

let mockUserStories: MockUserStory[] = [
  // Epic-1
  makeStory({
    id: 'us-1',
    title: 'Login avec email / mot de passe',
    description: 'Login avec email et mot de passe',
    projectId: 'proj-1',
    epicId: 'epic-1',
    status: 'done',
    points: 3,
    priority: 'Haute',
    rank: 1,
  }),
  makeStory({
    id: 'us-2',
    title: 'Réinitialisation du mot de passe',
    description: 'Recuperer acces au compte via email',
    projectId: 'proj-1',
    epicId: 'epic-1',
    status: 'in-progress',
    points: 5,
    priority: 'Moyenne',
    rank: 2,
  }),
  makeStory({
    id: 'us-3',
    title: 'Profil utilisateur',
    description: 'Modification du profil utilisateur',
    projectId: 'proj-1',
    epicId: 'epic-1',
    status: 'accepted',
    points: 2,
    priority: 'Basse',
    rank: 3,
  }),
  // Epic-2
  makeStory({
    id: 'us-4',
    title: 'Créer un projet',
    description: 'En tant que chef de projet je veux créer un nouveau projet',
    projectId: 'proj-1',
    epicId: 'epic-2',
    status: 'done',
    points: 5,
    priority: 'Haute',
    rank: 4,
  }),
  makeStory({
    id: 'us-5',
    title: 'Inviter des membres',
    description: 'En tant que chef de projet je veux ajouter des membres',
    projectId: 'proj-1',
    epicId: 'epic-2',
    status: 'estimated',
    points: 3,
    priority: 'Moyenne',
    rank: 5,
  }),
  // Epic-3
  makeStory({
    id: 'us-6',
    title: 'Tableau de bord KPIs',
    description: 'En tant que PM je veux voir les métriques clés',
    projectId: 'proj-1',
    epicId: 'epic-3',
    status: 'accepted',
    points: 8,
    priority: 'Haute',
    rank: 6,
  }),
  makeStory({
    id: 'us-7',
    title: 'Export rapport PDF',
    description: 'En tant que PM je veux exporter les données',
    projectId: 'proj-1',
    epicId: 'epic-3',
    status: 'suggested',
    points: 5,
    priority: 'Moyenne',
    rank: 7,
  }),
  // US orphelines (sans épique)
  makeStory({
    id: 'us-8',
    title: 'Mode hors-ligne',
    description: 'Acces offline sans connexion internet',
    projectId: 'proj-1',
    epicId: null,
    status: 'suggested',
    points: 13,
    priority: 'Basse',
    rank: 8,
  }),
  makeStory({
    id: 'us-9',
    title: 'Notifications email',
    description:
      "En tant qu'utilisateur je veux recevoir des alertes par email",
    projectId: 'proj-1',
    epicId: null,
    status: 'suggested',
    points: null,
    priority: 'Basse',
    rank: 9,
  }),
];

type MockComment = {
  id: string;
  type: 'task-comments';
  attributes: {
    ownerType: SatelliteOwnerType;
    ownerId: string;
    // Kept for backwards compatibility with consumers reading `taskId`
    // — backend deprecates this in favor of ownerType+ownerId polymorphism.
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
      ownerType: 'task',
      ownerId: 'task-1',
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
      ownerType: 'task',
      ownerId: 'task-1',
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
      ownerType: 'task',
      ownerId: 'task-2',
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

const VALID_STORY_TRANSITIONS: Record<StoryStatus, readonly StoryStatus[]> = {
  suggested: ['accepted'],
  accepted: ['suggested', 'estimated'],
  estimated: ['accepted', 'planned'],
  planned: ['estimated', 'in-progress'],
  'in-progress': ['planned', 'done'],
  done: [],
};

function invalidTransitionResponse(from: StoryStatus, to: StoryStatus) {
  return HttpResponse.json(
    {
      errors: [
        {
          status: '422',
          code: 'INVALID_STORY_TRANSITION',
          title: 'Invalid story transition',
          detail: `Cannot transition story from ${from} to ${to}.`,
          meta: { from, to },
        },
      ],
    },
    { status: 422 }
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
    const attributes = (json.data?.attributes ?? {}) as Record<string, any>;
    const id = (json.data?.id as string | undefined) ?? `epic-${Date.now()}`;
    const nextRank =
      mockEpics
        .filter((e) => e.attributes.projectId === attributes.projectId)
        .reduce((max, e) => Math.max(max, e.attributes.rank), 0) + 1;
    const created: MockEpic = {
      id,
      type: 'epics',
      attributes: {
        title: attributes.title ?? '',
        description: attributes.description ?? '',
        notes: (attributes.notes as string | null) ?? null,
        color: (attributes.color as string) ?? '#6B7280',
        type: (attributes.type as EpicType) ?? 'functional',
        value: (attributes.value as number | null) ?? null,
        rank: (attributes.rank as number) ?? nextRank,
        projectId: attributes.projectId ?? '',
        createdById: (attributes.createdById as string | null) ?? 'user-2',
        status: (attributes.status as EpicStatus) ?? 'todo',
        tags: (attributes.tags as string[]) ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    mockEpics = [...mockEpics, created];
    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  http.patch('/api/v1/epics/:id', async (req) => {
    const { id } = req.params as { id: string };
    const json = (await req.request.json()) as Record<string, any>;
    const attrs = (json.data?.attributes ?? {}) as Record<string, any>;
    const idx = mockEpics.findIndex((e) => e.id === id);
    if (idx === -1) return HttpResponse.json({ errors: [] }, { status: 404 });
    mockEpics[idx] = {
      ...mockEpics[idx]!,
      attributes: {
        ...mockEpics[idx]!.attributes,
        ...(attrs.title !== undefined && { title: attrs.title as string }),
        ...(attrs.description !== undefined && {
          description: attrs.description as string,
        }),
        ...(attrs.notes !== undefined && {
          notes: attrs.notes as string | null,
        }),
        ...(attrs.color !== undefined && { color: attrs.color as string }),
        ...(attrs.type !== undefined && { type: attrs.type as EpicType }),
        ...(attrs.value !== undefined && {
          value: attrs.value as number | null,
        }),
        ...(attrs.rank !== undefined && { rank: attrs.rank as number }),
        ...(attrs.tags !== undefined && { tags: attrs.tags as string[] }),
        ...(attrs.status !== undefined && {
          status: attrs.status as EpicStatus,
        }),
        updatedAt: new Date().toISOString(),
      },
    };
    return HttpResponse.json({ data: mockEpics[idx] });
  }),

  http.delete('/api/v1/epics/:id', (req) => {
    const { id } = req.params as { id: string };
    const idx = mockEpics.findIndex((e) => e.id === id);
    if (idx === -1) return HttpResponse.json({ errors: [] }, { status: 404 });
    mockEpics = mockEpics.filter((e) => e.id !== id);
    mockUserStories = mockUserStories.map((us) =>
      us.attributes.epicId === id
        ? { ...us, attributes: { ...us.attributes, epicId: null } }
        : us
    );
    return new HttpResponse(null, { status: 204 });
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
    const attributes = (json.data?.attributes ?? {}) as Record<string, any>;
    const id = (json.data?.id as string | undefined) ?? `us-${Date.now()}`;
    const nextRank =
      mockUserStories
        .filter((us) => us.attributes.projectId === attributes.projectId)
        .reduce((max, us) => Math.max(max, us.attributes.rank), 0) + 1;
    const created: MockUserStory = {
      id,
      type: 'user-stories',
      attributes: {
        title: attributes.title ?? '',
        description: attributes.description ?? '',
        notes: (attributes.notes as string | null) ?? null,
        color: (attributes.color as string | null) ?? null,
        projectId: attributes.projectId ?? '',
        epicId: (attributes.epicId as string | null) ?? null,
        sprintId: (attributes.sprintId as string | null) ?? null,
        status: (attributes.status as StoryStatus) ?? 'suggested',
        points: (attributes.points as number | null) ?? null,
        priority: (attributes.priority as StoryPriority) ?? 'Moyenne',
        rank: (attributes.rank as number) ?? nextRank,
        value: (attributes.value as number | null) ?? null,
        createdById: (attributes.createdById as string | null) ?? 'user-2',
        tags: (attributes.tags as string[]) ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    mockUserStories = [...mockUserStories, created];
    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  http.patch('/api/v1/user-stories/:id', async (req) => {
    const { id } = req.params as { id: string };
    const json = (await req.request.json()) as Record<string, any>;
    const attrs = (json.data?.attributes ?? {}) as Record<string, any>;
    const idx = mockUserStories.findIndex((us) => us.id === id);
    if (idx === -1) return HttpResponse.json({ errors: [] }, { status: 404 });
    const current = mockUserStories[idx]!;
    if (attrs.status !== undefined) {
      const next = attrs.status as StoryStatus;
      const from = current.attributes.status;
      if (next !== from) {
        const allowed = VALID_STORY_TRANSITIONS[from] ?? [];
        if (!allowed.includes(next)) {
          return invalidTransitionResponse(from, next);
        }
      }
    }
    mockUserStories[idx] = {
      ...current,
      attributes: {
        ...current.attributes,
        ...(attrs.title !== undefined && { title: attrs.title as string }),
        ...(attrs.description !== undefined && {
          description: attrs.description as string,
        }),
        ...(attrs.notes !== undefined && {
          notes: attrs.notes as string | null,
        }),
        ...(attrs.color !== undefined && {
          color: attrs.color as string | null,
        }),
        ...(attrs.status !== undefined && {
          status: attrs.status as StoryStatus,
        }),
        ...(attrs.points !== undefined && {
          points: attrs.points as number | null,
        }),
        ...(attrs.priority !== undefined && {
          priority: attrs.priority as StoryPriority,
        }),
        ...(attrs.rank !== undefined && { rank: attrs.rank as number }),
        ...(attrs.value !== undefined && {
          value: attrs.value as number | null,
        }),
        ...(attrs.tags !== undefined && { tags: attrs.tags as string[] }),
        ...(attrs.epicId !== undefined && {
          epicId: attrs.epicId as string | null,
        }),
        ...(attrs.sprintId !== undefined && {
          sprintId: attrs.sprintId as string | null,
        }),
        updatedAt: new Date().toISOString(),
      },
    };
    return HttpResponse.json({ data: mockUserStories[idx] });
  }),

  http.delete('/api/v1/user-stories/:id', (req) => {
    const { id } = req.params as { id: string };
    const idx = mockUserStories.findIndex((us) => us.id === id);
    if (idx === -1) return HttpResponse.json({ errors: [] }, { status: 404 });
    mockUserStories = mockUserStories.filter((us) => us.id !== id);
    // Cascade: tasks referencing this user-story become orphan (userStoryId=null)
    // to mirror an explicit FK cleanup. Real backend behavior: no FK cascade
    // (tasks keep dangling string pointer) — front-end fix improves UX consistency.
    mockTasks = mockTasks.map((t) =>
      t.attributes.userStoryId === id
        ? { ...t, attributes: { ...t.attributes, userStoryId: null } }
        : t
    );
    // Real backend returns 204 with body `{ data: null }` (per
    // makeSingleJsonApiTopDocument(literal(null))). Mirror that shape.
    return HttpResponse.json({ data: null }, { status: 204 });
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
    const comments = mockComments.filter(
      (c) => c.attributes.ownerType === 'task' && c.attributes.ownerId === id
    );
    return HttpResponse.json({
      data: comments,
      meta: { count: comments.length },
    });
  }),

  // Polymorphic comment routes (P1 — Comment.ownerType + ownerId).
  // Reads only — full POST/DELETE are owned by the comments-front lib if/when
  // it ships. Mocks keep the backend's response shape for read consumers.
  http.get('/api/v1/epics/:id/comments', (req) => {
    const { id } = req.params as { id: string };
    const comments = mockComments.filter(
      (c) => c.attributes.ownerType === 'epic' && c.attributes.ownerId === id
    );
    return HttpResponse.json({
      data: comments,
      meta: { count: comments.length },
    });
  }),

  http.get('/api/v1/user-stories/:id/comments', (req) => {
    const { id } = req.params as { id: string };
    const comments = mockComments.filter(
      (c) => c.attributes.ownerType === 'story' && c.attributes.ownerId === id
    );
    return HttpResponse.json({
      data: comments,
      meta: { count: comments.length },
    });
  }),

  http.get('/api/v1/projects/:id/comments', (req) => {
    const { id } = req.params as { id: string };
    const comments = mockComments.filter(
      (c) => c.attributes.ownerType === 'project' && c.attributes.ownerId === id
    );
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
