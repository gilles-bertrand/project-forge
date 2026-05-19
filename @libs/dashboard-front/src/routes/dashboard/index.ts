import Route from "@ember/routing/route";
import { service } from "@ember/service";
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
  @service declare sprints: SprintsService;
  @service declare tasks: TasksService;
  @service declare timeEntries: TimeEntriesService;
  @service declare currentProject: CurrentProjectService;

  async model(): Promise<DashboardIndexModel> {
    const projectId = this.currentProject.currentProjectId;
    if (!projectId) {
      return { activeSprint: null, tasks: [], totalHours: 0 };
    }
    const [activeSprint, tasks, summary] = await Promise.all([
      this.sprints.loadActive(projectId),
      this.tasks.loadAllByProject(projectId),
      this.timeEntries.loadSummary("week", projectId),
    ]);
    return { activeSprint, tasks, totalHours: summary.totalHours };
  }
}
