import Component from '@glimmer/component';
import type EpicsService from '../../services/epics.ts';
import type TasksService from '../../services/tasks.ts';
import type UserStoriesService from '../../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type RouterService from '@ember/routing/router-service';
import type { Epic } from '../../schemas/epics.ts';
import type { UserStory } from '../../schemas/user-stories.ts';
import type { Task } from '../../schemas/tasks.ts';
interface BacklogTemplateSignature {
    Args: {
        model: {
            epics: Epic[];
            userStories: UserStory[];
            tasks: Task[];
        };
        controller?: {
            task: string | null;
        };
    };
}
interface Group {
    epic: Epic | null;
    stories: UserStory[];
}
export default class DashboardBacklogTemplate extends Component<BacklogTemplateSignature> {
    epics: EpicsService;
    userStories: UserStoriesService;
    tasks: TasksService;
    currentProject: CurrentProjectService;
    router: RouterService;
    activeEpicId: string | null;
    collapsedEpics: Set<string>;
    expandedStories: Set<string>;
    addUSOpen: boolean;
    addTaskOpen: boolean;
    _editUSTarget: UserStory | null;
    _detailTask: Task | null;
    constructor(owner: unknown, args: BacklogTemplateSignature['Args']);
    private taskParamFromUrl;
    get epicsList(): Epic[];
    get userStoriesList(): UserStory[];
    get tasksList(): Task[];
    get editUSTarget(): UserStory | null;
    get tasksForUS(): (us: UserStory) => Task[];
    get userStoryFor(): (task: Task) => UserStory | null;
    private sortByRank;
    get filteredUserStories(): UserStory[];
    get groupedUserStories(): Group[];
    get groupKeys(): string[];
    get allCollapsed(): boolean;
    groupKey: (group: Group) => string;
    groupDotStyle: (epic: Epic | null) => string;
    isEpicCollapsed: (key: string) => boolean;
    isEpicExpanded: (key: string) => boolean;
    isStoryExpanded: (us: UserStory) => boolean;
    selectEpic(epicId: string | null): void;
    toggleEpic(key: string): void;
    toggleStory(us: UserStory): void;
    toggleCollapseAll(): void;
    openAddUS(): void;
    closeAddUS(): void;
    openAddTask(): void;
    closeAddTask(): void;
    openEditUS(us: UserStory): void;
    closeEditUS(): void;
    get detailTask(): Task | null;
    private syncTaskParam;
    openTaskDetail(task: Task): void;
    closeTaskDetail(): void;
}
export {};
//# sourceMappingURL=backlog.d.ts.map