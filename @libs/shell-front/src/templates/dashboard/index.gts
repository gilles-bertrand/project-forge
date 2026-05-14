import type { TOC } from '@ember/component/template-only';
import PlaceholderPage from '../../components/placeholder-page.gts';

const DashboardIndexTemplate: TOC<Record<string, never>> = <template>
  <div class="space-y-6">
    <div class="grid grid-cols-3 gap-4">
      <div class="card bg-base-200 shadow">
        <div class="card-body">
          <h2 class="card-title text-sm">Tâches terminées</h2>
          <p class="text-2xl font-bold">0 / 0</p>
          <p class="text-xs opacity-60">Données disponibles en P10</p>
        </div>
      </div>
      <div class="card bg-base-200 shadow">
        <div class="card-body">
          <h2 class="card-title text-sm">Heures travaillées</h2>
          <p class="text-2xl font-bold">0</p>
          <p class="text-xs opacity-60">Données disponibles en P10</p>
        </div>
      </div>
      <div class="card bg-base-200 shadow">
        <div class="card-body">
          <h2 class="card-title text-sm">Points d'efforts</h2>
          <p class="text-2xl font-bold">0</p>
          <p class="text-xs opacity-60">Données disponibles en P10</p>
        </div>
      </div>
    </div>
    <PlaceholderPage @title="Tableau de bord" @description="Données réelles disponibles en P10" />
  </div>
</template>;

export default DashboardIndexTemplate;
