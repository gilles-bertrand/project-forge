import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type { Project } from '../schemas/projects.ts';
import type ProjectsService from '../services/projects.ts';
import { type MemberLite } from './member-avatar-stack';
interface ProjectCardSignature {
    Args: {
        project: Project;
        members?: MemberLite[];
        responsibleShortName?: string;
        onActivate: (project: Project) => void;
        onEdit?: (project: Project) => void;
        onDelete?: (project: Project) => void;
    };
    Element: HTMLDivElement;
}
export default class ProjectCard extends Component<ProjectCardSignature> {
    intl: IntlService;
    projects: ProjectsService;
    private _fetchedMembers;
    constructor(owner: unknown, args: ProjectCardSignature['Args']);
    private loadMembers;
    get initials(): string;
    get formattedDate(): string;
    get members(): MemberLite[];
    get responsibleShortName(): string;
    get avatarColorClass(): string;
    userStoriesDone: number;
    userStoriesTotal: number;
    sprintDone: number;
    sprintTotal: number;
    epicsDone: number;
    epicsTotal: number;
    tasksDone: number;
    tasksTotal: number;
    sprintsActive: number;
    sprintsTotal: number;
    get moreMembersLabel(): string;
    handleActivate(e: Event): void;
    handleKeydown(e: KeyboardEvent): void;
    handleEdit(e: Event): void;
    handleDelete(e: Event): void;
}
export {};
//# sourceMappingURL=project-card.d.ts.map