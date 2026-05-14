import type { TOC } from '@ember/component/template-only';
import PlaceholderPage from '../../components/placeholder-page.gts';

const SettingsTemplate: TOC<Record<string, never>> = <template>
  <PlaceholderPage @title="Paramètres" @description="Disponible en P12" />
</template>;

export default SettingsTemplate;
