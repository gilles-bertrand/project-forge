import Component from '@glimmer/component';
import type EpicsService from '../../services/epics.ts';
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
    currentProject: CurrentProjectService;
    addEpicOpen: boolean;
    addUSOpen: boolean;
    addTaskOpen: boolean;
    detailTask: Task | null;
    selectedEpicForUS: Epic | null;
    get userStoryFor(): (task: Task) => UserStory | null;
    openAddEpic(): void;
    closeAddEpic(): void;
    openAddUS(epic?: Epic): void;
    closeAddUS(): void;
    openAddTask(): void;
    closeAddTask(): void;
    openDetail(task: Task): void;
    closeDetail(): void;
}
export {};
//# sourceMappingURL=user-story-map.d.ts.map