import Component from '@glimmer/component';
import type { Task } from '../schemas/tasks.ts';
import type { UserStory } from '../schemas/user-stories.ts';
interface TaskRowSignature {
    Args: {
        task: Task;
        userStory?: UserStory | null;
    };
    Element: HTMLDivElement;
}
export default class TaskRow extends Component<TaskRowSignature> {
    get numberLabel(): string;
    get initials(): string;
}
export {};
//# sourceMappingURL=task-row.d.ts.map