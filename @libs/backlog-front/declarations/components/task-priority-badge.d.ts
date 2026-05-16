import type { TOC } from '@ember/component/template-only';
import type { TaskPriority } from '../schemas/tasks.ts';
interface TaskPriorityBadgeSignature {
    Args: {
        priority: TaskPriority;
    };
}
declare const TaskPriorityBadge: TOC<TaskPriorityBadgeSignature>;
export default TaskPriorityBadge;
//# sourceMappingURL=task-priority-badge.d.ts.map