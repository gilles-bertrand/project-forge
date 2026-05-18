import type { TOC } from '@ember/component/template-only';
import type { Task } from '@libs/backlog-front/schemas/tasks';
interface MyTasksGridSignature {
    Args: {
        tasks: Task[];
    };
}
declare const MyTasksGrid: TOC<MyTasksGridSignature>;
export default MyTasksGrid;
//# sourceMappingURL=my-tasks-grid.d.ts.map