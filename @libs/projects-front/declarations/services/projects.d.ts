import type { Project } from "#src/schemas/projects.ts";
import type { MemberLite } from '#src/components/member-avatar-stack';
import Service from "@ember/service";
import { type Store } from "@warp-drive/core";
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
    store: Store;
    list: Project[];
    loading: boolean;
    loadAll(): Promise<Project[]>;
    findById(id: string): Promise<Project>;
    loadMembers(projectId: string): Promise<MemberLite[]>;
    create(data: NewProjectPayload): Promise<Project>;
}
declare module "@ember/service" {
    interface Registry {
        projects: ProjectsService;
    }
}
//# sourceMappingURL=projects.d.ts.map