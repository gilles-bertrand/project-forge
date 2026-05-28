import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { fn, concat } from '@ember/helper';
import { on } from '@ember/modifier';
import { t } from 'ember-intl';
import type { Task, TaskNature, TaskType } from '../schemas/tasks.ts';
import type { UserStory, StoryStatus } from '../schemas/user-stories.ts';

export type BacklogSegment = 'sandbox' | 'product-backlog' | 'sprint-backlog';

const ALL_SEGMENTS: BacklogSegment[] = [
  'sandbox',
  'product-backlog',
  'sprint-backlog',
];

const SEGMENT_OF_STATUS: Record<StoryStatus, BacklogSegment | null> = {
  suggested: 'sandbox',
  accepted: 'product-backlog',
  estimated: 'product-backlog',
  planned: 'sprint-backlog',
  'in-progress': 'sprint-backlog',
  done: null,
};

const ALL_NATURES: TaskNature[] = [
  'Bug',
  'Feature',
  'Maintenance',
  'Hotfix',
  'Refacto',
  'Techdebt',
  'Spike',
  'Review',
  'Deployment',
  'Infra',
];

const ALL_TYPES: TaskType[] = [
  'Frontend',
  'Backend',
  'Database',
  'UX',
  'Analyse',
  'DevOps',
  'API',
  'Security',
  'Testing',
];

interface BacklogFiltersSignature {
  Args: {
    tasks: Task[];
    userStories?: UserStory[];
    onFilter: (filtered: Task[]) => void;
  };
}

export default class BacklogFilters extends Component<BacklogFiltersSignature> {
  @tracked activeNature: TaskNature | null = null;
  @tracked activeType: TaskType | null = null;
  @tracked activeSegment: BacklogSegment | null = null;

  get availableNatures(): TaskNature[] {
    const usedNatures = new Set(this.args.tasks.map((t) => t.nature));
    return ALL_NATURES.filter((n) => usedNatures.has(n));
  }

  get availableTypes(): TaskType[] {
    const usedTypes = new Set(this.args.tasks.map((t) => t.type));
    return ALL_TYPES.filter((tp) => usedTypes.has(tp));
  }

  // Maps story.id → segment so the segment filter can skip per-task lookups.
  get segmentByStoryId(): Map<string, BacklogSegment | null> {
    const stories = this.args.userStories ?? [];
    const map = new Map<string, BacklogSegment | null>();
    for (const us of stories) {
      if (us.id) map.set(us.id, SEGMENT_OF_STATUS[us.status] ?? null);
    }
    return map;
  }

  get availableSegments(): BacklogSegment[] {
    if (!this.args.userStories?.length) return [];
    const used = new Set<BacklogSegment>();
    const byStory = this.segmentByStoryId;
    for (const task of this.args.tasks) {
      if (!task.userStoryId) continue;
      const seg = byStory.get(task.userStoryId);
      if (seg) used.add(seg);
    }
    return ALL_SEGMENTS.filter((s) => used.has(s));
  }

  get filteredTasks(): Task[] {
    const segmentMap = this.segmentByStoryId;
    return this.args.tasks.filter((task) => {
      if (this.activeNature && task.nature !== this.activeNature) return false;
      if (this.activeType && task.type !== this.activeType) return false;
      if (this.activeSegment) {
        if (!task.userStoryId) return false;
        if (segmentMap.get(task.userStoryId) !== this.activeSegment)
          return false;
      }
      return true;
    });
  }

  @action setNature(nature: TaskNature | null) {
    this.activeNature = this.activeNature === nature ? null : nature;
    this.args.onFilter(this.filteredTasks);
  }

  @action setType(type: TaskType | null) {
    this.activeType = this.activeType === type ? null : type;
    this.args.onFilter(this.filteredTasks);
  }

  @action setSegment(segment: BacklogSegment | null) {
    this.activeSegment = this.activeSegment === segment ? null : segment;
    this.args.onFilter(this.filteredTasks);
  }

  @action clearAll() {
    this.activeNature = null;
    this.activeType = null;
    this.activeSegment = null;
    this.args.onFilter(this.args.tasks);
  }

  get noFilterActive(): boolean {
    return (
      this.activeNature === null &&
      this.activeType === null &&
      this.activeSegment === null
    );
  }

  isNatureActive = (nature: TaskNature): boolean =>
    this.activeNature === nature;
  isTypeActive = (type: TaskType): boolean => this.activeType === type;
  isSegmentActive = (segment: BacklogSegment): boolean =>
    this.activeSegment === segment;

  <template>
    <div
      class="flex flex-wrap items-center gap-2 py-2"
      data-test-backlog-filters
    >
      <button
        type="button"
        class="btn btn-xs {{if this.noFilterActive 'btn-primary' 'btn-ghost'}}"
        {{on "click" this.clearAll}}
      >
        {{t "backlog.filters.all"}}
      </button>

      {{#each this.availableNatures as |nature|}}
        <button
          type="button"
          class="btn btn-xs
            {{if (this.isNatureActive nature) 'btn-secondary' 'btn-ghost'}}"
          {{on "click" (fn this.setNature nature)}}
        >
          {{t (concat "backlog.filters.nature." nature)}}
        </button>
      {{/each}}

      <span class="opacity-30">|</span>

      {{#each this.availableTypes as |type|}}
        <button
          type="button"
          class="btn btn-xs
            {{if (this.isTypeActive type) 'btn-info' 'btn-ghost'}}"
          {{on "click" (fn this.setType type)}}
        >
          {{t (concat "backlog.filters.type." type)}}
        </button>
      {{/each}}

      {{#if this.availableSegments.length}}
        <span class="opacity-30">|</span>

        {{#each this.availableSegments as |segment|}}
          <button
            type="button"
            class="btn btn-xs
              {{if (this.isSegmentActive segment) 'btn-accent' 'btn-ghost'}}"
            data-test-backlog-segment={{segment}}
            {{on "click" (fn this.setSegment segment)}}
          >
            {{t (concat "backlog.filters.segment." segment)}}
          </button>
        {{/each}}
      {{/if}}
    </div>
  </template>
}
