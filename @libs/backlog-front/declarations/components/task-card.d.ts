import Component from '@glimmer/component';
import type { Task } from '../schemas/tasks.ts';
import type { UserStory } from '../schemas/user-stories.ts';
interface TaskCardSignature {
    Args: {
        task: Task;
        userStory?: UserStory | null;
        variant?: 'kanban' | 'dashboard';
        draggable?: boolean;
        onOpen?: (task: Task) => void;
    };
    Element: HTMLDivElement;
}
export default class TaskCard extends Component<TaskCardSignature> {
    get isKanban(): boolean;
    get numberLabel(): string;
    get initials(): string;
    handleClick(): void;
    onDragStart(e: DragEvent): void;
}
export {};
//# sourceMappingURL=task-card.d.ts.map