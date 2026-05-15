import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type EpicsService from '../services/epics.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { EpicStatus } from '../schemas/epics.ts';
interface AddEpicModalSignature {
    Args: {
        onClose: () => void;
    };
}
export default class AddEpicModal extends Component<AddEpicModalSignature> {
    epics: EpicsService;
    currentProject: CurrentProjectService;
    intl: IntlService;
    title: string;
    description: string;
    status: EpicStatus;
    submitting: boolean;
    error: string;
    get statusOptions(): {
        value: EpicStatus;
        label: string;
    }[];
    get canSubmit(): boolean;
    get cannotSubmit(): boolean;
    isStatusSelected: (v: EpicStatus) => boolean;
    onTitleInput(e: Event): void;
    onDescriptionInput(e: Event): void;
    onStatusChange(e: Event): void;
    submit(e: Event): Promise<void>;
}
export {};
//# sourceMappingURL=add-epic-modal.d.ts.map