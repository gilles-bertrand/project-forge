/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { http, HttpResponse } from "msw";

type ProjectStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "archived";

type MockProject = {
  id: string;
  type: "projects";
  attributes: {
    name: string;
    description: string;
    status: ProjectStatus;
    avatar: string | null;
    githubUrl: string | null;
    responsibleId: string;
    createdById: string;
    createdAt: string;
    updatedAt: string;
  };
};

let mockProjects: MockProject[] = [
  {
    id: "proj-1",
    type: "projects",
    attributes: {
      name: "E-Commerce Platform",
      description:
        "Plateforme de vente en ligne complète avec gestion des stocks",
      status: "active",
      avatar: null,
      githubUrl: null,
      responsibleId: "user-2",
      createdById: "user-2",
      createdAt: "2025-01-01T10:00:00Z",
      updatedAt: "2025-01-01T10:00:00Z",
    },
  },
  {
    id: "proj-2",
    type: "projects",
    attributes: {
      name: "Mobile Banking App",
      description: "Application mobile de gestion bancaire",
      status: "active",
      avatar: null,
      githubUrl: null,
      responsibleId: "user-2",
      createdById: "user-2",
      createdAt: "2025-01-05T10:00:00Z",
      updatedAt: "2025-01-05T10:00:00Z",
    },
  },
  {
    id: "proj-3",
    type: "projects",
    attributes: {
      name: "CRM System",
      description: "Système de gestion de la relation client",
      status: "planned",
      avatar: null,
      githubUrl: null,
      responsibleId: "user-2",
      createdById: "user-2",
      createdAt: "2025-01-10T10:00:00Z",
      updatedAt: "2025-01-10T10:00:00Z",
    },
  },
];

const mockMembers = [
  {
    id: "1",
    type: "users" as const,
    attributes: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
    },
  },
  {
    id: "2",
    type: "users" as const,
    attributes: {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
    },
  },
  {
    id: "3",
    type: "users" as const,
    attributes: {
      firstName: "Bob Johnson",
      lastName: "Johnson",
      email: "bob.johnson@example.com",
    },
  },
];

function notFound(id: string) {
  return HttpResponse.json(
    {
      errors: [
        {
          status: "404",
          title: "Project Not Found",
          code: "PROJECT_NOT_FOUND",
          detail: `Project with id ${id} not found`,
        },
      ],
    },
    { status: 404 },
  );
}

export const allProjectsHandlers = [
  http.get("/api/v1/projects", () => {
    return HttpResponse.json({
      data: mockProjects,
      meta: {
        count: mockProjects.length,
      },
    });
  }),
  http.get("/api/v1/projects/:id", (req) => {
    const { id } = req.params as { id: string };
    const project = mockProjects.find((p) => p.id === id);
    if (!project) {
      return notFound(id);
    }
    return HttpResponse.json({ data: project });
  }),
  http.post("/api/v1/projects", async (req) => {
    const json = (await req.request.json()) as Record<string, any>;
    const attributes = json.data?.attributes ?? {};
    const id =
      (json.data?.id as string | undefined) ??
      (json.data?.lid as string | undefined) ??
      `proj-${Date.now()}`;

    const now = new Date().toISOString();
    const created: MockProject = {
      id,
      type: "projects",
      attributes: {
        name: attributes.name ?? "",
        description: attributes.description ?? "",
        status: (attributes.status as ProjectStatus) ?? "planned",
        avatar: attributes.avatar ?? null,
        githubUrl: attributes.githubUrl ?? null,
        responsibleId: attributes.responsibleId ?? "user-2",
        createdById: attributes.createdById ?? "user-2",
        createdAt: now,
        updatedAt: now,
      },
    };
    mockProjects = [...mockProjects, created];
    return HttpResponse.json({ data: created }, { status: 201 });
  }),
  http.patch("/api/v1/projects/:id", async (req) => {
    const { id } = req.params as { id: string };
    const project = mockProjects.find((p) => p.id === id);
    if (!project) {
      return notFound(id);
    }
    const json = (await req.request.json()) as Record<string, any>;
    const attributes = json.data?.attributes ?? {};
    const updated: MockProject = {
      ...project,
      attributes: {
        ...project.attributes,
        ...attributes,
        updatedAt: new Date().toISOString(),
      },
    };
    mockProjects = mockProjects.map((p) => (p.id === id ? updated : p));
    return HttpResponse.json({ data: updated });
  }),
  http.delete("/api/v1/projects/:id", (req) => {
    const { id } = req.params as { id: string };
    const project = mockProjects.find((p) => p.id === id);
    if (!project) {
      return notFound(id);
    }
    mockProjects = mockProjects.filter((p) => p.id !== id);
    return HttpResponse.json({ data: null }, { status: 204 });
  }),
  http.get("/api/v1/projects/:id/members", (req) => {
    const { id } = req.params as { id: string };
    const project = mockProjects.find((p) => p.id === id);
    if (!project) {
      return notFound(id);
    }
    return HttpResponse.json({
      data: mockMembers,
      meta: { count: mockMembers.length },
    });
  }),
];

export default allProjectsHandlers;
