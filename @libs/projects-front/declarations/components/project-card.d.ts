import Component from '@glimmer/component';
import type { Project } from '../schemas/projects.ts';
import { type MemberLite } from './member-avatar-stack';
interface ProjectCardSignature {
    Args: {
        project: Project;
        members?: MemberLite[];
        responsibleShortName?: string;
        onOpen: (project: Project) => void;
    };
    Element: HTMLDivElement;
}
export default class ProjectCard extends Component<ProjectCardSignature> {
    get initials(): string;
    get formattedDate(): string;
    get members(): MemberLite[];
    get responsibleShortName(): string;
    userStoriesDone: number;
    userStoriesTotal: number;
    sprintDone: number;
    sprintTotal: number;
}
export {};
//# sourceMappingURL=project-card.d.ts.map