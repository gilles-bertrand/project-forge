import type { TOC } from '@ember/component/template-only';
import { t } from 'ember-intl';
import type { SummaryResult } from '../services/time-entries.ts';

interface TimeSummaryCardsSignature {
  Args: {
    weekSummary: SummaryResult;
    monthSummary: SummaryResult;
  };
}

const TimeSummaryCards: TOC<TimeSummaryCardsSignature> = <template>
  <div class="grid grid-cols-3 gap-4" data-test-time-summary-cards>
    <div class="card bg-base-200 shadow p-4" data-test-week-hours-card>
      <div class="card-body p-0">
        <h2 class="text-3xl font-bold">{{@weekSummary.totalHours}} h</h2>
        <p class="text-sm opacity-70 mt-1">{{t "time-tracking.summary.weekHours"}}</p>
      </div>
    </div>

    <div class="card bg-base-200 shadow p-4" data-test-month-hours-card>
      <div class="card-body p-0">
        <h2 class="text-3xl font-bold">{{@monthSummary.totalHours}} h</h2>
        <p class="text-sm opacity-70 mt-1">{{t "time-tracking.summary.monthHours"}}</p>
      </div>
    </div>

    <div class="card bg-base-200 shadow p-4" data-test-task-count-card>
      <div class="card-body p-0">
        <h2 class="text-3xl font-bold">{{@weekSummary.taskCount}}</h2>
        <p class="text-sm opacity-70 mt-1">{{t "time-tracking.summary.taskCount"}}</p>
      </div>
    </div>
  </div>
</template>;

export default TimeSummaryCards;
