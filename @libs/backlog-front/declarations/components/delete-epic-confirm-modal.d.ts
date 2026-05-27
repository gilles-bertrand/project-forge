import Component from '@glimmer/component';
import type { Epic } from '../schemas/epics.ts';
interface DeleteEpicConfirmModalSignature {
    Args: {
        epic: Epic;
        orphanCount: number;
        onConfirm: () => Promise<void>;
        onClose: () => void;
    };
}
export default class DeleteEpicConfirmModal extends Component<DeleteEpicConfirmModalSignature> {
    submitting: boolean;
    error: string;
    confirm(): Promise<void>;
}
export {};
//# sourceMappingURL=delete-epic-confirm-modal.d.ts.map