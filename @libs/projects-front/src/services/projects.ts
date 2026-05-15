import type { Project } from "#src/schemas/projects.ts";
import type { MemberLite } from "#src/components/member-avatar-stack.gts";
import { tracked } from "@glimmer/tracking";
import Service from "@ember/service";
import { service } from "@ember/service";
import { cacheKeyFor, type Store } from "@warp-drive/core";
import { createRecord } from "@warp-drive/utilities/json-api";

type MemberResponse = {
  data: Array<{
    id: string;
    type: "users";
    attributes: { firstName: string; lastName: string; email: string };
  }>;
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
    const { content } = await this.store.request<MemberResponse>({
      url: `/api/v1/projects/${projectId}/members`,
      method: "GET",
    });
    return content.data.map((u) => ({
      id: u.id,
      firstName: u.attributes.firstName,
      lastName: u.attributes.lastName,
    }));
  }

  public async create(data: NewProjectPayload): Promise<Project> {
    const project = this.store.createRecord<Project>("projects", data);
    const request = createRecord(project);

    request.body = JSON.stringify({
      data: this.store.cache.peek(cacheKeyFor(project)),
    });

    await this.store.request<{ data: Project }>(request);
    // Reload pour avoir les données correctement désérialisées (content.data
    // de createRecord retourne l'enveloppe JSON:API brute, pas un Project flat)
    await this.loadAll();
    return this.list[this.list.length - 1]!;
  }
}

declare module "@ember/service" {
  interface Registry {
    projects: ProjectsService;
  }
}
