import Component from '@glimmer/component';
import type Owner from '@ember/owner';
import type StoryDependenciesService from '../services/story-dependencies.ts';
import type { StoryDependency, StoryDependencyType } from '../services/story-dependencies.ts';
import type UserStoriesService from '../services/user-stories.ts';
interface StoryDependencyListSignature {
    Element: HTMLElement;
    Args: {
        storyId: string;
        projectId?: string | null;
    };
}
export default class StoryDependencyList extends Component<StoryDependencyListSignature> {
    storyDependencies: StoryDependenciesService;
    userStories: UserStoriesService;
    outgoing: StoryDependency[];
    incoming: StoryDependency[];
    loading: boolean;
    submitting: boolean;
    error: string;
    newToStoryId: string;
    newType: StoryDependencyType;
    constructor(owner: Owner, args: StoryDependencyListSignature['Args']);
    load: () => Promise<void>;
    get isEmpty(): boolean;
    storyTitle: (id: string) => string;
    typeLabelKey: (type: StoryDependencyType) => string;
    get typeOptions(): {
        value: StoryDependencyType;
        label: string;
    }[];
    get candidates(): import("../schemas/user-stories.ts").UserStory[];
    onTargetChange(e: Event): void;
    onTypeChange(e: Event): void;
    add(e: Event): Promise<void>;
    removeDep(dep: StoryDependency): Promise<void>;
}
export {};
//# sourceMappingURL=story-dependency-list.d.ts.map