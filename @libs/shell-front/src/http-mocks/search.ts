import { http, HttpResponse } from "msw";

type SearchResult = {
  id: string;
  type: "projects" | "tasks" | "user-stories" | "sprints";
  attributes: { name?: string; title?: string; number?: number };
};

const SEARCH_ITEMS: SearchResult[] = [
  {
    id: "proj-1",
    type: "projects",
    attributes: { name: "E-Commerce Platform" },
  },
  {
    id: "proj-2",
    type: "projects",
    attributes: { name: "Mobile Banking App" },
  },
  { id: "proj-3", type: "projects", attributes: { name: "CRM System" } },
  {
    id: "epic-1",
    type: "user-stories",
    attributes: { title: "Authentication & Onboarding" },
  },
  {
    id: "us-1",
    type: "user-stories",
    attributes: { title: "Login avec email / mot de passe" },
  },
  {
    id: "us-2",
    type: "user-stories",
    attributes: { title: "Réinitialisation du mot de passe" },
  },
  {
    id: "us-3",
    type: "user-stories",
    attributes: { title: "Profil utilisateur" },
  },
  {
    id: "task-10",
    type: "tasks",
    attributes: { number: 10, title: "Page de connexion" },
  },
  {
    id: "task-11",
    type: "tasks",
    attributes: { number: 11, title: "Route POST /auth/login" },
  },
  {
    id: "task-12",
    type: "tasks",
    attributes: { number: 12, title: "Schéma base de données projets" },
  },
  {
    id: "task-13",
    type: "tasks",
    attributes: { number: 13, title: "Route POST /projects" },
  },
  {
    id: "sprint-1",
    type: "sprints",
    attributes: { title: "Sprint 1 — Authentication & Onboarding" },
  },
  {
    id: "sprint-2",
    type: "sprints",
    attributes: { title: "Sprint 2 — Project Management" },
  },
];

export const searchHandlers = [
  http.get("/api/v1/search/", ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").toLowerCase().trim();

    if (q.length < 2) {
      return HttpResponse.json({ data: [], meta: { total: 0 } });
    }

    const results = SEARCH_ITEMS.filter((item) => {
      const text = (
        item.attributes.name ??
        item.attributes.title ??
        ""
      ).toLowerCase();
      return text.includes(q);
    });

    return HttpResponse.json({
      data: results,
      meta: { total: results.length },
    });
  }),
];
