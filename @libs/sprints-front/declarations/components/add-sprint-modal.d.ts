import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type SprintsService from '../services/sprints.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
interface AddSprintModalSignature {
    Args: {
        onClose: () => void;
    };
}
export default class AddSprintModal extends Component<AddSprintModalSignature> {
    sprints: SprintsService;
    currentProject: CurrentProjectService;
    intl: IntlService;
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
    velocityPoints: number;
    submitting: boolean;
    error: string;
    get canSubmit(): boolean;
    get cannotSubmit(): boolean;
    get datesError(): string | null;
    onNameInput(e: Event): void;
    onGoalInput(e: Event): void;
    onStartDateInput(e: Event): void;
    onEndDateInput(e: Event): void;
    onVelocityInput(e: Event): void;
    submit(e: Event): Promise<void>;
}
export {};
//# sourceMappingURL=add-sprint-modal.d.ts.map