import Component from '@glimmer/component';
import type SprintsService from '../../services/sprints.ts';
import type { SprintData } from '../../services/sprints.ts';
import type CurrentProjectService from '@libs/shell-front/services/current-project';
import type { Task } from '@libs/backlog-front/schemas/tasks';
interface SprintsTemplateSignature {
    Args: {
        model: {
            projectId: string | null;
            sprints: SprintData[];
        };
    };
}
export default class DashboardSprintsTemplate extends Component<SprintsTemplateSignature> {
    sprints: SprintsService;
    currentProject: CurrentProjectService;
    addOpen: boolean;
    offset: number;
    errorMessage: string | null;
    backlogTasks: Task[];
    tasksBySprintCache: Record<string, Task[]>;
    constructor(owner: unknown, args: SprintsTemplateSignature['Args']);
    private loadBacklogTasks;
    private loadAllSprintTasks;
    tasksFor: (sprintId: string) => Task[];
    get visibleSprints(): SprintData[];
    get total(): number;
    openAdd(): void;
    closeAdd(): void;
    onPrev(): void;
    onNext(): void;
    onStart(sprintId: string): Promise<void>;
    onStop(sprintId: string): Promise<void>;
    onPlanTask(taskId: string, sprintId: string): Promise<void>;
}
export {};
//# sourceMappingURL=sprints.d.ts.map