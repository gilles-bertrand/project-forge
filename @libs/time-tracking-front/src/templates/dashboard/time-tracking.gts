import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import TimeSummaryCards from '../../components/time-summary-cards.gts';
import TimeFiltersComponent, { type TimeFilters } from '../../components/time-filters.gts';
import TimeEntriesTable from '../../components/time-entries-table.gts';
import LogTimeModal from '../../components/log-time-modal.gts';
import type TimeEntriesService from '../../services/time-entries.ts';
import type {
  TimeEntryData,
  TimeEntriesMeta,
  SummaryResult,
} from '../../services/time-entries.ts';

interface TimeTrackingRouteModel {
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
  @service declare timeEntries: TimeEntriesService;

  @tracked showLogTimeModal = false;
  @tracked editingEntry: TimeEntryData | null = null;
  @tracked filters: TimeFilters = { projectId: '', period: 'all', userId: '' };

  get filteredEntries(): TimeEntryData[] {
    return this.args.model.entries.filter((entry) => {
      if (this.filters.projectId && entry.projectId !== this.filters.projectId) {
        return false;
      }
      if (this.filters.userId && entry.userId !== this.filters.userId) {
        return false;
      }
      if (this.filters.period !== 'all') {
        const now = new Date();
        const entryDate = new Date(entry.date);
        if (this.filters.period === 'week') {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);
          if (entryDate < weekStart) return false;
        } else if (this.filters.period === 'month') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          if (entryDate < monthStart) return false;
        }
      }
      return true;
    });
  }

  @action openLogTime() {
    this.showLogTimeModal = true;
  }

  @action closeModal() {
    this.showLogTimeModal = false;
    this.editingEntry = null;
  }

  @action async onSaved() {
    this.closeModal();
    await this.timeEntries.loadByProject('proj-1');
  }

  @action openEdit(entry: TimeEntryData) {
    this.editingEntry = entry;
  }

  @action async deleteEntry(id: string) {
    await this.timeEntries.delete(id, 'proj-1');
  }

  @action onFiltersChange(updated: TimeFilters) {
    this.filters = updated;
  }

  <template>
    <div>
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold">{{t "time-tracking.title"}}</h1>
          <p class="opacity-70 mt-1">{{t "time-tracking.subtitle"}}</p>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-primary"
          {{on "click" this.openLogTime}}
        >
          + {{t "time-tracking.actions.record"}}
        </button>
      </div>

      <TimeSummaryCards
        @weekSummary={{@model.weekSummary}}
        @monthSummary={{@model.monthSummary}}
      />

      <div class="mt-6">
        <TimeFiltersComponent
          @filters={{this.filters}}
          @onChange={{this.onFiltersChange}}
        />
      </div>

      <div class="mt-4">
        <TimeEntriesTable
          @entries={{this.filteredEntries}}
          @onEditEntry={{this.openEdit}}
          @onDeleteEntry={{this.deleteEntry}}
        />
      </div>
    </div>

    {{#if this.showLogTimeModal}}
      <LogTimeModal
        @onClose={{this.closeModal}}
        @onSaved={{this.onSaved}}
      />
    {{/if}}

    {{#if this.editingEntry}}
      <LogTimeModal
        @taskId={{this.editingEntry.taskId}}
        @projectId={{this.editingEntry.projectId}}
        @onClose={{this.closeModal}}
        @onSaved={{this.onSaved}}
      />
    {{/if}}
  </template>
}
