import Component from '@glimmer/component';
import type TasksService from '../../services/tasks.ts';
import type UserStoriesService from '../../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { Task } from '../../schemas/tasks.ts';
import type { UserStory } from '../../schemas/user-stories.ts';
interface BacklogTemplateSignature {
    Args: {
        model: {
            tasks: Task[];
            userStories: UserStory[];
        };
    };
}
export default class DashboardBacklogTemplate extends Component<BacklogTemplateSignature> {
    tasks: TasksService;
    userStories: UserStoriesService;
    currentProject: CurrentProjectService;
    private _filteredTasks;
    addTaskOpen: boolean;
    detailTask: Task | null;
    get displayedTasks(): Task[];
    onFilter(filtered: Task[]): void;
    openAddTask(): void;
    closeAddTask(): void;
    openDetail(task: Task): void;
    closeDetail(): void;
    get userStoryFor(): (task: Task) => UserStory | null;
}
export {};
//# sourceMappingURL=backlog.d.ts.map