import Route from "@ember/routing/route";
import type SprintsService from "@libs/sprints-front/services/sprints";
import type { SprintData } from "@libs/sprints-front/services/sprints";
import type TasksService from "@libs/backlog-front/services/tasks";
import type { Task } from "@libs/backlog-front/schemas/tasks";
import type TimeEntriesService from "@libs/time-tracking-front/services/time-entries";
import type CurrentProjectService from "@libs/shell-front/services/current-project";
export interface DashboardIndexModel {
    activeSprint: SprintData | null;
    tasks: Task[];
    totalHours: number;
}
export default class DashboardIndexRoute extends Route {
    sprints: SprintsService;
    tasks: TasksService;
    timeEntries: TimeEntriesService;
    currentProject: CurrentProjectService;
    model(): Promise<DashboardIndexModel>;
}
//# sourceMappingURL=index.d.ts.map