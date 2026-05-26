import Route from "@ember/routing/route";
import { service } from "@ember/service";
import Service from "@ember/service";
import type SprintsService from "@libs/sprints-front/services/sprints";
import type { SprintData } from "@libs/sprints-front/services/sprints";
import type TasksService from "@libs/backlog-front/services/tasks";
import type { Task } from "@libs/backlog-front/schemas/tasks";
import type TimeEntriesService from "@libs/time-tracking-front/services/time-entries";
import type CurrentProjectService from "@libs/shell-front/services/current-project";

// Minimal project shape needed by the dashboard — avoids cross-lib import
export type DashboardProject = { id?: string; name: string };

// Minimal service interface — actual implementation is @libs/projects-front ProjectsService
// declared here to avoid a cross-lib dependency while still being type-safe
interface ProjectsMinimalService extends Service {
  list: DashboardProject[];
  loadAll: () => Promise<DashboardProject[]>;
}

export type DashboardIndexModel =
  | { mode: "no-project"; projects: DashboardProject[] }
  | { mode: "no-sprint"; currentProject: DashboardProject; tasks: Task[] }
  | {
      mode: "with-sprint";
      currentProject: DashboardProject;
      activeSprint: SprintData;
      tasks: Task[];
      totalHours: number;
    };

export default class DashboardIndexRoute extends Route {
  @service declare sprints: SprintsService;
  @service declare tasks: TasksService;
  @service declare timeEntries: TimeEntriesService;
  @service("current-project") declare currentProject: CurrentProjectService;
  @service("projects") declare projects: ProjectsMinimalService;

  async model(): Promise<DashboardIndexModel> {
    const projectId = this.currentProject.currentProjectId;

    // Defensive: if the parent route hasn't populated the list yet
    // (cold load, race condition), trigger loadAll. Idempotent.
    if (this.projects.list.length === 0) {
      try {
        await this.projects.loadAll();
      } catch (e) {
        console.error("[DashboardIndexRoute] loadAll fallback failed:", e);
      }
    }

    const projectsList = this.projects.list;

    const currentProj = projectId
      ? (projectsList.find((p) => p.id === projectId) ?? null)
      : null;

    if (!projectId || !currentProj) {
      return { mode: "no-project", projects: projectsList };
    }

    const [activeSprint, tasks, summary] = await Promise.all([
      this.sprints.loadActive(projectId),
      this.tasks.loadAllByProject(projectId),
      this.timeEntries.loadSummary("week", projectId),
    ]);

    if (!activeSprint) {
      return { mode: "no-sprint", currentProject: currentProj, tasks };
    }

    return {
      mode: "with-sprint",
      currentProject: currentProj,
      activeSprint,
      tasks,
      totalHours: summary.totalHours,
    };
  }
}
