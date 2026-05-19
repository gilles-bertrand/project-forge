import type { TOC } from '@ember/component/template-only';
import { concat } from '@ember/helper';
import { t } from 'ember-intl';
import type { ProjectStatus } from '../schemas/projects.ts';

interface StatusBadgeSignature {
  Args: { status: ProjectStatus };
}

const CLASS_FOR: Record<ProjectStatus, string> = {
  planned: 'badge-info badge-soft',
  active: 'badge-success badge-soft',
  paused: 'badge-warning badge-soft',
  completed: 'badge-neutral badge-soft',
  cancelled: 'badge-error badge-soft',
  archived: 'badge-ghost badge-soft',
};

function classFor(s: ProjectStatus): string {
  return CLASS_FOR[s] ?? 'badge-ghost';
}

const StatusBadge: TOC<StatusBadgeSignature> = <template>
  <span class="badge {{classFor @status}}">
    {{t (concat "projects.status." @status)}}
  </span>
</template>;

export default StatusBadge;
