import type { TOC } from '@ember/component/template-only';
import PlaceholderPage from '../../components/placeholder-page.gts';

const ProjectsTemplate: TOC<Record<string, never>> = <template>
  <PlaceholderPage @title="Projets" @description="Disponible en P4" />
</template>;

export default ProjectsTemplate;
