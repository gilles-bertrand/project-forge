import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type Owner from '@ember/owner';
import type EpicsService from '../services/epics.ts';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type { Epic, EpicStatus, EpicType } from '../schemas/epics.ts';
interface EditEpicModalSignature {
    Args: {
        epic: Epic;
        onClose: () => void;
    };
}
export default class EditEpicModal extends Component<EditEpicModalSignature> {
    epics: EpicsService;
    currentUser: CurrentUserService;
    intl: IntlService;
    title: string;
    description: string;
    status: EpicStatus;
    color: string;
    type: EpicType;
    submitting: boolean;
    error: string;
    constructor(owner: Owner, args: EditEpicModalSignature['Args']);
    get statusOptions(): {
        value: EpicStatus;
        label: string;
    }[];
    get typeOptions(): {
        value: EpicType;
        label: string;
    }[];
    get currentUserId(): string | null;
    get canSubmit(): boolean;
    get cannotSubmit(): boolean;
    isStatusSelected: (v: EpicStatus) => boolean;
    isTypeSelected: (v: EpicType) => boolean;
    onTitleInput(e: Event): void;
    onDescriptionInput(e: Event): void;
    onStatusChange(e: Event): void;
    onTypeChange(e: Event): void;
    onColorInput(e: Event): void;
    submit(e: Event): Promise<void>;
}
export {};
//# sourceMappingURL=edit-epic-modal.d.ts.map