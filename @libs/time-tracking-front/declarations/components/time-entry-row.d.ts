import Component from '@glimmer/component';
import type { TimeEntryData } from '../services/time-entries.ts';
interface TimeEntryRowSignature {
    Args: {
        entry: TimeEntryData;
        onEdit: (entry: TimeEntryData) => void;
        onDelete: (id: string) => void;
    };
}
export default class TimeEntryRow extends Component<TimeEntryRowSignature> {
    get formattedDate(): string;
    get truncatedDescription(): string;
    handleEdit(): void;
    handleDelete(): void;
}
export {};
//# sourceMappingURL=time-entry-row.d.ts.map