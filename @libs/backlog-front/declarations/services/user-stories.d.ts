import Service from '@ember/service';
import { type Store } from '@warp-drive/core';
import type { UserStory, StoryStatus, StoryPoints } from '#src/schemas/user-stories.ts';
export type NewUserStoryPayload = {
    title: string;
    description: string;
    projectId: string;
    epicId: string | null;
    status: UserStory['status'];
    points: UserStory['points'];
    priority: number;
};
export interface UpdateUserStoryPayload {
    title?: string;
    description?: string;
    status?: StoryStatus;
    points?: StoryPoints | null;
    priority?: number;
    epicId?: string | null;
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
    delete(id: string, projectId: string): Promise<void>;
}
declare module '@ember/service' {
    interface Registry {
        'user-stories': UserStoriesService;
    }
}
//# sourceMappingURL=user-stories.d.ts.map