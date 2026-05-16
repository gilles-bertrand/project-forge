import { t } from 'ember-intl';
import type { TOC } from '@ember/component/template-only';
import TimeEntryRow from './time-entry-row.gts';
import type { TimeEntryData } from '../services/time-entries.ts';

interface TimeEntriesTableSignature {
  Args: {
    entries: TimeEntryData[];
    onEditEntry: (entry: TimeEntryData) => void;
    onDeleteEntry: (id: string) => void;
  };
}

const TimeEntriesTable: TOC<TimeEntriesTableSignature> = <template>
  <table class="table table-zebra w-full" data-test-time-entries-table>
    <thead>
      <tr>
        <th>{{t "time-tracking.table.date"}}</th>
        <th>{{t "time-tracking.table.task"}}</th>
        <th>{{t "time-tracking.table.project"}}</th>
        <th>{{t "time-tracking.table.user"}}</th>
        <th class="text-right">{{t "time-tracking.table.hours"}}</th>
        <th>{{t "time-tracking.table.description"}}</th>
        <th>{{t "time-tracking.table.actions"}}</th>
      </tr>
    </thead>
    <tbody>
      {{#each @entries as |entry|}}
        <TimeEntryRow
          @entry={{entry}}
          @onEdit={{@onEditEntry}}
          @onDelete={{@onDeleteEntry}}
        />
      {{else}}
        <tr>
          <td colspan="7">
            <p data-test-empty>{{t "time-tracking.table.empty"}}</p>
          </td>
        </tr>
      {{/each}}
    </tbody>
  </table>
</template>;

export default TimeEntriesTable;
