import Component from '@glimmer/component';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';

interface SprintsPaginationSignature {
  Args: {
    offset: number;
    total: number;
    pageSize: number;
    onPrev: () => void;
    onNext: () => void;
  };
  Element: HTMLDivElement;
}

export default class SprintsPagination extends Component<SprintsPaginationSignature> {
  get from(): number {
    return this.args.total === 0 ? 0 : this.args.offset + 1;
  }

  get to(): number {
    return Math.min(this.args.offset + this.args.pageSize, this.args.total);
  }

  get prevDisabled(): boolean {
    return this.args.offset <= 0;
  }

  get nextDisabled(): boolean {
    return this.args.offset + this.args.pageSize >= this.args.total;
  }

  @action handlePrev() {
    if (!this.prevDisabled) this.args.onPrev();
  }

  @action handleNext() {
    if (!this.nextDisabled) this.args.onNext();
  }

  <template>
    <div
      class="flex items-center justify-between"
      data-test-sprints-pagination
      ...attributes
    >
      <span class="text-sm opacity-60" data-test-pagination-range>
        {{t
          "sprints.pagination.range"
          from=this.from
          to=this.to
          total=@total
        }}
      </span>
      <div class="flex gap-1">
        <button
          type="button"
          class="btn btn-sm btn-square"
          disabled={{this.prevDisabled}}
          data-test-pagination-prev
          {{on "click" this.handlePrev}}
          aria-label="Précédent"
        >&lt;</button>
        <button
          type="button"
          class="btn btn-sm btn-square"
          disabled={{this.nextDisabled}}
          data-test-pagination-next
          {{on "click" this.handleNext}}
          aria-label="Suivant"
        >&gt;</button>
      </div>
    </div>
  </template>
}
