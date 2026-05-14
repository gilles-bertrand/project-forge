import type { TOC } from '@ember/component/template-only';
import PlaceholderPage from '../../components/placeholder-page.gts';

const KanbanTemplate: TOC<Record<string, never>> = <template>
  <PlaceholderPage @title="Kanban" @description="Disponible en P7" />
</template>;

export default KanbanTemplate;
