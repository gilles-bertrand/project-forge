import Route from "@ember/routing/route";
import { service } from "@ember/service";
import type ProjectsService from "../../services/projects.ts";

export default class DashboardProjectsRoute extends Route {
  @service declare projects: ProjectsService;

  async model() {
    await this.projects.loadAll();
    return this.projects.list;
  }
}
