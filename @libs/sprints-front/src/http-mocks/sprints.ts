import { http, HttpResponse } from "msw";

const NOW = "2025-01-15T00:00:00Z";

type MockSprint = {
  id: string;
  type: "sprints";
  attributes: {
    projectId: string;
    name: string;
    goal: string | null;
    startDate: string;
    endDate: string;
    status: "planned" | "active" | "completed";
    velocityPoints: number;
    completedPoints: number;
    createdAt: string;
    updatedAt: string;
  };
};

let mockSprints: MockSprint[] = [
  {
    id: "sprint-1",
    type: "sprints",
    attributes: {
      projectId: "proj-1",
      name: "Sprint 1 — Authentication & Onboarding",
      goal: "Finaliser le flow login complet et le profil utilisateur",
      startDate: "2025-01-15",
      endDate: "2025-01-29",
      status: "active",
      velocityPoints: 16,
      completedPoints: 7,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: "sprint-2",
    type: "sprints",
    attributes: {
      projectId: "proj-1",
      name: "Sprint 2 — Project Management",
      goal: "Création et gestion des projets Scrum",
      startDate: "2025-02-01",
      endDate: "2025-02-14",
      status: "planned",
      velocityPoints: 20,
      completedPoints: 0,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: "sprint-3",
    type: "sprints",
    attributes: {
      projectId: "proj-1",
      name: "Sprint 3 — Backlog & USM",
      goal: "Backlog, User Story Map, tâches front",
      startDate: "2025-02-17",
      endDate: "2025-03-01",
      status: "planned",
      velocityPoints: 18,
      completedPoints: 0,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: "sprint-4",
    type: "sprints",
    attributes: {
      projectId: "proj-1",
      name: "Sprint 4 — Kanban & Drag-Drop",
      goal: "Kanban 5 colonnes et drag-drop",
      startDate: "2025-03-03",
      endDate: "2025-03-16",
      status: "planned",
      velocityPoints: 15,
      completedPoints: 0,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: "sprint-5",
    type: "sprints",
    attributes: {
      projectId: "proj-1",
      name: "Sprint 5 — Dashboard & Reporting",
      goal: "KPIs et métriques de performance",
      startDate: "2025-03-17",
      endDate: "2025-03-30",
      status: "planned",
      velocityPoints: 22,
      completedPoints: 0,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
  {
    id: "sprint-6",
    type: "sprints",
    attributes: {
      projectId: "proj-1",
      name: "Sprint 0 — Fondations",
      goal: "Setup DB, CI, authentification",
      startDate: "2024-12-15",
      endDate: "2025-01-10",
      status: "completed",
      velocityPoints: 12,
      completedPoints: 12,
      createdAt: NOW,
      updatedAt: NOW,
    },
  },
];

function notFound(id: string) {
  return HttpResponse.json(
    {
      errors: [
        {
          status: "404",
          title: "Not Found",
          code: "NOT_FOUND",
          detail: `Sprint with id ${id} not found`,
        },
      ],
    },
    { status: 404 },
  );
}

export const allSprintsHandlers = [
  // GET all sprints for a project
  http.get("/api/v1/projects/:id/sprints", (req) => {
    const { id } = req.params as { id: string };
    const sprints = mockSprints.filter((s) => s.attributes.projectId === id);
    return HttpResponse.json({
      data: sprints,
      meta: { count: sprints.length },
    });
  }),

  // GET single sprint
  http.get("/api/v1/sprints/:id", (req) => {
    const { id } = req.params as { id: string };
    const sprint = mockSprints.find((s) => s.id === id);
    if (!sprint) return notFound(id);
    return HttpResponse.json({ data: sprint });
  }),

  // Note: GET /api/v1/sprints/:id/tasks is owned by @libs/backlog-front
  // mocks (mockTasks lives there). We don't register it here to avoid
  // shadowing with an empty handler.

  // POST create sprint
  http.post("/api/v1/sprints", async (req) => {
    const json = (await req.request.json()) as Record<string, unknown>;
    const attrs =
      ((json.data as Record<string, unknown>)?.attributes as Record<
        string,
        unknown
      >) ?? {};
    const created: MockSprint = {
      id: `sprint-${Date.now()}`,
      type: "sprints",
      attributes: {
        name: (attrs.name as string) ?? "",
        goal: (attrs.goal as string | null) ?? null,
        projectId: (attrs.projectId as string) ?? "",
        startDate: (attrs.startDate as string) ?? "",
        endDate: (attrs.endDate as string) ?? "",
        status: "planned",
        velocityPoints: (attrs.velocityPoints as number) ?? 0,
        completedPoints: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    mockSprints = [...mockSprints, created];
    return HttpResponse.json({ data: created }, { status: 201 });
  }),

  // PATCH update sprint
  http.patch("/api/v1/sprints/:id", async (req) => {
    const { id } = req.params as { id: string };
    const json = (await req.request.json()) as Record<string, unknown>;
    const attrs =
      ((json.data as Record<string, unknown>)?.attributes as Record<
        string,
        unknown
      >) ?? {};
    const idx = mockSprints.findIndex((s) => s.id === id);
    if (idx === -1) return notFound(id);
    const updated: MockSprint = {
      ...mockSprints[idx]!,
      attributes: {
        ...mockSprints[idx]!.attributes,
        ...(attrs as Partial<MockSprint["attributes"]>),
        updatedAt: new Date().toISOString(),
      },
    };
    mockSprints = mockSprints.map((s) => (s.id === id ? updated : s));
    return HttpResponse.json({ data: updated });
  }),

  // POST start sprint
  http.post("/api/v1/sprints/:id/start", (req) => {
    const { id } = req.params as { id: string };
    const idx = mockSprints.findIndex((s) => s.id === id);
    if (idx === -1) return notFound(id);
    mockSprints = mockSprints.map((s) =>
      s.id === id
        ? {
            ...s,
            attributes: {
              ...s.attributes,
              status: "active" as const,
              updatedAt: new Date().toISOString(),
            },
          }
        : s,
    );
    return HttpResponse.json({ data: mockSprints.find((s) => s.id === id) });
  }),

  // POST stop sprint
  http.post("/api/v1/sprints/:id/stop", (req) => {
    const { id } = req.params as { id: string };
    const idx = mockSprints.findIndex((s) => s.id === id);
    if (idx === -1) return notFound(id);
    mockSprints = mockSprints.map((s) =>
      s.id === id
        ? {
            ...s,
            attributes: {
              ...s.attributes,
              status: "completed" as const,
              updatedAt: new Date().toISOString(),
            },
          }
        : s,
    );
    return HttpResponse.json({ data: mockSprints.find((s) => s.id === id) });
  }),
];

export default allSprintsHandlers;
