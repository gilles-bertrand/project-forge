import Route from '@ember/routing/route';
import type TasksService from '../../services/tasks.ts';
import type UserStoriesService from '../../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
export default class DashboardBacklogRoute extends Route {
    tasks: TasksService;
    userStories: UserStoriesService;
    currentProject: CurrentProjectService;
    model(): Promise<{
        tasks: import("../../schemas/tasks.ts").Task[];
        userStories: import("../../schemas/user-stories.ts").UserStory[];
    }>;
}
//# sourceMappingURL=backlog.d.ts.map