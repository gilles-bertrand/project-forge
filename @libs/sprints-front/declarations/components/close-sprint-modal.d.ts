import Component from '@glimmer/component';
import type SprintsService from '../services/sprints.ts';
import type { SprintData, ClosePreviewData, CloseAction, StopSprintMeta } from '../services/sprints.ts';
interface CloseSprintModalSignature {
    Args: {
        sprint: SprintData;
        onClose: () => void;
        onClosed: (meta: StopSprintMeta) => void;
    };
}
export default class CloseSprintModal extends Component<CloseSprintModalSignature> {
    sprints: SprintsService;
    preview: ClosePreviewData | null;
    loading: boolean;
    submitting: boolean;
    error: string;
    selectedAction: CloseAction;
    targetSprintId: string;
    constructor(owner: unknown, args: CloseSprintModalSignature['Args']);
    private loadPreview;
    get hasUnfinished(): boolean;
    get totalUnfinished(): number;
    get canConfirm(): boolean;
    get isBacklog(): boolean;
    get isExisting(): boolean;
    get isNext(): boolean;
    onActionChange(e: Event): void;
    onTargetChange(e: Event): void;
    confirm(): Promise<void>;
}
export {};
//# sourceMappingURL=close-sprint-modal.d.ts.map