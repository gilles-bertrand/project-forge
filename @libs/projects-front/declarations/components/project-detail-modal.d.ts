import Component from '@glimmer/component';
import type RouterService from '@ember/routing/router-service';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { Project } from '../schemas/projects.ts';
interface ProjectDetailModalSignature {
    Args: {
        project: Project;
        onClose: () => void;
    };
}
export default class ProjectDetailModal extends Component<ProjectDetailModalSignature> {
    router: RouterService;
    currentProject: CurrentProjectService;
    get initials(): string;
    stats: {
        label: string;
        value: string;
        color: string;
    }[];
    goToKanban(): void;
}
export {};
//# sourceMappingURL=project-detail-modal.d.ts.map