import Component from '@glimmer/component';
import type { KanbanFilterValue } from '../../components/kanban-filters';
import type TasksService from '../../services/tasks.ts';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type { Task, TaskStatus } from '../../schemas/tasks.ts';
import type { Sprint } from '../../schemas/sprints.ts';
interface KanbanTemplateSignature {
    Args: {
        model: {
            projectId: string | null;
            sprint: Sprint | null;
        };
    };
}
export default class DashboardKanbanTemplate extends Component<KanbanTemplateSignature> {
    tasks: TasksService;
    currentUser: CurrentUserService;
    filter: KanbanFilterValue;
    detailTask: Task | null;
    errorMessage: string | null;
    get sprintTasks(): Task[];
    get filteredTasks(): Task[];
    get pointsCompleted(): number;
    get pointsTotal(): number;
    onFilterChange(value: KanbanFilterValue): void;
    openDetail(task: Task): void;
    closeDetail(): void;
    onMoveTask(taskId: string, newStatus: TaskStatus): Promise<void>;
}
export {};
//# sourceMappingURL=kanban.d.ts.map