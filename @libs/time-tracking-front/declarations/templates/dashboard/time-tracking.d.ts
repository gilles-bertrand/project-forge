import Component from '@glimmer/component';
import { type TimeFilters } from '../../components/time-filters';
import type TimeEntriesService from '../../services/time-entries.ts';
import type { TimeEntryData, TimeEntriesMeta, SummaryResult } from '../../services/time-entries.ts';
interface TimeTrackingRouteModel {
    projectId: string;
    entries: TimeEntryData[];
    meta: TimeEntriesMeta;
    weekSummary: SummaryResult;
    monthSummary: SummaryResult;
}
interface TimeTrackingTemplateSignature {
    Args: {
        model: TimeTrackingRouteModel;
    };
}
export default class DashboardTimeTrackingTemplate extends Component<TimeTrackingTemplateSignature> {
    timeEntries: TimeEntriesService;
    showLogTimeModal: boolean;
    editingEntry: TimeEntryData | null;
    filters: TimeFilters;
    get sourceEntries(): TimeEntryData[];
    get filteredEntries(): TimeEntryData[];
    openLogTime(): void;
    closeModal(): void;
    onSaved(): Promise<void>;
    openEdit(entry: TimeEntryData): void;
    deleteEntry(id: string): Promise<void>;
    onFiltersChange(updated: TimeFilters): void;
}
export {};
//# sourceMappingURL=time-tracking.d.ts.map