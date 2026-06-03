import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { fn, concat } from '@ember/helper';
import { t } from 'ember-intl';
import type Owner from '@ember/owner';
import type StoryDependenciesService from '../services/story-dependencies.ts';
import type {
  StoryDependency,
  StoryDependencyType,
} from '../services/story-dependencies.ts';
import type UserStoriesService from '../services/user-stories.ts';

interface StoryDependencyListSignature {
  Element: HTMLElement;
  Args: {
    storyId: string;
    projectId?: string | null;
  };
}

const TYPE_VALUES: StoryDependencyType[] = ['blocks', 'relates-to'];

export default class StoryDependencyList extends Component<StoryDependencyListSignature> {
  @service('story-dependencies')
  declare storyDependencies: StoryDependenciesService;
  @service declare userStories: UserStoriesService;

  @tracked outgoing: StoryDependency[] = [];
  @tracked incoming: StoryDependency[] = [];
  @tracked loading = true;
  @tracked submitting = false;
  @tracked error = '';
  @tracked newToStoryId = '';
  @tracked newType: StoryDependencyType = 'blocks';

  constructor(owner: Owner, args: StoryDependencyListSignature['Args']) {
    super(owner, args);
    void this.load();
  }

  load = async () => {
    this.loading = true;
    this.error = '';
    try {
      if (this.args.projectId && this.userStories.list.length === 0) {
        await this.userStories.loadByProject(this.args.projectId);
      }
      const deps = await this.storyDependencies.loadByStory(this.args.storyId);
      this.outgoing = deps.outgoing;
      this.incoming = deps.incoming;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      if (!this.isDestroying && !this.isDestroyed) this.loading = false;
    }
  };

  get isEmpty(): boolean {
    return this.outgoing.length === 0 && this.incoming.length === 0;
  }

  get isPlaceholderSelected(): boolean {
    return this.newToStoryId === '';
  }

  storyTitle = (id: string): string =>
    this.userStories.list.find((s) => s.id === id)?.title ?? id;

  typeLabelKey = (type: StoryDependencyType): string =>
    `backlog.dependencies.type.${type}`;

  get typeOptions(): { value: StoryDependencyType; label: string }[] {
    return TYPE_VALUES.map((value) => ({ value, label: value }));
  }

  // Project stories eligible as a new dependency target: not self, not already
  // an outgoing target.
  get candidates() {
    const linked = new Set(this.outgoing.map((d) => d.toStoryId));
    return this.userStories.list.filter(
      (s) => s.id != null && s.id !== this.args.storyId && !linked.has(s.id)
    );
  }

  @action onTargetChange(e: Event) {
    this.newToStoryId = (e.target as HTMLSelectElement).value;
  }

  @action onTypeChange(e: Event) {
    const v = (e.target as HTMLSelectElement).value as StoryDependencyType;
    if (TYPE_VALUES.includes(v)) this.newType = v;
  }

  @action async add(e: Event) {
    e.preventDefault();
    if (!this.newToStoryId || this.submitting) return;
    this.submitting = true;
    this.error = '';
    try {
      const created = await this.storyDependencies.create(
        this.args.storyId,
        this.newToStoryId,
        this.newType
      );
      this.outgoing = [...this.outgoing, created];
      this.newToStoryId = '';
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      if (!this.isDestroying && !this.isDestroyed) this.submitting = false;
    }
  }

  @action async removeDep(dep: StoryDependency) {
    this.error = '';
    try {
      await this.storyDependencies.remove(dep.id);
      this.outgoing = this.outgoing.filter((d) => d.id !== dep.id);
      this.incoming = this.incoming.filter((d) => d.id !== dep.id);
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  <template>
    <section data-test-story-dependency-list ...attributes>
      {{#if this.loading}}
        <p class="text-sm italic opacity-60">
          {{t "backlog.dependencies.loading"}}
        </p>
      {{else}}
        {{#if this.isEmpty}}
          <p class="text-sm italic opacity-60" data-test-dependency-empty>{{t
              "backlog.dependencies.empty"
            }}</p>
        {{else}}
          <ul class="space-y-1 mb-2">
            {{#each this.outgoing as |dep|}}
              <li
                class="flex items-center gap-2 text-sm"
                data-test-dependency-row={{dep.id}}
              >
                <span class="badge badge-sm badge-warning">{{t
                    (this.typeLabelKey dep.type)
                  }}</span>
                <span class="flex-1 truncate">{{this.storyTitle
                    dep.toStoryId
                  }}</span>
                <button
                  type="button"
                  class="btn btn-xs btn-ghost text-error"
                  aria-label={{t "backlog.dependencies.removeAria"}}
                  data-test-dependency-delete
                  {{on "click" (fn this.removeDep dep)}}
                >✕</button>
              </li>
            {{/each}}
            {{#each this.incoming as |dep|}}
              <li
                class="flex items-center gap-2 text-sm opacity-80"
                data-test-dependency-incoming-row={{dep.id}}
              >
                <span class="badge badge-sm badge-ghost">{{t
                    "backlog.dependencies.incoming"
                  }}</span>
                <span class="flex-1 truncate">{{this.storyTitle
                    dep.fromStoryId
                  }}</span>
                <span class="text-xs opacity-60">{{t
                    (this.typeLabelKey dep.type)
                  }}</span>
              </li>
            {{/each}}
          </ul>
        {{/if}}

        <form class="flex gap-2 mt-2" {{on "submit" this.add}}>
          <label class="sr-only" for="dependency-target">
            {{t "backlog.dependencies.addPlaceholder"}}
          </label>
          <select
            id="dependency-target"
            class="select select-sm select-bordered flex-1 min-w-0"
            data-test-dependency-target
            {{on "change" this.onTargetChange}}
          >
            <option value="" selected={{this.isPlaceholderSelected}}>
              {{t "backlog.dependencies.addPlaceholder"}}
            </option>
            {{#each this.candidates as |story|}}
              <option value={{story.id}}>{{story.title}}</option>
            {{/each}}
          </select>
          <select
            class="select select-sm select-bordered w-28 shrink-0"
            aria-label={{t "backlog.dependencies.typeAria"}}
            data-test-dependency-type
            {{on "change" this.onTypeChange}}
          >
            {{#each this.typeOptions as |opt|}}
              <option value={{opt.value}}>{{t
                  (concat "backlog.dependencies.type." opt.value)
                }}</option>
            {{/each}}
          </select>
          <button
            type="submit"
            class="btn btn-sm btn-primary"
            disabled={{this.submitting}}
            data-test-dependency-add
          >{{t "backlog.dependencies.add"}}</button>
        </form>
      {{/if}}

      {{#if this.error}}
        <div
          class="alert alert-error text-xs mt-2"
          data-test-dependency-error
        >{{this.error}}</div>
      {{/if}}
    </section>
  </template>
}
