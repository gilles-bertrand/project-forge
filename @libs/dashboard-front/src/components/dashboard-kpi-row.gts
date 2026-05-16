import type { TOC } from '@ember/component/template-only';
import { t } from 'ember-intl';
import DashboardKpiCard from './dashboard-kpi-card.gts';

interface DashboardKpiRowSignature {
  Args: {
    completedTasks: number;
    totalTasks: number;
    totalHours: number;
    completedPoints: number;
  };
}

const DashboardKpiRow: TOC<DashboardKpiRowSignature> = <template>
  <div class="grid grid-cols-3 gap-4">
    <DashboardKpiCard
      @icon="✅"
      @label={{t "dashboard.kpi.completedTasks"}}
      @value="{{@completedTasks}}/{{@totalTasks}}"
    />
    <DashboardKpiCard
      @icon="⏱"
      @label={{t "dashboard.kpi.hoursWorked"}}
      @value={{@totalHours}}
    />
    <DashboardKpiCard
      @icon="⚡"
      @label={{t "dashboard.kpi.storyPoints"}}
      @value={{@completedPoints}}
    />
  </div>
</template>;

export default DashboardKpiRow;
