import Component from '@glimmer/component';
import type { UserStory } from '../schemas/user-stories.ts';
import type { Epic } from '../schemas/epics.ts';
import type { Task } from '../schemas/tasks.ts';
interface UserStoryCardSignature {
    Element: HTMLDivElement;
    Args: {
        userStory: UserStory;
        epic?: Epic | null;
        tasks: Task[];
        expanded: boolean;
        onOpen?: (us: UserStory) => void;
        onToggle?: (us: UserStory) => void;
        onOpenTask?: (task: Task) => void;
    };
}
/**
 * Card representation of a User Story for the Backlog. Carries the parent
 * epic's colour as a left accent, surfaces status/priority/points and the
 * attached-task count, and expands in place (chevron) to reveal its tasks.
 */
export default class UserStoryCard extends Component<UserStoryCardSignature> {
    get taskCount(): number;
    get epicColor(): string;
    get borderStyle(): string;
    get dotStyle(): string;
    get priorityBadgeClass(): string;
    get statusDotClass(): string;
    open(): void;
    toggle(): void;
    openTask(task: Task): void;
}
export {};
//# sourceMappingURL=user-story-card.d.ts.map