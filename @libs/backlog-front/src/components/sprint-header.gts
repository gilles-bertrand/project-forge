import Component from '@glimmer/component';
import { t } from 'ember-intl';
import type { Sprint } from '../schemas/sprints.ts';

interface SprintHeaderSignature {
  Args: {
    sprint: Sprint;
    pointsCompleted: number;
    pointsTotal: number;
  };
  Element: HTMLDivElement;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default class SprintHeader extends Component<SprintHeaderSignature> {
  get startLabel(): string {
    return formatDate(this.args.sprint.startDate);
  }

  get endLabel(): string {
    return formatDate(this.args.sprint.endDate);
  }

  get percentComplete(): number {
    if (this.args.pointsTotal === 0) return 0;
    return Math.round(
      (this.args.pointsCompleted / this.args.pointsTotal) * 100
    );
  }

  <template>
    <div
      class="flex items-center justify-between gap-4 px-4 py-3 bg-base-200 rounded-lg mb-4"
      data-test-sprint-header
      ...attributes
    >
      <div class="flex-1 min-w-0">
        <h2 class="font-bold text-lg truncate">{{@sprint.name}}</h2>
        <p class="text-xs opacity-60 mt-0.5">
          {{this.startLabel}}
          —
          {{this.endLabel}}
        </p>
        {{#if @sprint.goal}}
          <p class="text-sm italic opacity-80 mt-1 truncate">
            <span class="font-medium opacity-60 not-italic">{{t
                "backlog.kanban.sprintHeader.goalLabel"
              }}
              :</span>
            {{@sprint.goal}}
          </p>
        {{/if}}
      </div>

      <div class="flex flex-col items-end gap-1 min-w-32">
        <div class="text-sm font-semibold">
          {{t
            "backlog.kanban.sprintHeader.points"
            completed=@pointsCompleted
            total=@pointsTotal
          }}
        </div>
        <div class="text-xs opacity-60">
          {{t
            "backlog.kanban.sprintHeader.completion"
            percent=this.percentComplete
          }}
        </div>
        <progress
          class="progress progress-primary w-32 h-1"
          value={{this.percentComplete}}
          max="100"
        ></progress>
      </div>

      <div class="flex gap-1">
        <button
          type="button"
          class="btn btn-sm btn-ghost"
          disabled
          title={{t "backlog.kanban.sprintHeader.navDisabled"}}
          aria-label={{t "backlog.kanban.sprintHeader.navPrev"}}
        >&lt;</button>
        <button
          type="button"
          class="btn btn-sm btn-ghost"
          disabled
          title={{t "backlog.kanban.sprintHeader.navDisabled"}}
          aria-label={{t "backlog.kanban.sprintHeader.navNext"}}
        >&gt;</button>
      </div>
    </div>
  </template>
}
