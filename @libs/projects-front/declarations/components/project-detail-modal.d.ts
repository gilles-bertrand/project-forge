import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type RouterService from '@ember/routing/router-service';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { Project } from '../schemas/projects.ts';
interface ProjectDetailModalSignature {
    Args: {
        project: Project;
        onClose: () => void;
    };
}
type StatItem = {
    key: 'epics' | 'userStories' | 'tasks' | 'sprints';
    label: string;
    value: string;
    color: string;
};
export default class ProjectDetailModal extends Component<ProjectDetailModalSignature> {
    router: RouterService;
    currentProject: CurrentProjectService;
    intl: IntlService;
    get initials(): string;
    get stats(): StatItem[];
    goToKanban(): void;
}
export {};
//# sourceMappingURL=project-detail-modal.d.ts.map