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
import type AddItemRouterService from '@libs/shared-front/services/add-item-router';
import type { TOC } from '@ember/component/template-only';

const ClockIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="size-4 stroke-current"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
    />
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 6v6l4 2"
    />
  </svg>
</template>;

const PlusIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="size-4 stroke-current"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 4v16m8-8H4"
    />
  </svg>
</template>;

const MenuIcon: TOC<{ Element: SVGSVGElement }> = <template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    class="size-5 stroke-current"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
</template>;

interface ShellHeaderSignature {
  Args: {
    projects?: { id: string; name: string }[];
    onSidebarToggle?: () => void;
  };
}

export default class ShellHeader extends Component<ShellHeaderSignature> {
  @service declare router: RouterService;
  @service declare addItemRouter: AddItemRouterService;

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
    this.addItemRouter.open(type);
  }

  @action handleSidebarToggle() {
    this.args.onSidebarToggle?.();
  }

  <template>
    <div
      class="flex items-center gap-3 px-4 py-2 border-b border-border bg-background sticky top-0 z-10 h-14"
    >
      {{#if @onSidebarToggle}}
        <button
          type="button"
          class="btn btn-ghost btn-sm btn-square lg:hidden"
          aria-label="toggle sidebar"
          {{on "click" this.handleSidebarToggle}}
        >
          <MenuIcon />
        </button>
      {{/if}}
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
      <div class="ml-auto flex items-center gap-2">
        <TpkButton
          @label={{t "shell.header.recordTime"}}
          class="btn btn-sm gap-2"
          {{on "click" this.navigateToTimeTracking}}
        >
          <ClockIcon />
          {{t "shell.header.recordTime"}}
        </TpkButton>
        <TpkButton
          @label={{t "shell.header.add"}}
          class="btn btn-sm btn-primary gap-2"
          {{on "click" this.openAddItem}}
        >
          <PlusIcon />
          {{t "shell.header.add"}}
        </TpkButton>
      </div>
    </div>

    {{#if this.showAddItemModal}}
      <AddItemModal
        @onClose={{this.closeAddItem}}
        @onSelect={{this.onAddItemSelect}}
      />
    {{/if}}
  </template>
}
