import Component from '@glimmer/component';
import type { UserStory } from '../schemas/user-stories.ts';
interface DeleteUserStoryConfirmModalSignature {
    Args: {
        userStory: UserStory;
        taskCount: number;
        onConfirm: () => Promise<void>;
        onClose: () => void;
    };
}
export default class DeleteUserStoryConfirmModal extends Component<DeleteUserStoryConfirmModalSignature> {
    submitting: boolean;
    error: string;
    confirm(): Promise<void>;
}
export {};
//# sourceMappingURL=delete-user-story-confirm-modal.d.ts.map