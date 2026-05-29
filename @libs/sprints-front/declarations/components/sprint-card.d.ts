import Component from '@glimmer/component';
import type { SprintData } from '../services/sprints.ts';
import type { Task } from '@libs/backlog-front/schemas/tasks';
interface SprintCardSignature {
    Args: {
        sprint: SprintData;
        tasks: Task[];
        onStart?: (sprintId: string) => void;
        onStop?: (sprintId: string) => void;
        onPlanTask?: (taskId: string, sprintId: string) => void;
        onOpenTask?: (task: Task) => void;
    };
    Element: HTMLDivElement;
}
export default class SprintCard extends Component<SprintCardSignature> {
    burndownOpen: boolean;
    get isActive(): boolean;
    get isPlanned(): boolean;
    get isCompleted(): boolean;
    get statusBadgeClass(): string;
    get statusKey(): string;
    get progressPercent(): number;
    get sprintCode(): string;
    get isOverVelocity(): boolean;
    get tasksCount(): number;
    get doneTasksCount(): number;
    get showBurndown(): boolean;
    openBurndown(): void;
    closeBurndown(): void;
    onStartClick(): void;
    onStopClick(): void;
    onDragOver(e: DragEvent): void;
    onDrop(e: DragEvent): void;
}
export {};
//# sourceMappingURL=sprint-card.d.ts.map