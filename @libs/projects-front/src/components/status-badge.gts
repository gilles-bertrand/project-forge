import type { TOC } from '@ember/component/template-only';
import type { ProjectStatus } from '@libs/projects-front/schemas/projects';

interface StatusBadgeSignature {
  Args: { status: ProjectStatus };
}

const LABEL_FR: Record<ProjectStatus, string> = {
  planned: 'Planifié',
  active: 'Actif',
  paused: 'En pause',
  completed: 'Terminé',
  cancelled: 'Annulé',
  archived: 'Archivé',
};

const CLASS_FOR: Record<ProjectStatus, string> = {
  planned: 'badge-info badge-soft',
  active: 'badge-success badge-soft',
  paused: 'badge-warning badge-soft',
  completed: 'badge-neutral badge-soft',
  cancelled: 'badge-error badge-soft',
  archived: 'badge-ghost badge-soft',
};

const StatusBadge: TOC<StatusBadgeSignature> = <template>
  <span class="badge {{classFor @status}}">{{labelFor @status}}</span>
</template>;

function labelFor(s: ProjectStatus): string {
  return LABEL_FR[s] ?? s;
}

function classFor(s: ProjectStatus): string {
  return CLASS_FOR[s] ?? 'badge-ghost';
}

export default StatusBadge;
