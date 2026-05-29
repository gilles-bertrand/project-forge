import Service from '@ember/service';
export type StoryDependencyType = 'blocks' | 'relates-to';
export interface StoryDependency {
    id: string;
    fromStoryId: string;
    toStoryId: string;
    type: StoryDependencyType;
    createdAt: string;
}
export interface StoryDependencies {
    outgoing: StoryDependency[];
    incoming: StoryDependency[];
}
export declare class StoryDependencyError extends Error {
}
export default class StoryDependenciesService extends Service {
    loading: boolean;
    loadByStory(storyId: string): Promise<StoryDependencies>;
    create(fromStoryId: string, toStoryId: string, type: StoryDependencyType): Promise<StoryDependency>;
    remove(dependencyId: string): Promise<void>;
}
declare module '@ember/service' {
    interface Registry {
        'story-dependencies': StoryDependenciesService;
    }
}
//# sourceMappingURL=story-dependencies.d.ts.map