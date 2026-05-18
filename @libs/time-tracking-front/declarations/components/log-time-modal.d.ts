import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type TimeEntriesService from '../services/time-entries.ts';
import type { TimeEntryData } from '../services/time-entries.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type CurrentUserService from '@libs/users-front/services/current-user';
interface LogTimeModalSignature {
    Args: {
        taskId?: string;
        projectId?: string;
        entryId?: string;
        initialHours?: number;
        initialDate?: string;
        initialDescription?: string | null;
        onClose: () => void;
        onSaved: (entry: TimeEntryData) => void;
    };
}
export default class LogTimeModal extends Component<LogTimeModalSignature> {
    timeEntries: TimeEntriesService;
    intl: IntlService;
    currentProject: CurrentProjectService;
    currentUser: CurrentUserService;
    taskIdInput: string;
    hours: number;
    date: string;
    description: string;
    submitting: boolean;
    error: string;
    get isEdit(): boolean;
    get resolvedUserId(): string;
    get resolvedProjectId(): string;
    get validationError(): string | null;
    get canSubmit(): boolean;
    get cannotSubmit(): boolean;
    onTaskInput(e: Event): void;
    onHoursInput(e: Event): void;
    onDateInput(e: Event): void;
    onDescriptionInput(e: Event): void;
    submit(e: Event): Promise<void>;
}
export {};
//# sourceMappingURL=log-time-modal.d.ts.map