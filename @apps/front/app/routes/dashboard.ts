import Route from '@ember/routing/route';
import type RouterService from '@ember/routing/router-service';
import type Transition from '@ember/routing/transition';
import { service } from '@ember/service';
import type SessionService from 'ember-simple-auth/services/session';
import type ProjectsService from '@libs/projects-front/services/projects';

export default class DashboardIndexRoute extends Route {
  @service declare session: SessionService;
  @service declare router: RouterService;
  @service declare projects: ProjectsService;

  beforeModel(t: Transition) {
    this.session.requireAuthentication(t, 'login');
  }

  // Q3: charger la liste projets au boot du dashboard pour alimenter le
  // ProjectSelector du shell dès le login (avant que l'utilisateur visite /projects)
  async model() {
    await this.projects.loadAll();
  }
}
