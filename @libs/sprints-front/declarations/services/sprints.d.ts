import Service from "@ember/service";
import type { Store } from "@warp-drive/core";
import type { SprintStatus } from "../schemas/sprints.ts";
export type { SprintStatus };
export interface SprintData {
    id: string;
    number: number;
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
export interface BurndownActualPoint {
    day: string;
    remaining: number;
    taskCount: number;
}
export interface BurndownIdealPoint {
    day: string;
    remaining: number;
}
export interface BurndownData {
    actual: BurndownActualPoint[];
    ideal: BurndownIdealPoint[];
}
export interface NewSprintPayload {
    projectId: string;
    name?: string;
    goal?: string | null;
    startDate?: string;
    endDate?: string;
    velocityPoints?: number;
}
export interface ClosePreviewData {
    sprintId: string;
    sprintName: string;
    number: number;
    unfinishedTasks: Array<{
        id: string;
        title: string;
        status: string;
    }>;
    unfinishedStories: Array<{
        id: string;
        title: string;
        status: string;
    }>;
    availableNextSprints: Array<{
        id: string;
        number: number;
        name: string;
        startDate: string;
    }>;
}
export type CloseAction = "send-to-backlog" | "move-to-existing" | "move-to-next";
export interface StopSprintPayload {
    action: CloseAction;
    targetSprintId?: string;
    createSprintConfig?: {
        startDate?: string;
        endDate?: string;
        name?: string;
        velocityPoints?: number;
    };
}
export interface StopSprintMeta {
    movedTasks: number;
    movedStories: number;
    targetSprintId: string | null;
    action: string | null;
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
    closePreview(sprintId: string): Promise<ClosePreviewData>;
    stop(sprintId: string, projectId: string, payload?: StopSprintPayload): Promise<{
        sprint: SprintData;
        meta: StopSprintMeta;
    }>;
    addItem(sprintId: string, kind: "epic" | "story" | "task", itemId: string): Promise<{
        addedCount: number;
        conflictCount: number;
    }>;
    loadTasks(sprintId: string): Promise<Array<Record<string, unknown>>>;
    loadBurndown(sprintId: string): Promise<BurndownData>;
    delete(id: string, projectId: string): Promise<void>;
}
declare module "@ember/service" {
    interface Registry {
        sprints: SprintsService;
    }
}
//# sourceMappingURL=sprints.d.ts.map