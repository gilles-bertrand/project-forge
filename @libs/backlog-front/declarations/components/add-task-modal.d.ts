import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type { Store } from '@warp-drive/core';
import type TasksService from '../services/tasks.ts';
import type UserStoriesService from '../services/user-stories.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { TaskType, TaskNature, TaskPriority } from '../schemas/tasks.ts';
import type { TaskAssignee } from '../services/tasks.ts';
interface AddTaskModalSignature {
    Args: {
        onClose: () => void;
        preselectedUserStoryId?: string | null;
    };
}
export default class AddTaskModal extends Component<AddTaskModalSignature> {
    tasks: TasksService;
    userStories: UserStoriesService;
    currentProject: CurrentProjectService;
    intl: IntlService;
    store: Store;
    title: string;
    description: string;
    type: TaskType;
    nature: TaskNature;
    priority: TaskPriority;
    points: number;
    estimatedHours: number;
    userStoryId: string | null;
    assigneeIds: string[];
    availableUsers: TaskAssignee[];
    submitting: boolean;
    error: string;
    constructor(owner: unknown, args: AddTaskModalSignature['Args']);
    private loadUsers;
    get canSubmit(): boolean;
    get cannotSubmit(): boolean;
    get typeOptions(): {
        value: TaskType;
        label: string;
    }[];
    get natureOptions(): {
        value: TaskNature;
        label: string;
    }[];
    get priorityOptions(): {
        value: TaskPriority;
        label: string;
    }[];
    isTypeSelected: (v: TaskType) => boolean;
    isNatureSelected: (v: TaskNature) => boolean;
    isPrioritySelected: (v: TaskPriority) => boolean;
    isPointSelected: (v: number) => boolean;
    isUSSelected: (id: string | null) => boolean;
    isAssigneeSelected: (id: string) => boolean;
    onTitleInput(e: Event): void;
    onDescriptionInput(e: Event): void;
    onTypeChange(e: Event): void;
    onNatureChange(e: Event): void;
    onPriorityChange(e: Event): void;
    onPointsChange(e: Event): void;
    onEstimatedHoursInput(e: Event): void;
    onUSChange(e: Event): void;
    onAssigneeToggle(userId: string, e: Event): void;
    submit(e: Event): Promise<void>;
}
export {};
//# sourceMappingURL=add-task-modal.d.ts.map