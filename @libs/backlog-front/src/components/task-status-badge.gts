import type { TOC } from '@ember/component/template-only';
import { concat } from '@ember/helper';
import { t } from 'ember-intl';
import type { TaskStatus } from '../schemas/tasks.ts';

interface TaskStatusBadgeSignature {
  Args: { status: TaskStatus };
}

const CLASS_FOR: Record<TaskStatus, string> = {
  todo: 'badge-ghost',
  'in-progress': 'badge-warning badge-soft',
  testing: 'badge-info badge-soft',
  uat: 'badge-secondary badge-soft',
  done: 'badge-success badge-soft',
};

function classFor(s: TaskStatus): string {
  return CLASS_FOR[s] ?? 'badge-ghost';
}

const TaskStatusBadge: TOC<TaskStatusBadgeSignature> = <template>
  <span class="badge badge-sm {{classFor @status}}">
    {{t (concat "tasks.status." @status)}}
  </span>
</template>;

export default TaskStatusBadge;
