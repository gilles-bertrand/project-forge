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
    };
    Element: HTMLDivElement;
}
export default class EpicRow extends Component<EpicRowSignature> {
    expanded: boolean;
    get epicUserStories(): UserStory[];
    get usCount(): number;
    get taskCount(): number;
    toggleExpand(): void;
}
export {};
//# sourceMappingURL=epic-row.d.ts.map