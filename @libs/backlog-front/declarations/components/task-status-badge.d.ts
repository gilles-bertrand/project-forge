import type { TOC } from '@ember/component/template-only';
import type { TaskStatus } from '../schemas/tasks.ts';
interface TaskStatusBadgeSignature {
    Args: {
        status: TaskStatus;
    };
}
declare const TaskStatusBadge: TOC<TaskStatusBadgeSignature>;
export default TaskStatusBadge;
//# sourceMappingURL=task-status-badge.d.ts.map