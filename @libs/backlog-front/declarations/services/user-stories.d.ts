import Service from '@ember/service';
import { type Store } from '@warp-drive/core';
import type { UserStory, StoryStatus, StoryPoints, StoryPriority } from '#src/schemas/user-stories.ts';
export type NewUserStoryPayload = {
    title: string;
    description: string;
    projectId: string;
    epicId: string | null;
    status?: StoryStatus;
    points?: StoryPoints | null;
    priority?: StoryPriority;
    notes?: string | null;
    color?: string | null;
    rank?: number;
    value?: number | null;
    tags?: string[];
};
export interface UpdateUserStoryPayload {
    title?: string;
    description?: string;
    status?: StoryStatus;
    points?: StoryPoints | null;
    priority?: StoryPriority;
    epicId?: string | null;
    notes?: string | null;
    color?: string | null;
    rank?: number;
    value?: number | null;
    tags?: string[];
}
export declare class InvalidStoryTransitionError extends Error {
    readonly code = "INVALID_STORY_TRANSITION";
    readonly from: StoryStatus | null;
    readonly to: StoryStatus | null;
    constructor(message: string, from: StoryStatus | null, to: StoryStatus | null);
}
export default class UserStoriesService extends Service {
    store: Store;
    list: UserStory[];
    loading: boolean;
    loadByProject(projectId: string): Promise<UserStory[]>;
    loadByEpic(epicId: string): Promise<UserStory[]>;
    findById(id: string): Promise<UserStory>;
    create(data: NewUserStoryPayload): Promise<UserStory>;
    update(id: string, projectId: string, attrs: UpdateUserStoryPayload): Promise<void>;
    setStatus(id: string, projectId: string, status: StoryStatus): Promise<void>;
    delete(id: string, projectId: string): Promise<void>;
}
declare module '@ember/service' {
    interface Registry {
        'user-stories': UserStoriesService;
    }
}
//# sourceMappingURL=user-stories.d.ts.map