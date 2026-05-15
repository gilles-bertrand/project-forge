import Component from '@glimmer/component';
import type ProjectsService from '../services/projects.ts';
interface ShellWithProjectsSignature {
    Blocks: {
        default: [];
    };
    Element: HTMLDivElement;
}
export default class ShellWithProjects extends Component<ShellWithProjectsSignature> {
    projects: ProjectsService;
    get projectOptions(): {
        id: string;
        name: string;
    }[];
}
export {};
//# sourceMappingURL=shell-with-projects.d.ts.map