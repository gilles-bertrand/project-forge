import Route from '@ember/routing/route';
import type RouterService from '@ember/routing/router-service';
import type Transition from '@ember/routing/transition';
import { service } from '@ember/service';
import type SessionService from 'ember-simple-auth/services/session';
import type ProjectsService from '@libs/projects-front/services/projects';
import type CurrentProjectService from '@libs/shell-front/services/current-project';

export default class DashboardIndexRoute extends Route {
  @service declare session: SessionService;
  @service declare router: RouterService;
  @service declare projects: ProjectsService;
  @service('current-project') declare currentProject: CurrentProjectService;

  beforeModel(t: Transition) {
    this.session.requireAuthentication(t, 'login');
  }

  async model() {
    await this.projects.loadAll();
    const ids = this.projects.list
      .map((p) => p.id)
      .filter((id): id is string => Boolean(id));
    this.currentProject.ensureDefault(ids);
  }
}
