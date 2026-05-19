import Route from "@ember/routing/route";
import type TimeEntriesService from "../../services/time-entries.ts";
import type { TimeEntryData, TimeEntriesMeta, SummaryResult } from "../../services/time-entries.ts";
import type CurrentProjectService from "@libs/shell-front/services/current-project";
export interface TimeTrackingRouteModel {
    projectId: string;
    entries: TimeEntryData[];
    meta: TimeEntriesMeta;
    weekSummary: SummaryResult;
    monthSummary: SummaryResult;
}
export default class DashboardTimeTrackingRoute extends Route {
    timeEntries: TimeEntriesService;
    currentProject: CurrentProjectService;
    model(): Promise<TimeTrackingRouteModel>;
}
//# sourceMappingURL=time-tracking.d.ts.map