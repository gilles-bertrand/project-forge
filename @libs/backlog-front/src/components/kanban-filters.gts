import Component from '@glimmer/component';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';

export type KanbanFilterValue = 'all' | 'mine';

interface KanbanFiltersSignature {
  Args: {
    value: KanbanFilterValue;
    onChange: (value: KanbanFilterValue) => void;
  };
  Element: HTMLDivElement;
}

export default class KanbanFilters extends Component<KanbanFiltersSignature> {
  isSelected = (v: KanbanFilterValue): boolean => this.args.value === v;

  @action selectAll() {
    this.args.onChange('all');
  }

  @action selectMine() {
    this.args.onChange('mine');
  }

  <template>
    <div class="join" role="group" data-test-kanban-filters ...attributes>
      <button
        type="button"
        class="join-item btn btn-sm
          {{if (this.isSelected 'all') 'btn-primary'}}"
        aria-pressed={{this.isSelected "all"}}
        data-test-filter="all"
        {{on "click" this.selectAll}}
      >
        {{t "backlog.kanban.filters.all"}}
      </button>
      <button
        type="button"
        class="join-item btn btn-sm
          {{if (this.isSelected 'mine') 'btn-primary'}}"
        aria-pressed={{this.isSelected "mine"}}
        data-test-filter="mine"
        {{on "click" this.selectMine}}
      >
        {{t "backlog.kanban.filters.mine"}}
      </button>
    </div>
  </template>
}
