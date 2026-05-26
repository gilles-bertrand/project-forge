import Component from '@glimmer/component';
import { type IntlService } from 'ember-intl';
import type ProjectsService from '../../services/projects.ts';
import type { Project } from '../../schemas/projects.ts';
import type RouterService from '@ember/routing/router-service';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
type ViewMode = 'grid' | 'list';
export default class DashboardProjectsTemplate extends Component {
    projects: ProjectsService;
    router: RouterService;
    currentProject: CurrentProjectService;
    intl: IntlService;
    viewMode: ViewMode;
    addModalOpen: boolean;
    editProject: Project | null;
    deleteTarget: Project | null;
    deleteError: string;
    tableReload: (() => void) | null;
    registerTableReload(reload: () => void): void;
    handleUpdated(): void;
    get isDeleteModalOpen(): boolean;
    get isGridMode(): boolean;
    get isListMode(): boolean;
    get deleteConfirmQuestion(): string;
    openAdd(): void;
    closeAdd(): void;
    goToKanban(project: Project): void;
    openEdit(p: Project): void;
    closeEdit(): void;
    requestDelete(p: Project): void;
    cancelDelete(): void;
    confirmDelete(): Promise<void>;
    handleCreated(project: Project): void;
    setViewMode(mode: ViewMode): void;
}
export {};
//# sourceMappingURL=projects.d.ts.map