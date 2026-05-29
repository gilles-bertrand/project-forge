import Component from '@glimmer/component';
import type TasksService from '../services/tasks.ts';
import type CommentsService from '../services/comments.ts';
import type AttachmentsService from '../services/attachments.ts';
import type RouterService from '@ember/routing/router-service';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type { TaskHistoryEvent, TaskAssignee } from '../services/tasks.ts';
import type { Comment } from '../schemas/comments.ts';
import type { Attachment } from '../schemas/attachments.ts';
import type { Task } from '../schemas/tasks.ts';
import type { UserStory } from '../schemas/user-stories.ts';
type TaskDetailTab = 'details' | 'comments' | 'history';
interface AuthorInfo {
    name: string;
}
interface TaskDetailModalSignature {
    Args: {
        task: Task;
        userStory?: UserStory | null;
        onClose: () => void;
    };
}
export default class TaskDetailModal extends Component<TaskDetailModalSignature> {
    tasks: TasksService;
    comments: CommentsService;
    attachments: AttachmentsService;
    router: RouterService;
    currentUser: CurrentUserService;
    activeTab: TaskDetailTab;
    commentItems: Comment[];
    attachmentItems: Attachment[];
    history: TaskHistoryEvent[];
    assignees: TaskAssignee[];
    authors: Record<string, AuthorInfo>;
    newComment: string;
    posting: boolean;
    editingId: string | null;
    editingContent: string;
    savingEdit: boolean;
    uploading: boolean;
    error: string;
    constructor(owner: unknown, args: TaskDetailModalSignature['Args']);
    private loadAll;
    private loadAuthors;
    get isDetailsTab(): boolean;
    get isCommentsTab(): boolean;
    get isHistoryTab(): boolean;
    get numberLabel(): string;
    get currentUserId(): string | null;
    get createdAtFormatted(): string;
    get firstAssignee(): TaskAssignee | null;
    get attachmentsEmpty(): boolean;
    formatDate: (iso: string) => string;
    authorName: (userId: string) => string;
    initials: (userId: string) => string;
    humanSize: (bytes: number) => string;
    isEditing: (id: string) => boolean;
    canModify: (comment: Comment) => boolean;
    showDetails(): void;
    showComments(): void;
    showHistory(): void;
    onNewCommentInput(e: Event): void;
    onEditInput(e: Event): void;
    postComment(e: Event): Promise<void>;
    startEdit(comment: Comment): void;
    cancelEdit(): void;
    saveEdit(comment: Comment, e: Event): Promise<void>;
    removeComment(comment: Comment): Promise<void>;
    onFileChange(e: Event): Promise<void>;
    removeAttachment(attachment: Attachment): Promise<void>;
    logTime(): void;
}
export {};
//# sourceMappingURL=task-detail-modal.d.ts.map