import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import TpkSearchPrefab from '@triptyk/ember-input/components/prefabs/tpk-search';
import TpkButton from '@triptyk/ember-input/components/tpk-button';
import { t } from 'ember-intl';
import ProjectSelector from './project-selector.gts';
import SearchDropdown, { type SearchResult } from './search-dropdown.gts';
import AddItemModal, { type AddItemType } from './add-item-modal.gts';
import type RouterService from '@ember/routing/router-service';

interface ShellHeaderSignature {
  Args: { projects?: { id: string; name: string }[] };
}

export default class ShellHeader extends Component<ShellHeaderSignature> {
  @service declare router: RouterService;

  @tracked searchQuery = '';
  @tracked showSearchDropdown = false;
  @tracked showAddItemModal = false;

  @action navigateToTimeTracking() {
    void this.router.transitionTo('dashboard.time-tracking');
  }

  @action onSearchInput(_e: Event, value: string) {
    this.searchQuery = value;
    this.showSearchDropdown = value.length > 0;
  }

  @action closeSearch() {
    this.showSearchDropdown = false;
    this.searchQuery = '';
  }

  @action onSearchResultSelect(item: SearchResult) {
    this.closeSearch();
    const routeMap: Record<string, string> = {
      projects: 'dashboard.projects',
      tasks: 'dashboard.backlog',
      'user-stories': 'dashboard.backlog',
      sprints: 'dashboard.sprints',
    };
    const route = routeMap[item.type] ?? 'dashboard';
    void this.router.transitionTo(route);
  }

  @action openAddItem() {
    this.showAddItemModal = true;
  }

  @action closeAddItem() {
    this.showAddItemModal = false;
  }

  @action onAddItemSelect(type: AddItemType) {
    this.closeAddItem();
    const routeMap: Record<AddItemType, string> = {
      project: 'dashboard.projects',
      epic: 'dashboard.backlog',
      'user-story': 'dashboard.backlog',
      task: 'dashboard.backlog',
      sprint: 'dashboard.sprints',
      'time-entry': 'dashboard.time-tracking',
    };
    void this.router.transitionTo(routeMap[type]);
  }

  <template>
    <div class="flex items-center gap-3 flex-1 px-4">
      <ProjectSelector @projects={{@projects}} />
      <div class="flex-1 max-w-sm relative">
        <TpkSearchPrefab
          @placeholder={{t "shell.header.searchPlaceholder"}}
          @onSearch={{this.onSearchInput}}
        />
        {{#if this.showSearchDropdown}}
          <SearchDropdown
            @query={{this.searchQuery}}
            @onSelect={{this.onSearchResultSelect}}
            @onClose={{this.closeSearch}}
          />
        {{/if}}
      </div>
      <TpkButton
        @label={{t "shell.header.recordTime"}}
        {{on "click" this.navigateToTimeTracking}}
      >
        {{t "shell.header.recordTime"}}
      </TpkButton>
      <TpkButton
        @label={{t "shell.header.add"}}
        {{on "click" this.openAddItem}}
      >
        {{t "shell.header.add"}}
      </TpkButton>
    </div>

    {{#if this.showAddItemModal}}
      <AddItemModal
        @onClose={{this.closeAddItem}}
        @onSelect={{this.onAddItemSelect}}
      />
    {{/if}}
  </template>
}
