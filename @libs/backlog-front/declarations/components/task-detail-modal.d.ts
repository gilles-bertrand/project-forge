import Component from '@glimmer/component';
import type TasksService from '../services/tasks.ts';
import type { TaskComment, TaskHistoryEvent, TaskAssignee } from '../services/tasks.ts';
import type { Task } from '../schemas/tasks.ts';
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
    activeTab: TaskDetailTab;
    comments: TaskComment[];
    history: TaskHistoryEvent[];
    assignees: TaskAssignee[];
    loadingTab: boolean;
    constructor(owner: unknown, args: TaskDetailModalSignature['Args']);
    private loadAll;
    get isDetailsTab(): boolean;
    get isCommentsTab(): boolean;
    get isHistoryTab(): boolean;
    get numberLabel(): string;
    get createdAtFormatted(): string;
    get firstAssignee(): TaskAssignee | null;
    showDetails(): void;
    showComments(): void;
    showHistory(): void;
}
export {};
//# sourceMappingURL=task-detail-modal.d.ts.map