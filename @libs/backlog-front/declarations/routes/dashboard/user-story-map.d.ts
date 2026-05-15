import Route from '@ember/routing/route';
import type EpicsService from '../../services/epics.ts';
import type UserStoriesService from '../../services/user-stories.ts';
import type TasksService from '../../services/tasks.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
export default class DashboardUserStoryMapRoute extends Route {
    epics: EpicsService;
    userStories: UserStoriesService;
    tasks: TasksService;
    currentProject: CurrentProjectService;
    model(): Promise<{
        epics: import("../../schemas/epics.ts").Epic[];
        userStories: import("../../schemas/user-stories.ts").UserStory[];
        tasks: import("../../schemas/tasks.ts").Task[];
    }>;
}
//# sourceMappingURL=user-story-map.d.ts.map