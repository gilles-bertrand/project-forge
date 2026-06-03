import Route from '@ember/routing/route';
import { service } from '@ember/service';
import type EpicsService from '../../services/epics.ts';
import type TasksService from '../../services/tasks.ts';
import type UserStoriesService from '../../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';

export default class DashboardBacklogRoute extends Route {
  @service declare epics: EpicsService;
  @service declare tasks: TasksService;
  @service declare userStories: UserStoriesService;
  @service declare currentProject: CurrentProjectService;

  async model() {
    const projectId = this.currentProject.currentProjectId;
    if (!projectId) return { epics: [], userStories: [], tasks: [] };
    await Promise.all([
      this.epics.loadByProject(projectId),
      this.userStories.loadByProject(projectId),
      // All project tasks (not just sprint-less ones): the US cards show the
      // total count of attached tasks, which would be undercounted by the
      // backlog-only set.
      this.tasks.loadAllByProject(projectId),
    ]);
    return {
      epics: this.epics.list,
      userStories: this.userStories.list,
      tasks: this.tasks.all,
    };
  }
}
