import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type { Store } from '@warp-drive/core';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type ProjectsService from '../services/projects.ts';
import type { Project, ProjectStatus } from '../schemas/projects.ts';
type UserLite = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
};
interface ProjectFormModalSignature {
    Args: {
        project?: Project | null;
        onClose: () => void;
        onCreated?: (project: Project) => void;
        onUpdated?: (project: Project) => void;
    };
}
export default class ProjectFormModal extends Component<ProjectFormModalSignature> {
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
    sprintDurationDays: number;
    defaultVelocityPoints: number;
    private originalMemberIds;
    membersLoaded: boolean;
    constructor(owner: unknown, args: ProjectFormModalSignature['Args']);
    get mode(): 'create' | 'edit';
    get titleLabel(): string;
    get submitLabel(): string;
    get submittingLabel(): string;
    get errorFallbackLabel(): string;
    get statusOptions(): {
        value: ProjectStatus;
        label: string;
    }[];
    get canSubmit(): boolean;
    get cannotSubmit(): boolean;
    get isNoResponsible(): boolean;
    isStatusSelected: (v: ProjectStatus) => boolean;
    isMemberSelected: (id: string) => boolean;
    isResponsible: (id: string) => boolean;
    toggleMemberHandler: (id: string) => () => void;
    loadUsers(): Promise<void>;
    loadMembersAndUsers(projectId: string): Promise<void>;
    onNameInput(e: Event): void;
    onDescriptionInput(e: Event): void;
    onStatusChange(e: Event): void;
    onResponsibleChange(e: Event): void;
    toggleMember(id: string): void;
    onSprintDurationInput(e: Event): void;
    onDefaultVelocityInput(e: Event): void;
    submit(e: Event): Promise<void>;
}
export {};
//# sourceMappingURL=project-form-modal.d.ts.map