import type { TOC } from '@ember/component/template-only';
import TpkSearchPrefab from '@triptyk/ember-input/components/prefabs/tpk-search';
import TpkButton from '@triptyk/ember-input/components/tpk-button';
import ProjectSelector from './project-selector.gts';

const noop = () => {};

interface ShellHeaderSignature {
  Args: { projects?: { id: string; name: string }[] };
}

const ShellHeader: TOC<ShellHeaderSignature> = <template>
  <div class="flex items-center gap-3 flex-1 px-4">
    <ProjectSelector @projects={{@projects}} />
    <div class="flex-1 max-w-sm">
      <TpkSearchPrefab
        @placeholder="Rechercher..."
        @onSearch={{noop}}
      />
    </div>
    <TpkButton
      @label="Enregistrer du temps"
      @disabled={{true}}
      title="Disponible en P9"
    />
    <TpkButton
      @label="Ajouter"
      @disabled={{true}}
      title="Disponible en P4"
    />
  </div>
</template>;

export default ShellHeader;
