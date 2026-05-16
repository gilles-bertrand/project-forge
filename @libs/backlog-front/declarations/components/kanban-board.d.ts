import Component from '@glimmer/component';
import type { Task, TaskStatus } from '../schemas/tasks.ts';
interface KanbanBoardSignature {
    Args: {
        tasks: Task[];
        onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
        onOpenTask?: (task: Task) => void;
    };
    Element: HTMLDivElement;
}
export default class KanbanBoard extends Component<KanbanBoardSignature> {
    get tasksByStatus(): Record<TaskStatus, Task[]>;
    tasksFor: (status: TaskStatus) => Task[];
}
export {};
//# sourceMappingURL=kanban-board.d.ts.map