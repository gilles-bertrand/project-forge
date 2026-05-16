import type { TOC } from '@ember/component/template-only';

interface DashboardKpiCardSignature {
  Args: {
    label: string;
    value: string | number;
    icon?: string;
  };
}

const DashboardKpiCard: TOC<DashboardKpiCardSignature> = <template>
  <div class="card bg-base-200 shadow">
    <div class="card-body">
      <div class="flex items-center gap-2 mb-2">
        {{#if @icon}}<span class="text-2xl">{{@icon}}</span>{{/if}}
        <h2 class="card-title text-sm opacity-70">{{@label}}</h2>
      </div>
      <p class="text-3xl font-bold">{{@value}}</p>
    </div>
  </div>
</template>;

export default DashboardKpiCard;
