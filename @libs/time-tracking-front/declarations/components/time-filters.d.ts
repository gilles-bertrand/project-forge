import Component from '@glimmer/component';
export interface TimeFilters {
    projectId: string;
    period: 'week' | 'month' | 'all';
    userId: string;
}
interface TimeFiltersSignature {
    Args: {
        filters: TimeFilters;
        onChange: (updated: TimeFilters) => void;
    };
}
export default class TimeFiltersComponent extends Component<TimeFiltersSignature> {
    isProjectSelected: (value: string) => boolean;
    isPeriodSelected: (value: TimeFilters["period"]) => boolean;
    isUserSelected: (value: string) => boolean;
    onProjectChange(e: Event): void;
    onPeriodChange(e: Event): void;
    onUserChange(e: Event): void;
}
export {};
//# sourceMappingURL=time-filters.d.ts.map