import Component from '@glimmer/component';
import type { Task, TaskNature, TaskType } from '../schemas/tasks.ts';
interface BacklogFiltersSignature {
    Args: {
        tasks: Task[];
        onFilter: (filtered: Task[]) => void;
    };
}
export default class BacklogFilters extends Component<BacklogFiltersSignature> {
    activeNature: TaskNature | null;
    activeType: TaskType | null;
    get availableNatures(): TaskNature[];
    get availableTypes(): TaskType[];
    get filteredTasks(): Task[];
    setNature(nature: TaskNature | null): void;
    setType(type: TaskType | null): void;
    clearAll(): void;
    get noFilterActive(): boolean;
    isNatureActive: (nature: TaskNature) => boolean;
    isTypeActive: (type: TaskType) => boolean;
}
export {};
//# sourceMappingURL=backlog-filters.d.ts.map