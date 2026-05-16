import Route from '@ember/routing/route';
import type TasksService from '../../services/tasks.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { Sprint } from '../../schemas/sprints.ts';
interface KanbanModel {
    projectId: string | null;
    sprint: Sprint | null;
}
export default class DashboardKanbanRoute extends Route {
    tasks: TasksService;
    currentProject: CurrentProjectService;
    model(): Promise<KanbanModel>;
}
export {};
//# sourceMappingURL=kanban.d.ts.map