import Service from "@ember/service";
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
export default class TimeEntriesService extends Service {
    list: TimeEntryData[];
    loading: boolean;
    loadByProject(projectId: string, opts?: LoadOptions): Promise<TimeEntriesResult>;
    loadByUser(userId: string, opts?: LoadOptions): Promise<TimeEntriesResult>;
    loadByTask(taskId: string): Promise<TimeEntriesResult>;
    loadSummary(scope: "week" | "month", projectId?: string, userId?: string): Promise<SummaryResult>;
    create(payload: NewTimeEntryPayload): Promise<TimeEntryData>;
    update(id: string, partial: Partial<NewTimeEntryPayload>, opts?: {
        refresh?: boolean;
        projectId?: string;
    }): Promise<TimeEntryData>;
    delete(id: string, projectId?: string): Promise<void>;
}
declare module "@ember/service" {
    interface Registry {
        "time-entries": TimeEntriesService;
    }
}
//# sourceMappingURL=time-entries.d.ts.map