import type { TOC } from '@ember/component/template-only';
import TpkSearchPrefab from '@triptyk/ember-input/components/prefabs/tpk-search';
import TpkButton from '@triptyk/ember-input/components/tpk-button';
import { t } from 'ember-intl';
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
        @placeholder={{t "shell.header.searchPlaceholder"}}
        @onSearch={{noop}}
      />
    </div>
    <TpkButton
      @label={{t "shell.header.recordTime"}}
      @disabled={{true}}
      title="Disponible en P9"
    >
      {{t "shell.header.recordTime"}}
    </TpkButton>
    <TpkButton
      @label={{t "shell.header.add"}}
      @disabled={{true}}
      title="Disponible en P4"
    >
      {{t "shell.header.add"}}
    </TpkButton>
  </div>
</template>;

export default ShellHeader;
