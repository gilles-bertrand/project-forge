import Component from '@glimmer/component';
import type { SprintData } from '@libs/sprints-front/services/sprints';
import type { Task } from '@libs/backlog-front/schemas/tasks';
interface DashboardIndexSignature {
    Args: {
        model: {
            activeSprint: SprintData | null;
            tasks: Task[];
            totalHours: number;
        };
    };
}
export default class DashboardIndexTemplate extends Component<DashboardIndexSignature> {
    get sprintTasks(): Task[];
    get completedCount(): number;
    get totalCount(): number;
    get completedPoints(): number;
}
export {};
//# sourceMappingURL=index.d.ts.map