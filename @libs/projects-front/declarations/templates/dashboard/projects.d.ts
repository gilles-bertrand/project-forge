import Component from '@glimmer/component';
import type ProjectsService from '../../services/projects.ts';
import type { Project } from '../../schemas/projects.ts';
export default class DashboardProjectsTemplate extends Component {
    projects: ProjectsService;
    addModalOpen: boolean;
    detailProject: Project | null;
    openAdd(): void;
    closeAdd(): void;
    openDetail(p: Project): void;
    closeDetail(): void;
}
//# sourceMappingURL=projects.d.ts.map