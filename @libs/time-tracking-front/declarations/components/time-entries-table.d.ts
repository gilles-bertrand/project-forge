import type { TOC } from '@ember/component/template-only';
import type { TimeEntryData } from '../services/time-entries.ts';
interface TimeEntriesTableSignature {
    Args: {
        entries: TimeEntryData[];
        onEditEntry: (entry: TimeEntryData) => void;
        onDeleteEntry: (id: string) => void;
    };
}
declare const TimeEntriesTable: TOC<TimeEntriesTableSignature>;
export default TimeEntriesTable;
//# sourceMappingURL=time-entries-table.d.ts.map