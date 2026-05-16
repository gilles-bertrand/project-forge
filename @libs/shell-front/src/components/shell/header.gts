import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import TpkSearchPrefab from '@triptyk/ember-input/components/prefabs/tpk-search';
import TpkButton from '@triptyk/ember-input/components/tpk-button';
import { t } from 'ember-intl';
import ProjectSelector from './project-selector.gts';
import type RouterService from '@ember/routing/router-service';

const noop = () => {};

interface ShellHeaderSignature {
  Args: { projects?: { id: string; name: string }[] };
}

export default class ShellHeader extends Component<ShellHeaderSignature> {
  @service declare router: RouterService;

  @action navigateToTimeTracking() {
    void this.router.transitionTo('dashboard.time-tracking');
  }

  <template>
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
        {{on "click" this.navigateToTimeTracking}}
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
  </template>
}
