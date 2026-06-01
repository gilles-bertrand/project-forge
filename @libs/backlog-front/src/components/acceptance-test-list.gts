import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { fn, concat } from '@ember/helper';
import { t } from 'ember-intl';
import type Owner from '@ember/owner';
import type AcceptanceTestsService from '../services/acceptance-tests.ts';
import type CurrentUserService from '@libs/users-front/services/current-user';
import type {
  AcceptanceTest,
  AcceptanceTestState,
} from '../schemas/acceptance-tests.ts';

interface AcceptanceTestListSignature {
  Args: {
    ownerType: 'task' | 'user-story';
    ownerId: string;
  };
}

const STATE_CYCLE: Record<AcceptanceTestState, AcceptanceTestState> = {
  'to-check': 'success',
  success: 'failed',
  failed: 'to-check',
};

const STATE_BADGE_CLASS: Record<AcceptanceTestState, string> = {
  'to-check': 'badge-ghost',
  success: 'badge-success',
  failed: 'badge-error',
};

const STATE_SYMBOL: Record<AcceptanceTestState, string> = {
  'to-check': '○',
  success: '✓',
  failed: '✗',
};

export default class AcceptanceTestList extends Component<AcceptanceTestListSignature> {
  @service declare acceptanceTests: AcceptanceTestsService;
  @service('current-user') declare currentUser: CurrentUserService;

  @tracked items: AcceptanceTest[] = [];
  @tracked loading = true;
  @tracked error = '';
  @tracked newName = '';
  @tracked submitting = false;

  constructor(owner: Owner, args: AcceptanceTestListSignature['Args']) {
    super(owner, args);
    void this.load();
  }

  load = async () => {
    this.loading = true;
    this.error = '';
    try {
      const items =
        this.args.ownerType === 'task'
          ? await this.acceptanceTests.loadByTask(this.args.ownerId)
          : await this.acceptanceTests.loadByStory(this.args.ownerId);
      this.items = [...(items ?? [])].sort((a, b) => a.rank - b.rank);
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      if (!this.isDestroying && !this.isDestroyed) {
        this.loading = false;
      }
    }
  };

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  badgeClassFor = (state: AcceptanceTestState): string =>
    `badge ${STATE_BADGE_CLASS[state]}`;

  symbolFor = (state: AcceptanceTestState): string => STATE_SYMBOL[state];

  @action onNewNameInput(e: Event) {
    this.newName = (e.target as HTMLInputElement).value;
  }

  @action async cycleState(at: AcceptanceTest) {
    const nextState = STATE_CYCLE[at.state];
    try {
      const updated = await this.acceptanceTests.update(at.id, {
        state: nextState,
      });
      this.items = this.items.map((it) => (it.id === at.id ? updated : it));
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  @action async removeItem(at: AcceptanceTest) {
    try {
      await this.acceptanceTests.remove(at.id);
      this.items = this.items.filter((it) => it.id !== at.id);
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  @action async add(e: Event) {
    e.preventDefault();
    const name = this.newName.trim();
    if (!name || this.submitting) return;
    this.submitting = true;
    this.error = '';
    try {
      const nextRank =
        this.items.length === 0
          ? 0
          : Math.max(...this.items.map((it) => it.rank)) + 1;
      const payload = {
        name,
        description: '',
        rank: nextRank,
        createdById: this.currentUser.user?.id ?? null,
      };
      const created =
        this.args.ownerType === 'task'
          ? await this.acceptanceTests.createOnTask(this.args.ownerId, payload)
          : await this.acceptanceTests.create(this.args.ownerId, payload);
      this.items = [...this.items, created];
      this.newName = '';
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      if (!this.isDestroying && !this.isDestroyed) {
        this.submitting = false;
      }
    }
  }

  <template>
    <section
      class="border-t border-base-300 pt-4 mt-2"
      data-test-acceptance-test-list
    >
      <h4 class="font-semibold mb-2 text-sm">
        {{t "backlog.acceptanceTests.title"}}
      </h4>

      {{#if this.loading}}
        <p class="text-sm italic opacity-60">
          {{t "backlog.acceptanceTests.loading"}}
        </p>
      {{else if this.isEmpty}}
        <p class="text-sm italic opacity-60" data-test-acceptance-test-empty>
          {{t "backlog.acceptanceTests.empty"}}
        </p>
      {{else}}
        <ul class="space-y-1 mb-2">
          {{#each this.items as |at|}}
            <li
              class="flex items-center gap-2 text-sm"
              data-test-acceptance-test-row={{at.id}}
            >
              <button
                type="button"
                class={{this.badgeClassFor at.state}}
                title={{t (concat "backlog.acceptanceTests.state." at.state)}}
                aria-label={{t
                  (concat "backlog.acceptanceTests.state." at.state)
                }}
                data-test-acceptance-test-state
                {{on "click" (fn this.cycleState at)}}
              >{{this.symbolFor at.state}}</button>
              <span class="flex-1 truncate">{{at.name}}</span>
              <button
                type="button"
                class="btn btn-xs btn-ghost text-error"
                aria-label={{t "backlog.acceptanceTests.deleteAria"}}
                data-test-acceptance-test-delete
                {{on "click" (fn this.removeItem at)}}
              >✕</button>
            </li>
          {{/each}}
        </ul>
      {{/if}}

      <form class="flex gap-2 mt-2" {{on "submit" this.add}}>
        <label class="sr-only" for="acceptance-test-new-name">
          {{t "backlog.acceptanceTests.newPlaceholder"}}
        </label>
        <input
          id="acceptance-test-new-name"
          type="text"
          class="input input-sm input-bordered flex-1"
          placeholder={{t "backlog.acceptanceTests.newPlaceholder"}}
          value={{this.newName}}
          {{on "input" this.onNewNameInput}}
          data-test-acceptance-test-new-input
        />
        <button
          type="submit"
          class="btn btn-sm btn-primary"
          disabled={{this.submitting}}
          data-test-acceptance-test-add
        >{{t "backlog.acceptanceTests.add"}}</button>
      </form>

      {{#if this.error}}
        <div
          class="alert alert-error text-xs mt-2"
          data-test-acceptance-test-error
        >{{this.error}}</div>
      {{/if}}
    </section>
  </template>
}
