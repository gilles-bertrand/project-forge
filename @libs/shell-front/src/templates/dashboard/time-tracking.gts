import type { TOC } from '@ember/component/template-only';
import PlaceholderPage from '../../components/placeholder-page.gts';

const TimeTrackingTemplate: TOC<Record<string, never>> = <template>
  <PlaceholderPage @title="Suivi du temps" @description="Disponible en P9" />
</template>;

export default TimeTrackingTemplate;
