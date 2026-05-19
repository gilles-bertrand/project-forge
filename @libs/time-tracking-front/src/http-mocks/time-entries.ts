import { HttpResponse } from "msw";
import { createOpenApiHttp } from "openapi-msw";
import type { paths } from "@apps/backend";

const http = createOpenApiHttp<paths>();

const NOW = new Date();
function daysAgo(n: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

type MockTimeEntry = {
  id: string;
  type: "time-entries";
  attributes: {
    taskId: string;
    userId: string;
    projectId: string;
    hours: number;
    date: string;
    description: string | null;
    createdAt: string;
  };
};

let mockEntries: MockTimeEntry[] = [
  {
    id: "te-1",
    type: "time-entries",
    attributes: {
      taskId: "task-1",
      userId: "u1",
      projectId: "proj-1",
      hours: 3,
      date: daysAgo(0),
      description: "Implémentation JWT",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-2",
    type: "time-entries",
    attributes: {
      taskId: "task-2",
      userId: "u1",
      projectId: "proj-1",
      hours: 2,
      date: daysAgo(1),
      description: "Page de profil UI",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-3",
    type: "time-entries",
    attributes: {
      taskId: "task-3",
      userId: "u2",
      projectId: "proj-1",
      hours: 1.5,
      date: daysAgo(1),
      description: "Fix formulaire reset",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-4",
    type: "time-entries",
    attributes: {
      taskId: "task-4",
      userId: "u1",
      projectId: "proj-1",
      hours: 4,
      date: daysAgo(2),
      description: "API membres projet",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-5",
    type: "time-entries",
    attributes: {
      taskId: "task-5",
      userId: "u2",
      projectId: "proj-1",
      hours: 2.5,
      date: daysAgo(3),
      description: "Invitation email component",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-6",
    type: "time-entries",
    attributes: {
      taskId: "task-6",
      userId: "u1",
      projectId: "proj-2",
      hours: 5,
      date: daysAgo(3),
      description: "KPIs aggregation query",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-7",
    type: "time-entries",
    attributes: {
      taskId: "task-7",
      userId: "u2",
      projectId: "proj-2",
      hours: 3,
      date: daysAgo(4),
      description: "PDF export integration",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-8",
    type: "time-entries",
    attributes: {
      taskId: "task-1",
      userId: "u1",
      projectId: "proj-1",
      hours: 1,
      date: daysAgo(5),
      description: "Code review JWT",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-9",
    type: "time-entries",
    attributes: {
      taskId: "task-8",
      userId: "u2",
      projectId: "proj-3",
      hours: 2,
      date: daysAgo(5),
      description: "Zod 4 migration",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-10",
    type: "time-entries",
    attributes: {
      taskId: "task-9",
      userId: "u1",
      projectId: "proj-3",
      hours: 3.5,
      date: daysAgo(7),
      description: "Audit sécurité",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-11",
    type: "time-entries",
    attributes: {
      taskId: "task-3",
      userId: "u1",
      projectId: "proj-1",
      hours: 2,
      date: daysAgo(8),
      description: "Retour review reset password",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-12",
    type: "time-entries",
    attributes: {
      taskId: "task-10",
      userId: "u2",
      projectId: "proj-1",
      hours: 4,
      date: daysAgo(9),
      description: "Page de connexion",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-13",
    type: "time-entries",
    attributes: {
      taskId: "task-11",
      userId: "u1",
      projectId: "proj-1",
      hours: 2.5,
      date: daysAgo(10),
      description: "Route POST auth/login",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-14",
    type: "time-entries",
    attributes: {
      taskId: "task-12",
      userId: "u2",
      projectId: "proj-2",
      hours: 3,
      date: daysAgo(12),
      description: "Schema BDD projets",
      createdAt: NOW.toISOString(),
    },
  },
  {
    id: "te-15",
    type: "time-entries",
    attributes: {
      taskId: "task-4",
      userId: "u1",
      projectId: "proj-1",
      hours: 1.5,
      date: daysAgo(14),
      description: "Tests API membres",
      createdAt: NOW.toISOString(),
    },
  },
];

function applyFilters(entries: MockTimeEntry[], url: URL): MockTimeEntry[] {
  let result = [...entries];
  const userId = url.searchParams.get("filter[userId]");
  const projectId = url.searchParams.get("filter[projectId]");
  const taskId = url.searchParams.get("filter[taskId]");
  const from = url.searchParams.get("filter[date.gte]");
  const to = url.searchParams.get("filter[date.lte]");
  if (userId) result = result.filter((e) => e.attributes.userId === userId);
  if (projectId)
    result = result.filter((e) => e.attributes.projectId === projectId);
  if (taskId) result = result.filter((e) => e.attributes.taskId === taskId);
  if (from) result = result.filter((e) => e.attributes.date >= from);
  if (to) result = result.filter((e) => e.attributes.date <= to);
  result.sort((a, b) => b.attributes.date.localeCompare(a.attributes.date));
  return result;
}

export const allTimeEntriesHandlers = [
  http.get("/api/v1/time-entries/", ({ request }) => {
    const url = new URL(request.url);
    const filtered = applyFilters(mockEntries, url);
    const limit = parseInt(url.searchParams.get("page[limit]") ?? "50", 10);
    const offset = parseInt(url.searchParams.get("page[offset]") ?? "0", 10);
    const paginated = filtered.slice(offset, offset + limit);
    const totalHours = filtered.reduce((sum, e) => sum + e.attributes.hours, 0);
    return HttpResponse.json({
      data: paginated,
      meta: {
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit),
        totalHours,
      },
    });
  }),

  http.get("/api/v1/time-entries/{id}", ({ params }) => {
    const entry = mockEntries.find((e) => e.id === params["id"]);
    if (!entry) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ data: entry });
  }),

  http.post("/api/v1/time-entries/", async ({ request }) => {
    const body = (await request.json()) as {
      data: { attributes: MockTimeEntry["attributes"] };
    };
    const newEntry: MockTimeEntry = {
      id: crypto.randomUUID(),
      type: "time-entries",
      attributes: {
        ...body.data.attributes,
        createdAt: new Date().toISOString(),
      },
    };
    mockEntries = [newEntry, ...mockEntries];
    return HttpResponse.json({ data: newEntry });
  }),

  http.patch("/api/v1/time-entries/{id}", async ({ params, request }) => {
    const body = (await request.json()) as {
      data: { attributes: Partial<MockTimeEntry["attributes"]> };
    };
    const idx = mockEntries.findIndex((e) => e.id === params["id"]);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    mockEntries[idx] = {
      ...mockEntries[idx]!,
      attributes: { ...mockEntries[idx]!.attributes, ...body.data.attributes },
    };
    return HttpResponse.json({ data: mockEntries[idx] });
  }),

  http.delete("/api/v1/time-entries/{id}", ({ params }) => {
    mockEntries = mockEntries.filter((e) => e.id !== params["id"]);
    return new HttpResponse(null, { status: 204 });
  }),
];
