import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type TasksService from '../../services/tasks.ts';
import type UserStoriesService from '../../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';

export default class DashboardBacklogRoute extends Route {
  @service declare tasks: TasksService;
  @service declare userStories: UserStoriesService;
  @service declare currentProject: CurrentProjectService;

  async model() {
    const projectId = this.currentProject.currentProjectId;
    if (!projectId) return { tasks: [], userStories: [] };
    await Promise.all([
      this.tasks.loadBacklog(projectId),
      this.userStories.loadByProject(projectId),
    ]);
    return { tasks: this.tasks.backlog, userStories: this.userStories.list };
  }
}
