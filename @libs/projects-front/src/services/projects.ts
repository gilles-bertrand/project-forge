import type { Project } from "#src/schemas/projects.ts";
import type { MemberLite } from "#src/components/member-avatar-stack.gts";
import { tracked } from "@glimmer/tracking";
import Service from "@ember/service";
import { service } from "@ember/service";
import { type Store } from "@warp-drive/core";
import { authFetch } from "@libs/shared-front/utils/auth-fetch";

type MemberResponse = {
  data: Array<{
    id: string;
    type: "project-members";
    attributes: {
      userId: string;
      firstName: string | null;
      lastName: string | null;
      color: string | null;
    };
  }>;
};

export type ProjectStats = {
  projectId: string;
  epics: { total: number; done: number };
  userStories: { total: number; done: number };
  tasks: { total: number; done: number };
  sprints: { total: number; active: number };
  currentSprint: { id: string | null; tasksDone: number; tasksTotal: number };
};

export type NewProjectPayload = {
  name: string;
  description: string;
  status: Project["status"];
  avatar?: string | null;
  githubUrl?: string | null;
  responsibleId: string;
  createdById: string;
};

export type UpdateProjectPayload = Partial<
  Pick<
    NewProjectPayload,
    "name" | "description" | "status" | "avatar" | "githubUrl" | "responsibleId"
  > & {
    sprintDurationDays: number;
    defaultVelocityPoints: number;
  }
>;

export default class ProjectsService extends Service {
  @service declare store: Store;

  @tracked list: Project[] = [];
  @tracked loading = false;

  public async loadAll(): Promise<Project[]> {
    this.loading = true;
    try {
      const { content } = await this.store.request<{ data: Project[] }>({
        url: "/api/v1/projects",
        method: "GET",
        cacheOptions: { reload: true },
      });
      this.list = content.data;
      return this.list;
    } finally {
      this.loading = false;
    }
  }

  public async findById(id: string): Promise<Project> {
    const { content } = await this.store.request<{ data: Project }>({
      url: `/api/v1/projects/${id}`,
      method: "GET",
    });
    return content.data;
  }

  public async loadMembers(projectId: string): Promise<MemberLite[]> {
    // Use authFetch — the JSONAPICache flattens attributes onto the record
    // so `m.attributes.firstName` is no longer accessible after caching.
    const res = await authFetch(`/api/v1/projects/${projectId}/members`);
    if (!res.ok) {
      throw new Error(`loadMembers failed: ${String(res.status)}`);
    }
    const json = (await res.json()) as MemberResponse;
    return json.data
      .filter((m) => m.attributes.firstName && m.attributes.lastName)
      .map((m) => ({
        id: m.attributes.userId,
        firstName: m.attributes.firstName!,
        lastName: m.attributes.lastName!,
        color: m.attributes.color,
      }));
  }

  public async loadStats(projectId: string): Promise<ProjectStats> {
    // Use authFetch — payload is not JSON:API (no id/type wrapper), so it
    // cannot go through WarpDrive's JSONAPICache.
    const res = await authFetch(`/api/v1/projects/${projectId}/stats`);
    if (!res.ok) {
      throw new Error(`loadStats failed: ${String(res.status)}`);
    }
    const json = (await res.json()) as { data: ProjectStats };
    return json.data;
  }

  public async create(data: NewProjectPayload): Promise<Project> {
    // authFetch + application/json: backend's vnd.api+json parser is
    // broken in Fastify v5 (FST_ERR_CTP_INVALID_JSON_BODY).
    const res = await authFetch("/api/v1/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { attributes: data } }),
    });
    if (!res.ok) {
      throw Object.assign(new Error(`create failed: ${String(res.status)}`), {
        status: res.status,
      });
    }
    const { data: created } = (await res.json()) as { data: { id: string } };
    await this.loadAll();
    const project = this.list.find((p) => p.id === created.id);
    if (!project) {
      throw new Error("Created project not found after reload");
    }
    return project;
  }

  public async update(
    id: string,
    data: UpdateProjectPayload,
  ): Promise<Project> {
    // Use authFetch instead of store.request — WarpDrive's Fetch handler
    // appends Content-Type: application/json to every request, creating a
    // multi-value Content-Type header that Fastify rejects with 415.
    // Use application/json (not vnd.api+json): the backend's custom parser
    // for vnd.api+json is broken in Fastify v5; the default JSON parser
    // accepts the same JSON:API-shaped body.
    const res = await authFetch(`/api/v1/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "projects", id, attributes: data },
      }),
    });
    if (!res.ok) {
      throw Object.assign(new Error(`update failed: ${String(res.status)}`), {
        status: res.status,
      });
    }
    await this.loadAll();
    const project = this.list.find((p) => p.id === id);
    if (project === undefined) {
      throw new Error(`Project with id "${id}" not found after update`);
    }
    return project;
  }

  public async addMember(projectId: string, userId: string): Promise<void> {
    // authFetch + application/json: same rationale as update() — backend's
    // vnd.api+json parser is broken in Fastify v5.
    const res = await authFetch(`/api/v1/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { attributes: { userId, role: "member" } },
      }),
    });
    if (!res.ok && res.status !== 409) {
      throw Object.assign(
        new Error(`addMember failed: ${String(res.status)}`),
        { status: res.status },
      );
    }
  }

  public async removeMember(projectId: string, userId: string): Promise<void> {
    // Use authFetch (raw fetch) to bypass WarpDrive's Fetch handler that
    // appends Content-Type: application/json to every request — which on a
    // body-less DELETE produces a multi-value Content-Type header that
    // Fastify rejects with 415.
    const res = await authFetch(
      `/api/v1/projects/${projectId}/members/${userId}`,
      { method: "DELETE" },
    );
    if (!res.ok && res.status !== 404) {
      throw Object.assign(
        new Error(`removeMember failed: ${String(res.status)}`),
        { status: res.status },
      );
    }
  }

  public async delete(id: string): Promise<void> {
    // Use authFetch instead of store.request — see removeMember for rationale.
    const res = await authFetch(`/api/v1/projects/${id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
      throw Object.assign(new Error(`delete failed: ${String(res.status)}`), {
        status: res.status,
      });
    }
    // 204 success OR 404 already-deleted → clean local state
    this.list = this.list.filter((p) => p.id !== id);
  }
}

declare module "@ember/service" {
  interface Registry {
    projects: ProjectsService;
  }
}
