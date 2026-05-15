import type { TOC } from '@ember/component/template-only';
import PlaceholderPage from '../../components/placeholder-page.gts';

const BacklogTemplate: TOC<Record<string, never>> = <template>
  <PlaceholderPage @title="Backlog" @description="Disponible en P5" />
</template>;

export default BacklogTemplate;
