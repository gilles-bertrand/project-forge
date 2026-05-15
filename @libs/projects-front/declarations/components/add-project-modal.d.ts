import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type { Store } from '@warp-drive/core';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type ProjectsService from '../services/projects.ts';
import type { ProjectStatus } from '../schemas/projects.ts';
type UserLite = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
};
interface AddProjectModalSignature {
    Args: {
        onClose: () => void;
    };
}
export default class AddProjectModal extends Component<AddProjectModalSignature> {
    projects: ProjectsService;
    currentUser: CurrentUserService;
    store: Store;
    intl: IntlService;
    name: string;
    description: string;
    status: ProjectStatus;
    responsibleId: string;
    selectedMemberIds: string[];
    users: UserLite[];
    submitting: boolean;
    error: string;
    constructor(owner: unknown, args: AddProjectModalSignature['Args']);
    loadUsers(): Promise<void>;
    get statusOptions(): {
        value: ProjectStatus;
        label: string;
    }[];
    get canSubmit(): boolean;
    get cannotSubmit(): boolean;
    get isNoResponsible(): boolean;
    isStatusSelected: (v: ProjectStatus) => boolean;
    isMemberSelected: (id: string) => boolean;
    toggleMemberHandler: (id: string) => () => void;
    onNameInput(e: Event): void;
    onDescriptionInput(e: Event): void;
    onStatusChange(e: Event): void;
    onResponsibleChange(e: Event): void;
    toggleMember(id: string): void;
    submit(e: Event): Promise<void>;
}
export {};
//# sourceMappingURL=add-project-modal.d.ts.map