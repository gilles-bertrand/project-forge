import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type { MemberLite } from './assignee-avatar-stack';
import type TasksService from '../services/tasks.ts';
import type UserStoriesService from '../services/user-stories.ts';
import type RouterService from '@ember/routing/router-service';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type { TaskHistoryEvent, TaskAssignee } from '../services/tasks.ts';
import type { Task, TaskStatus, TaskPriority } from '../schemas/tasks.ts';
import type { UserStory } from '../schemas/user-stories.ts';
type TaskDetailTab = 'details' | 'comments' | 'history';
interface TaskDetailModalSignature {
    Args: {
        task: Task;
        userStory?: UserStory | null;
        onClose: () => void;
    };
}
export default class TaskDetailModal extends Component<TaskDetailModalSignature> {
    tasks: TasksService;
    userStories: UserStoriesService;
    router: RouterService;
    intl: IntlService;
    currentUser: CurrentUserService;
    activeTab: TaskDetailTab;
    history: TaskHistoryEvent[];
    assignees: TaskAssignee[];
    projectMembers: MemberLite[];
    isEditing: boolean;
    dirty: boolean;
    submitting: boolean;
    error: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    description: string;
    points: number;
    userStoryId: string | null;
    assigneeIds: string[];
    private initialAssigneeIds;
    constructor(owner: unknown, args: TaskDetailModalSignature['Args']);
    private resetFieldsFromTask;
    private loadAll;
    private syncAssigneeIdsFromAssignees;
    get isDetailsTab(): boolean;
    get isCommentsTab(): boolean;
    get isHistoryTab(): boolean;
    get numberLabel(): string;
    get currentUserId(): string | null;
    get createdAtFormatted(): string;
    get assignedMembers(): MemberLite[];
    get hasAssignees(): boolean;
    get canSave(): boolean;
    get cannotSave(): boolean;
    get statusOptions(): {
        value: TaskStatus;
        label: string;
    }[];
    get priorityOptions(): {
        value: TaskPriority;
        label: string;
    }[];
    get pointValues(): readonly number[];
    isStatusSelected: (v: TaskStatus) => boolean;
    isPrioritySelected: (v: TaskPriority) => boolean;
    isPointSelected: (v: number) => boolean;
    isUSSelected: (id: string | null) => boolean;
    isAssigneeSelected: (id: string) => boolean;
    showDetails(): void;
    showComments(): void;
    showHistory(): void;
    enterEdit(): void;
    cancelEdit(): void;
    onTitleInput(e: Event): void;
    onStatusChange(e: Event): void;
    onPriorityChange(e: Event): void;
    onDescriptionInput(e: Event): void;
    onPointsChange(e: Event): void;
    onUSChange(e: Event): void;
    onAssigneeToggle(userId: string, e: Event): void;
    save(e: Event): Promise<void>;
    logTime(): void;
}
export {};
//# sourceMappingURL=task-detail-modal.d.ts.map