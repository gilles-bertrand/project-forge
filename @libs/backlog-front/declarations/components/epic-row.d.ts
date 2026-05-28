import Component from '@glimmer/component';
import type { Epic } from '../schemas/epics.ts';
import type { UserStory } from '../schemas/user-stories.ts';
import type { Task } from '../schemas/tasks.ts';
interface EpicRowSignature {
    Args: {
        epic: Epic;
        userStories?: UserStory[];
        tasks?: Task[];
        onAddUserStory?: (epic: Epic) => void;
        onOpenTask?: (task: Task) => void;
        onEditEpic?: (epic: Epic) => void;
        onDeleteEpic?: (epic: Epic) => void;
        onEditUserStory?: (us: UserStory) => void;
        onDeleteUserStory?: (us: UserStory) => void;
        onAddTask?: (us: UserStory) => void;
    };
    Element: HTMLDivElement;
}
export default class EpicRow extends Component<EpicRowSignature> {
    expanded: boolean;
    get epicUserStories(): UserStory[];
    get usCount(): number;
    get taskCount(): number;
    get totalPoints(): number;
    toggleExpand(): void;
    get borderStyle(): string;
}
export {};
//# sourceMappingURL=epic-row.d.ts.map