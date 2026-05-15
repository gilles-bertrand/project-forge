import Route from "@ember/routing/route";
import type ProjectsService from "../../services/projects.ts";
export default class DashboardProjectsRoute extends Route {
    projects: ProjectsService;
    model(): Promise<import("../../schemas/projects.ts").Project[]>;
}
//# sourceMappingURL=projects.d.ts.map