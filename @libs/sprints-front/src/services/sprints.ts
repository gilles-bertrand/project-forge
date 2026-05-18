import Service from "@ember/service";
import { service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import type { Store } from "@warp-drive/core";
import { authFetch } from "@libs/shared-front/utils/auth-fetch";
import type { SprintStatus } from "../schemas/sprints.ts";

export type { SprintStatus };

export interface SprintData {
  id: string;
  name: string;
  goal: string | null;
  projectId: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  velocityPoints: number;
  completedPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewSprintPayload {
  name: string;
  goal?: string | null;
  projectId: string;
  startDate: string;
  endDate: string;
  velocityPoints?: number;
}

export default class SprintsService extends Service {
  @service declare store: Store;

  @tracked list: SprintData[] = [];
  @tracked loading = false;

  async loadByProject(projectId: string): Promise<SprintData[]> {
    this.loading = true;
    try {
      const res = await authFetch(`/api/v1/projects/${projectId}/sprints`);
      if (!res.ok) {
        this.list = [];
        return this.list;
      }
      const json = (await res.json()) as {
        data?: Array<{ id: string; attributes: Omit<SprintData, "id"> }>;
      };
      this.list = (json.data ?? []).map((s) => ({ id: s.id, ...s.attributes }));
      return this.list;
    } finally {
      this.loading = false;
    }
  }

  async loadActive(projectId: string): Promise<SprintData | null> {
    const all = await this.loadByProject(projectId);
    return all.find((s) => s.status === "active") ?? null;
  }

  async findById(id: string): Promise<SprintData> {
    const res = await authFetch(`/api/v1/sprints/${id}`);
    const json = (await res.json()) as {
      data: { id: string; attributes: Omit<SprintData, "id"> };
    };
    return { id: json.data.id, ...json.data.attributes };
  }

  async create(payload: NewSprintPayload): Promise<SprintData> {
    const res = await authFetch("/api/v1/sprints/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { type: "sprints", attributes: payload } }),
    });
    const json = (await res.json()) as {
      data: { id: string; attributes: Omit<SprintData, "id"> };
    };
    const created = { id: json.data.id, ...json.data.attributes };
    await this.loadByProject(payload.projectId);
    return created;
  }

  async update(
    id: string,
    partial: Partial<NewSprintPayload>,
    opts: { refresh?: boolean } = { refresh: true },
  ): Promise<SprintData> {
    const res = await authFetch(`/api/v1/sprints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "sprints", id, attributes: partial },
      }),
    });
    const json = (await res.json()) as {
      data: { id: string; attributes: Omit<SprintData, "id"> };
    };
    const updated = { id: json.data.id, ...json.data.attributes };
    if (opts.refresh !== false && partial.projectId) {
      await this.loadByProject(partial.projectId);
    }
    return updated;
  }

  async start(sprintId: string, projectId: string): Promise<SprintData> {
    const res = await authFetch(`/api/v1/sprints/${sprintId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const json = (await res.json()) as {
      data: { id: string; attributes: Omit<SprintData, "id"> };
    };
    await this.loadByProject(projectId);
    return { id: json.data.id, ...json.data.attributes };
  }

  async stop(sprintId: string, projectId: string): Promise<SprintData> {
    const res = await authFetch(`/api/v1/sprints/${sprintId}/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const json = (await res.json()) as {
      data: { id: string; attributes: Omit<SprintData, "id"> };
    };
    await this.loadByProject(projectId);
    return { id: json.data.id, ...json.data.attributes };
  }

  async loadTasks(sprintId: string): Promise<Array<Record<string, unknown>>> {
    const res = await authFetch(`/api/v1/sprints/${sprintId}/tasks`);
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: Array<{ id: string; attributes: Record<string, unknown> }>;
    };
    return (json.data ?? []).map((t) => ({ id: t.id, ...t.attributes }));
  }
}

declare module "@ember/service" {
  interface Registry {
    sprints: SprintsService;
  }
}
