import Route from "@ember/routing/route";
import { service } from "@ember/service";
import type TimeEntriesService from "../../services/time-entries.ts";
import type {
  TimeEntryData,
  TimeEntriesMeta,
  SummaryResult,
} from "../../services/time-entries.ts";
import type CurrentProjectService from "@libs/shell-front/services/current-project";

export interface TimeTrackingRouteModel {
  projectId: string;
  entries: TimeEntryData[];
  meta: TimeEntriesMeta;
  weekSummary: SummaryResult;
  monthSummary: SummaryResult;
}

export default class DashboardTimeTrackingRoute extends Route {
  @service declare timeEntries: TimeEntriesService;
  @service declare currentProject: CurrentProjectService;

  async model(): Promise<TimeTrackingRouteModel> {
    const projectId = this.currentProject.currentProjectId ?? "proj-1";
    const [projectResult, weekSummary, monthSummary] = await Promise.all([
      this.timeEntries.loadByProject(projectId),
      this.timeEntries.loadSummary("week", projectId),
      this.timeEntries.loadSummary("month", projectId),
    ]);
    return {
      projectId,
      entries: projectResult.data,
      meta: projectResult.meta,
      weekSummary,
      monthSummary,
    };
  }
}
