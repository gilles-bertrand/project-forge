import Component from '@glimmer/component';
import type RouterService from '@ember/routing/router-service';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { SprintData } from '@libs/sprints-front/services/sprints';
import type { Task } from '@libs/backlog-front/schemas/tasks';
import type { DashboardIndexModel, DashboardProject } from '../../routes/dashboard/index.ts';
interface DashboardIndexSignature {
    Args: {
        model: DashboardIndexModel;
    };
}
export default class DashboardIndexTemplate extends Component<DashboardIndexSignature> {
    router: RouterService;
    currentProject: CurrentProjectService;
    get isWithSprint(): boolean;
    get isNoSprint(): boolean;
    get activeSprint(): SprintData | null;
    get sprintTasks(): Task[];
    get completedCount(): number;
    get totalCount(): number;
    get completedPoints(): number;
    get totalHours(): number;
    get noSprintProject(): DashboardProject | null;
    get noSprintTasks(): Task[];
    get tasksInProgress(): number;
    get tasksDone(): number;
    get projectsList(): DashboardProject[];
    goToBacklog(): void;
    goToSprints(): void;
    goToProjects(): void;
    selectProject(projectId: string | undefined): void;
}
export {};
//# sourceMappingURL=index.d.ts.map