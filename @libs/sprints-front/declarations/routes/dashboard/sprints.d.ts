import Route from "@ember/routing/route";
import type SprintsService from "../../services/sprints.ts";
import type CurrentProjectService from "@libs/shell-front/services/current-project";
import type { SprintData } from "../../services/sprints.ts";
interface SprintsRouteModel {
    projectId: string | null;
    sprints: SprintData[];
}
export default class DashboardSprintsRoute extends Route {
    sprints: SprintsService;
    currentProject: CurrentProjectService;
    model(): Promise<SprintsRouteModel>;
}
export {};
//# sourceMappingURL=sprints.d.ts.map