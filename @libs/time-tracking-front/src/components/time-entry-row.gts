import Component from '@glimmer/component';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import type { TimeEntryData } from '../services/time-entries.ts';

interface TimeEntryRowSignature {
  Args: {
    entry: TimeEntryData;
    onEdit: (entry: TimeEntryData) => void;
    onDelete: (id: string) => void;
  };
}

export default class TimeEntryRow extends Component<TimeEntryRowSignature> {
  get formattedDate(): string {
    const raw = this.args.entry.date;
    // raw is ISO date string: YYYY-MM-DD
    const [year, month, day] = raw.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }

  get truncatedDescription(): string {
    const desc = this.args.entry.description;
    if (!desc) return '—';
    return desc.length > 40 ? `${desc.slice(0, 40)}…` : desc;
  }

  @action handleEdit() {
    this.args.onEdit(this.args.entry);
  }

  @action handleDelete() {
    this.args.onDelete(this.args.entry.id);
  }

  <template>
    <tr data-test-time-entry-row>
      <td class="whitespace-nowrap">{{this.formattedDate}}</td>
      <td class="font-mono text-xs">#{{@entry.taskId}}</td>
      <td>{{@entry.projectId}}</td>
      <td>
        <div
          class="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-content"
        >
          U{{@entry.userId}}
        </div>
      </td>
      <td class="text-right tabular-nums">{{@entry.hours}} h</td>
      <td class="max-w-[200px] truncate text-sm opacity-70" title={{@entry.description}}>
        {{this.truncatedDescription}}
      </td>
      <td class="whitespace-nowrap">
        <button
          type="button"
          class="btn btn-xs btn-ghost mr-1"
          data-test-edit-btn
          {{on "click" this.handleEdit}}
        >Edit</button>
        <button
          type="button"
          class="btn btn-xs btn-error btn-ghost"
          data-test-delete-btn
          {{on "click" this.handleDelete}}
        >Delete</button>
      </td>
    </tr>
  </template>
}
