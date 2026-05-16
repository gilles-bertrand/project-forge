import Route from "@ember/routing/route";
import { service } from "@ember/service";
import type TimeEntriesService from "../../services/time-entries.ts";
import type {
  TimeEntryData,
  TimeEntriesMeta,
  SummaryResult,
} from "../../services/time-entries.ts";

export interface TimeTrackingRouteModel {
  entries: TimeEntryData[];
  meta: TimeEntriesMeta;
  weekSummary: SummaryResult;
  monthSummary: SummaryResult;
}

export default class DashboardTimeTrackingRoute extends Route {
  @service declare timeEntries: TimeEntriesService;

  async model(): Promise<TimeTrackingRouteModel> {
    const [projectResult, weekSummary, monthSummary] = await Promise.all([
      this.timeEntries.loadByProject("proj-1"),
      this.timeEntries.loadSummary("week", "proj-1"),
      this.timeEntries.loadSummary("month", "proj-1"),
    ]);
    return {
      entries: projectResult.data,
      meta: projectResult.meta,
      weekSummary,
      monthSummary,
    };
  }
}
