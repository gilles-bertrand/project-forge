import type { Project } from "#src/schemas/projects.ts";
import type { MemberLite } from '#src/components/member-avatar-stack';
import Service from "@ember/service";
import { type Store } from "@warp-drive/core";
export type ProjectStats = {
    projectId: string;
    epics: {
        total: number;
        done: number;
    };
    userStories: {
        total: number;
        done: number;
    };
    tasks: {
        total: number;
        done: number;
    };
    sprints: {
        total: number;
        active: number;
    };
    currentSprint: {
        id: string | null;
        tasksDone: number;
        tasksTotal: number;
    };
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
export type UpdateProjectPayload = Partial<Pick<NewProjectPayload, "name" | "description" | "status" | "avatar" | "githubUrl" | "responsibleId">>;
export default class ProjectsService extends Service {
    store: Store;
    list: Project[];
    loading: boolean;
    loadAll(): Promise<Project[]>;
    findById(id: string): Promise<Project>;
    loadMembers(projectId: string): Promise<MemberLite[]>;
    loadStats(projectId: string): Promise<ProjectStats>;
    create(data: NewProjectPayload): Promise<Project>;
    update(id: string, data: UpdateProjectPayload): Promise<Project>;
    addMember(projectId: string, userId: string): Promise<void>;
    removeMember(projectId: string, userId: string): Promise<void>;
    delete(id: string): Promise<void>;
}
declare module "@ember/service" {
    interface Registry {
        projects: ProjectsService;
    }
}
//# sourceMappingURL=projects.d.ts.map