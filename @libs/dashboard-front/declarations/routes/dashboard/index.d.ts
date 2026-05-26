import Route from "@ember/routing/route";
import Service from "@ember/service";
import type SprintsService from "@libs/sprints-front/services/sprints";
import type { SprintData } from "@libs/sprints-front/services/sprints";
import type TasksService from "@libs/backlog-front/services/tasks";
import type { Task } from "@libs/backlog-front/schemas/tasks";
import type TimeEntriesService from "@libs/time-tracking-front/services/time-entries";
import type CurrentProjectService from "@libs/shell-front/services/current-project";
export type DashboardProject = {
    id?: string;
    name: string;
};
interface ProjectsMinimalService extends Service {
    list: DashboardProject[];
    loadAll: () => Promise<DashboardProject[]>;
}
export type DashboardIndexModel = {
    mode: "no-project";
    projects: DashboardProject[];
} | {
    mode: "no-sprint";
    currentProject: DashboardProject;
    tasks: Task[];
} | {
    mode: "with-sprint";
    currentProject: DashboardProject;
    activeSprint: SprintData;
    tasks: Task[];
    totalHours: number;
};
export default class DashboardIndexRoute extends Route {
    sprints: SprintsService;
    tasks: TasksService;
    timeEntries: TimeEntriesService;
    currentProject: CurrentProjectService;
    projects: ProjectsMinimalService;
    model(): Promise<DashboardIndexModel>;
}
export {};
//# sourceMappingURL=index.d.ts.map