import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { authFetch } from "@libs/shared-front/utils/auth-fetch";

export interface TimeEntryData {
  id: string;
  taskId: string;
  userId: string;
  projectId: string;
  hours: number;
  date: string;
  description: string | null;
  createdAt: string;
}

export interface NewTimeEntryPayload {
  taskId: string;
  userId: string;
  projectId: string;
  hours: number;
  date: string;
  description?: string | null;
}

export interface TimeEntriesMeta {
  total: number;
  pages: number;
  totalHours: number;
}

export interface TimeEntriesResult {
  data: TimeEntryData[];
  meta: TimeEntriesMeta;
}

export interface LoadOptions {
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface SummaryResult {
  totalHours: number;
  taskCount: number;
}

function buildQuery(
  params: Record<string, string | number | undefined>,
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      parts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
      );
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

function flattenEntry(raw: {
  id: string;
  attributes: Omit<TimeEntryData, "id">;
}): TimeEntryData {
  return { id: raw.id, ...raw.attributes };
}

export default class TimeEntriesService extends Service {
  @tracked list: TimeEntryData[] = [];
  @tracked loading = false;

  async loadByProject(
    projectId: string,
    opts: LoadOptions = {},
  ): Promise<TimeEntriesResult> {
    this.loading = true;
    try {
      const qs = buildQuery({
        "filter[projectId]": projectId,
        sort: "-date",
        "page[limit]": opts.limit ?? 50,
        "page[offset]": opts.offset ?? 0,
        ...(opts.from ? { "filter[date.gte]": opts.from } : {}),
        ...(opts.to ? { "filter[date.lte]": opts.to } : {}),
      });
      const res = await authFetch(`/api/v1/time-entries/${qs}`);
      if (!res.ok) {
        this.list = [];
        return {
          data: this.list,
          meta: { total: 0, pages: 0, totalHours: 0 },
        };
      }
      const json = (await res.json()) as {
        data?: Array<{ id: string; attributes: Omit<TimeEntryData, "id"> }>;
        meta?: TimeEntriesMeta;
      };
      this.list = (json.data ?? []).map(flattenEntry);
      return {
        data: this.list,
        meta: json.meta ?? { total: 0, pages: 0, totalHours: 0 },
      };
    } finally {
      this.loading = false;
    }
  }

  async loadByUser(
    userId: string,
    opts: LoadOptions = {},
  ): Promise<TimeEntriesResult> {
    this.loading = true;
    try {
      const qs = buildQuery({
        "filter[userId]": userId,
        sort: "-date",
        "page[limit]": opts.limit ?? 50,
        "page[offset]": opts.offset ?? 0,
        ...(opts.from ? { "filter[date.gte]": opts.from } : {}),
        ...(opts.to ? { "filter[date.lte]": opts.to } : {}),
      });
      const res = await authFetch(`/api/v1/time-entries/${qs}`);
      if (!res.ok) {
        this.list = [];
        return {
          data: this.list,
          meta: { total: 0, pages: 0, totalHours: 0 },
        };
      }
      const json = (await res.json()) as {
        data?: Array<{ id: string; attributes: Omit<TimeEntryData, "id"> }>;
        meta?: TimeEntriesMeta;
      };
      this.list = (json.data ?? []).map(flattenEntry);
      return {
        data: this.list,
        meta: json.meta ?? { total: 0, pages: 0, totalHours: 0 },
      };
    } finally {
      this.loading = false;
    }
  }

  async loadByTask(taskId: string): Promise<TimeEntriesResult> {
    const qs = buildQuery({ "filter[taskId]": taskId, sort: "-date" });
    const res = await authFetch(`/api/v1/time-entries/${qs}`);
    if (!res.ok) {
      return { data: [], meta: { total: 0, pages: 0, totalHours: 0 } };
    }
    const json = (await res.json()) as {
      data?: Array<{ id: string; attributes: Omit<TimeEntryData, "id"> }>;
      meta?: TimeEntriesMeta;
    };
    return {
      data: (json.data ?? []).map(flattenEntry),
      meta: json.meta ?? { total: 0, pages: 0, totalHours: 0 },
    };
  }

  async loadSummary(
    scope: "week" | "month",
    projectId?: string,
    userId?: string,
  ): Promise<SummaryResult> {
    const now = new Date();
    let from: string;
    if (scope === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      from = d.toISOString().slice(0, 10);
    } else {
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }
    const params: Record<string, string | number | undefined> = {
      "filter[date.gte]": from,
      sort: "-date",
      "page[limit]": 200,
    };
    if (projectId) params["filter[projectId]"] = projectId;
    if (userId) params["filter[userId]"] = userId;
    const qs = buildQuery(params);
    const res = await authFetch(`/api/v1/time-entries/${qs}`);
    if (!res.ok) {
      return { totalHours: 0, taskCount: 0 };
    }
    const json = (await res.json()) as {
      data?: Array<{ id: string; attributes: Omit<TimeEntryData, "id"> }>;
      meta?: TimeEntriesMeta;
    };
    const entries = json.data ?? [];
    const taskIds = new Set(entries.map((e) => e.attributes.taskId));
    return {
      totalHours: json.meta?.totalHours ?? 0,
      taskCount: taskIds.size,
    };
  }

  async create(payload: NewTimeEntryPayload): Promise<TimeEntryData> {
    const res = await authFetch("/api/v1/time-entries/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "time-entries", attributes: payload },
      }),
    });
    const json = (await res.json()) as {
      data: { id: string; attributes: Omit<TimeEntryData, "id"> };
    };
    const created = flattenEntry(json.data);
    if (payload.projectId) {
      await this.loadByProject(payload.projectId);
    }
    return created;
  }

  async update(
    id: string,
    partial: Partial<NewTimeEntryPayload>,
    opts: { refresh?: boolean; projectId?: string } = { refresh: true },
  ): Promise<TimeEntryData> {
    const res = await authFetch(`/api/v1/time-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { type: "time-entries", id, attributes: partial },
      }),
    });
    const json = (await res.json()) as {
      data: { id: string; attributes: Omit<TimeEntryData, "id"> };
    };
    const updated = flattenEntry(json.data);
    if (opts.refresh !== false && opts.projectId) {
      await this.loadByProject(opts.projectId);
    }
    return updated;
  }

  async delete(id: string, projectId?: string): Promise<void> {
    await authFetch(`/api/v1/time-entries/${id}`, { method: "DELETE" });
    if (projectId) {
      await this.loadByProject(projectId);
    } else {
      this.list = this.list.filter((e) => e.id !== id);
    }
  }
}

declare module "@ember/service" {
  interface Registry {
    "time-entries": TimeEntriesService;
  }
}
