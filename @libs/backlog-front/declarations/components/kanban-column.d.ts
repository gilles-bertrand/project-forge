import Component from '@glimmer/component';
import type { Task, TaskStatus } from '../schemas/tasks.ts';
interface KanbanColumnSignature {
    Args: {
        status: TaskStatus;
        tasks: Task[];
        onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
        onOpenTask?: (task: Task) => void;
    };
    Element: HTMLDivElement;
}
export default class KanbanColumn extends Component<KanbanColumnSignature> {
    onDragOver(e: DragEvent): void;
    onDrop(e: DragEvent): void;
}
export {};
//# sourceMappingURL=kanban-column.d.ts.map