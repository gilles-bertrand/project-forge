import Component from '@glimmer/component';
import type { UserStory } from '../schemas/user-stories.ts';
import type { Task } from '../schemas/tasks.ts';
interface UserStoryRowSignature {
    Args: {
        userStory: UserStory;
        tasks?: Task[];
        onOpenTask?: (task: Task) => void;
        onEditUserStory?: (us: UserStory) => void;
        onDeleteUserStory?: (us: UserStory) => void;
        onAddTask?: (us: UserStory) => void;
    };
    Element: HTMLDivElement;
}
export default class UserStoryRow extends Component<UserStoryRowSignature> {
    expanded: boolean;
    get storyTasks(): Task[];
    toggleExpand(): void;
    get priorityBadgeClass(): string;
    get statusDotClass(): string;
}
export {};
//# sourceMappingURL=user-story-row.d.ts.map