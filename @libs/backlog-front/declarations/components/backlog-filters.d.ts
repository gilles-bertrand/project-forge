import Component from '@glimmer/component';
import type { Task, TaskNature, TaskType } from '../schemas/tasks.ts';
import type { UserStory } from '../schemas/user-stories.ts';
export type BacklogSegment = 'sandbox' | 'product-backlog' | 'sprint-backlog';
interface BacklogFiltersSignature {
    Args: {
        tasks: Task[];
        userStories?: UserStory[];
        onFilter: (filtered: Task[]) => void;
    };
}
export default class BacklogFilters extends Component<BacklogFiltersSignature> {
    activeNature: TaskNature | null;
    activeType: TaskType | null;
    activeSegment: BacklogSegment | null;
    get availableNatures(): TaskNature[];
    get availableTypes(): TaskType[];
    get segmentByStoryId(): Map<string, BacklogSegment | null>;
    get availableSegments(): BacklogSegment[];
    get filteredTasks(): Task[];
    setNature(nature: TaskNature | null): void;
    setType(type: TaskType | null): void;
    setSegment(segment: BacklogSegment | null): void;
    clearAll(): void;
    get noFilterActive(): boolean;
    isNatureActive: (nature: TaskNature) => boolean;
    isTypeActive: (type: TaskType) => boolean;
    isSegmentActive: (segment: BacklogSegment) => boolean;
}
export {};
//# sourceMappingURL=backlog-filters.d.ts.map