import Service from "@ember/service";
import type { Store } from "@warp-drive/core";
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
    store: Store;
    list: SprintData[];
    loading: boolean;
    loadByProject(projectId: string): Promise<SprintData[]>;
    loadActive(projectId: string): Promise<SprintData | null>;
    findById(id: string): Promise<SprintData>;
    create(payload: NewSprintPayload): Promise<SprintData>;
    update(id: string, partial: Partial<NewSprintPayload>, opts?: {
        refresh?: boolean;
    }): Promise<SprintData>;
    start(sprintId: string, projectId: string): Promise<SprintData>;
    stop(sprintId: string, projectId: string): Promise<SprintData>;
    loadTasks(sprintId: string): Promise<Array<Record<string, unknown>>>;
}
declare module "@ember/service" {
    interface Registry {
        sprints: SprintsService;
    }
}
//# sourceMappingURL=sprints.d.ts.map