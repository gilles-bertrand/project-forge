import Route from "@ember/routing/route";
import { service } from "@ember/service";
import type SprintsService from "../../services/sprints.ts";
import type CurrentProjectService from "@libs/shell-front/services/current-project";
import type { SprintData } from "../../services/sprints.ts";

interface SprintsRouteModel {
  projectId: string | null;
  sprints: SprintData[];
}

export default class DashboardSprintsRoute extends Route {
  @service declare sprints: SprintsService;
  @service declare currentProject: CurrentProjectService;

  async model(): Promise<SprintsRouteModel> {
    const projectId = this.currentProject.currentProjectId;
    if (!projectId) return { projectId: null, sprints: [] };
    const list = await this.sprints.loadByProject(projectId);
    return { projectId, sprints: list };
  }
}
