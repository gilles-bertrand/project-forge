import type { TOC } from '@ember/component/template-only';
import { concat } from '@ember/helper';
import { t } from 'ember-intl';
import type { TaskType } from '../schemas/tasks.ts';

interface TaskTypeBadgeSignature {
  Args: { type: TaskType };
}

const CLASS_FOR: Record<TaskType, string> = {
  Frontend: 'badge-info badge-soft',
  Backend: 'badge-success badge-soft',
  Database: 'badge-primary badge-soft',
  UX: 'badge-secondary badge-soft',
  Analyse: 'badge-neutral badge-soft',
  DevOps: 'badge-warning badge-soft',
  API: 'badge-info',
  Security: 'badge-error badge-soft',
  Testing: 'badge-accent badge-soft',
};

function classFor(tp: TaskType): string {
  return CLASS_FOR[tp] ?? 'badge-ghost';
}

const TaskTypeBadge: TOC<TaskTypeBadgeSignature> = <template>
  <span class="badge badge-sm {{classFor @type}}">
    {{t (concat "backlog.filters.type." @type)}}
  </span>
</template>;

export default TaskTypeBadge;
