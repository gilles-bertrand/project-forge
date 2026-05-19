import type { TOC } from '@ember/component/template-only';
import { concat } from '@ember/helper';
import { t } from 'ember-intl';
import type { TaskNature } from '../schemas/tasks.ts';

interface TaskNatureBadgeSignature {
  Args: { nature: TaskNature };
}

const CLASS_FOR: Record<TaskNature, string> = {
  Bug: 'badge-error',
  Feature: 'badge-success badge-soft',
  Maintenance: 'badge-neutral badge-soft',
  Hotfix: 'badge-error badge-soft',
  Refacto: 'badge-secondary badge-soft',
  Techdebt: 'badge-warning badge-soft',
  Spike: 'badge-info badge-soft',
  Review: 'badge-success',
  Deployment: 'badge-primary badge-soft',
  Infra: 'badge-warning',
};

function classFor(n: TaskNature): string {
  return CLASS_FOR[n] ?? 'badge-ghost';
}

const TaskNatureBadge: TOC<TaskNatureBadgeSignature> = <template>
  <span class="badge badge-sm {{classFor @nature}}">
    {{t (concat "backlog.filters.nature." @nature)}}
  </span>
</template>;

export default TaskNatureBadge;
