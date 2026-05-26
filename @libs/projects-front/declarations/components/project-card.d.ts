import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type { Project } from '../schemas/projects.ts';
import type ProjectsService from '../services/projects.ts';
import { type MemberLite } from './member-avatar-stack';
interface ProjectCardSignature {
    Args: {
        project: Project;
        members?: MemberLite[];
        isCurrent?: boolean;
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
    private _stats;
    private _alive;
    constructor(owner: unknown, args: ProjectCardSignature['Args']);
    willDestroy(): void;
    private loadMembers;
    private loadStats;
    get initials(): string;
    get formattedDate(): string;
    get members(): MemberLite[];
    get avatarColorClass(): string;
    get epicsDone(): number;
    get epicsTotal(): number;
    get userStoriesDone(): number;
    get userStoriesTotal(): number;
    get tasksDone(): number;
    get tasksTotal(): number;
    get sprintsActive(): number;
    get sprintsTotal(): number;
    get sprintDone(): number;
    get sprintTotal(): number;
    get moreMembersLabel(): string;
    handleActivate(e: Event): void;
    handleEdit(e: Event): void;
    handleDelete(e: Event): void;
}
export {};
//# sourceMappingURL=project-card.d.ts.map