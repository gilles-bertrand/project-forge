import Route from '@ember/routing/route';
import type EpicsService from '../../services/epics.ts';
import type TasksService from '../../services/tasks.ts';
import type UserStoriesService from '../../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
export default class DashboardBacklogRoute extends Route {
    epics: EpicsService;
    tasks: TasksService;
    userStories: UserStoriesService;
    currentProject: CurrentProjectService;
    model(): Promise<{
        epics: import("../../schemas/epics.ts").Epic[];
        userStories: import("../../schemas/user-stories.ts").UserStory[];
        tasks: import("../../schemas/tasks.ts").Task[];
    }>;
}
//# sourceMappingURL=backlog.d.ts.map