import Component from '@glimmer/component';
import type EpicsService from '../../services/epics.ts';
import type UserStoriesService from '../../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { Epic } from '../../schemas/epics.ts';
import type { UserStory } from '../../schemas/user-stories.ts';
import type { Task } from '../../schemas/tasks.ts';
interface USMTemplateSignature {
    Args: {
        model: {
            epics: Epic[];
            userStories: UserStory[];
            tasks: Task[];
        };
    };
}
export default class DashboardUserStoryMapTemplate extends Component<USMTemplateSignature> {
    epics: EpicsService;
    userStories: UserStoriesService;
    currentProject: CurrentProjectService;
    addEpicOpen: boolean;
    addUSOpen: boolean;
    addTaskOpen: boolean;
    addTaskForUSId: string | null;
    detailTask: Task | null;
    selectedEpicForUS: Epic | null;
    editEpicTarget: Epic | null;
    deleteEpicTarget: Epic | null;
    editUSTarget: UserStory | null;
    deleteUSTarget: UserStory | null;
    get userStoryFor(): (task: Task) => UserStory | null;
    get orphanCountFor(): (epic: Epic) => number;
    get taskCountForUS(): (us: UserStory) => number;
    openAddEpic(): void;
    closeAddEpic(): void;
    openAddUS(epic?: Epic): void;
    closeAddUS(): void;
    openAddTask(): void;
    openAddTaskForUS(us: UserStory): void;
    closeAddTask(): void;
    openDetail(task: Task): void;
    closeDetail(): void;
    openEditEpic(epic: Epic): void;
    closeEditEpic(): void;
    openDeleteEpic(epic: Epic): void;
    closeDeleteEpic(): void;
    confirmDeleteEpic(): Promise<void>;
    openEditUS(us: UserStory): void;
    closeEditUS(): void;
    openDeleteUS(us: UserStory): void;
    closeDeleteUS(): void;
    confirmDeleteUS(): Promise<void>;
}
export {};
//# sourceMappingURL=user-story-map.d.ts.map