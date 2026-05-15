import type { TOC } from '@ember/component/template-only';
import type { TaskType } from '../schemas/tasks.ts';
interface TaskTypeBadgeSignature {
    Args: {
        type: TaskType;
    };
}
declare const TaskTypeBadge: TOC<TaskTypeBadgeSignature>;
export default TaskTypeBadge;
//# sourceMappingURL=task-type-badge.d.ts.map