import Component from '@glimmer/component';
import type CurrentProjectService from '../../services/current-project.ts';
type ProjectOption = {
    id: string;
    name: string;
};
export interface ProjectSelectorSignature {
    Args: {
        projects?: ProjectOption[];
    };
    Element: HTMLDivElement;
}
export default class ProjectSelector extends Component<ProjectSelectorSignature> {
    currentProject: CurrentProjectService;
    get options(): ProjectOption[];
    get selected(): ProjectOption | undefined;
    onChange(selection: unknown): void;
}
export {};
//# sourceMappingURL=project-selector.d.ts.map