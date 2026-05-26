import type { Project } from "#src/schemas/projects.ts";
import type { MemberLite } from "#src/components/member-avatar-stack.gts";
import { tracked } from "@glimmer/tracking";
import Service from "@ember/service";
import { service } from "@ember/service";
import { cacheKeyFor, type Store } from "@warp-drive/core";
import { createRecord } from "@warp-drive/utilities/json-api";
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
  >
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
    const project = this.store.createRecord<Project>("projects", data);
    const request = createRecord(project);

    request.body = JSON.stringify({
      data: this.store.cache.peek(cacheKeyFor(project)),
    });

    const response = await this.store.request<{ data: Project }>(request);
    await this.loadAll();
    const createdId = response.content.data.id;
    const created = createdId
      ? this.list.find((p) => p.id === createdId)
      : undefined;
    if (!created) {
      throw new Error("Created project not found after reload");
    }
    return created;
  }

  public async update(
    id: string,
    data: UpdateProjectPayload,
  ): Promise<Project> {
    // Use authFetch instead of store.request — WarpDrive's Fetch handler
    // appends Content-Type: application/json to every request, creating a
    // multi-value Content-Type header that Fastify rejects with 415.
    const res = await authFetch(`/api/v1/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/vnd.api+json" },
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
    try {
      await this.store.request({
        url: `/api/v1/projects/${projectId}/members`,
        method: "POST",
        headers: new Headers({ "Content-Type": "application/vnd.api+json" }),
        body: JSON.stringify({
          data: { attributes: { userId, role: "member" } },
        }),
      });
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      if (status !== 409) {
        throw error;
      }
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
