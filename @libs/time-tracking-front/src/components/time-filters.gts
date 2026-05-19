import Component from '@glimmer/component';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';

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
  isProjectSelected = (value: string): boolean =>
    this.args.filters.projectId === value;

  isPeriodSelected = (value: TimeFilters['period']): boolean =>
    this.args.filters.period === value;

  isUserSelected = (value: string): boolean =>
    this.args.filters.userId === value;

  @action onProjectChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    this.args.onChange({ ...this.args.filters, projectId: value });
  }

  @action onPeriodChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as TimeFilters['period'];
    this.args.onChange({ ...this.args.filters, period: value });
  }

  @action onUserChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    this.args.onChange({ ...this.args.filters, userId: value });
  }

  <template>
    <div class="flex gap-3 items-center" data-test-time-filters>
      <div class="flex flex-col gap-1">
        <label class="label label-text text-sm font-medium" for="filter-project">
          {{t "time-tracking.filters.project"}}
        </label>
        <select
          id="filter-project"
          class="select select-bordered select-sm"
          {{on "change" this.onProjectChange}}
        >
          <option value="" selected={{this.isProjectSelected ""}}>
            {{t "time-tracking.filters.periodAll"}}
          </option>
          <option value="proj-1" selected={{this.isProjectSelected "proj-1"}}>
            proj-1
          </option>
          <option value="proj-2" selected={{this.isProjectSelected "proj-2"}}>
            proj-2
          </option>
          <option value="proj-3" selected={{this.isProjectSelected "proj-3"}}>
            proj-3
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-1">
        <label class="label label-text text-sm font-medium" for="filter-period">
          {{t "time-tracking.filters.period"}}
        </label>
        <select
          id="filter-period"
          class="select select-bordered select-sm"
          {{on "change" this.onPeriodChange}}
        >
          <option value="week" selected={{this.isPeriodSelected "week"}}>
            {{t "time-tracking.filters.periodWeek"}}
          </option>
          <option value="month" selected={{this.isPeriodSelected "month"}}>
            {{t "time-tracking.filters.periodMonth"}}
          </option>
          <option value="all" selected={{this.isPeriodSelected "all"}}>
            {{t "time-tracking.filters.periodAll"}}
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-1">
        <label class="label label-text text-sm font-medium" for="filter-user">
          {{t "time-tracking.filters.user"}}
        </label>
        <select
          id="filter-user"
          class="select select-bordered select-sm"
          {{on "change" this.onUserChange}}
        >
          <option value="" selected={{this.isUserSelected ""}}>
            {{t "time-tracking.filters.periodAll"}}
          </option>
          <option value="u1" selected={{this.isUserSelected "u1"}}>
            u1
          </option>
          <option value="u2" selected={{this.isUserSelected "u2"}}>
            u2
          </option>
        </select>
      </div>
    </div>
  </template>
}
