import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type Owner from '@ember/owner';
import type UserStoriesService from '../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type { UserStory, StoryStatus, StoryPoints, StoryPriority } from '../schemas/user-stories.ts';
import type TasksService from '../services/tasks.ts';
import type { Task } from '../schemas/tasks.ts';
interface EditUserStoryModalSignature {
    Args: {
        userStory: UserStory;
        onClose: () => void;
    };
}
export default class EditUserStoryModal extends Component<EditUserStoryModalSignature> {
    userStories: UserStoriesService;
    tasks: TasksService;
    currentProject: CurrentProjectService;
    currentUser: CurrentUserService;
    intl: IntlService;
    title: string;
    description: string;
    status: StoryStatus;
    points: StoryPoints | null;
    priority: StoryPriority;
    submitting: boolean;
    error: string;
    storyTasks: Task[];
    tasksLoading: boolean;
    constructor(owner: Owner, args: EditUserStoryModalSignature['Args']);
    private loadStoryTasks;
    pointOptionValue: (v: StoryPoints | null) => string;
    get statusOptions(): {
        value: StoryStatus;
        label: string;
    }[];
    get pointOptions(): {
        value: StoryPoints | null;
        label: string;
    }[];
    get priorityOptions(): {
        value: StoryPriority;
        label: string;
    }[];
    get currentUserId(): string | null;
    get canSubmit(): boolean;
    get cannotSubmit(): boolean;
    isStatusSelected: (v: StoryStatus) => boolean;
    isPointSelected: (v: StoryPoints | null) => boolean;
    isPrioritySelected: (v: StoryPriority) => boolean;
    onTitleInput(e: Event): void;
    onDescriptionInput(e: Event): void;
    onStatusChange(e: Event): void;
    onPointsChange(e: Event): void;
    onPriorityChange(e: Event): void;
    submit(e: Event): Promise<void>;
}
export {};
//# sourceMappingURL=edit-user-story-modal.d.ts.map