import type { TOC } from '@ember/component/template-only';
import type { TaskNature } from '../schemas/tasks.ts';
interface TaskNatureBadgeSignature {
    Args: {
        nature: TaskNature;
    };
}
declare const TaskNatureBadge: TOC<TaskNatureBadgeSignature>;
export default TaskNatureBadge;
//# sourceMappingURL=task-nature-badge.d.ts.map