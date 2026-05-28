import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type Owner from '@ember/owner';
import type { Store } from '@warp-drive/core';
import type EpicsService from '../services/epics.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { EpicStatus, EpicType } from '../schemas/epics.ts';
interface AddEpicModalSignature {
    Args: {
        onClose: () => void;
    };
}
export default class AddEpicModal extends Component<AddEpicModalSignature> {
    epics: EpicsService;
    currentProject: CurrentProjectService;
    intl: IntlService;
    store: Store;
    title: string;
    description: string;
    status: EpicStatus;
    color: string;
    type: EpicType;
    submitting: boolean;
    error: string;
    currentProjectName: string;
    constructor(owner: Owner, args: AddEpicModalSignature['Args']);
    private loadProjectName;
    get statusOptions(): {
        value: EpicStatus;
        label: string;
    }[];
    get typeOptions(): {
        value: EpicType;
        label: string;
    }[];
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
//# sourceMappingURL=add-epic-modal.d.ts.map