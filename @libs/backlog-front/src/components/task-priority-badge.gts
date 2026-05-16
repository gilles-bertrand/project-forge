import type { TOC } from '@ember/component/template-only';
import { concat } from '@ember/helper';
import { t } from 'ember-intl';
import type { TaskPriority } from '../schemas/tasks.ts';

interface TaskPriorityBadgeSignature {
  Args: { priority: TaskPriority };
}

const CLASS_FOR: Record<TaskPriority, string> = {
  Basse: 'badge-ghost',
  Moyenne: 'badge-warning badge-soft',
  Haute: 'badge-error badge-soft',
  Critique: 'badge-error',
};

function classFor(p: TaskPriority): string {
  return CLASS_FOR[p] ?? 'badge-ghost';
}

const TaskPriorityBadge: TOC<TaskPriorityBadgeSignature> = <template>
  <span class="badge badge-sm {{classFor @priority}}">
    {{t (concat "tasks.priority." @priority)}}
  </span>
</template>;

export default TaskPriorityBadge;
