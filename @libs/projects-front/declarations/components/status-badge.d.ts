import type { TOC } from '@ember/component/template-only';
import type { ProjectStatus } from '@libs/projects-front/schemas/projects';
interface StatusBadgeSignature {
    Args: {
        status: ProjectStatus;
    };
}
declare const StatusBadge: TOC<StatusBadgeSignature>;
export default StatusBadge;
//# sourceMappingURL=status-badge.d.ts.map