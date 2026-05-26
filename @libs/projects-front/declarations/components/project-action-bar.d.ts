import Component from '@glimmer/component';
import type RouterService from '@ember/routing/router-service';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { Project } from '../schemas/projects.ts';
type NavRoute = 'dashboard.backlog' | 'dashboard.kanban' | 'dashboard.user-story-map' | 'dashboard.sprints';
interface ProjectActionBarSignature {
    Args: {
        project: Project;
        onNavigate?: () => void;
    };
    Element: HTMLDivElement;
}
export default class ProjectActionBar extends Component<ProjectActionBarSignature> {
    router: RouterService;
    currentProject: CurrentProjectService;
    goTo(route: NavRoute, e: Event): void;
}
export {};
//# sourceMappingURL=project-action-bar.d.ts.map