import Service from '@ember/service';
import { type Store } from '@warp-drive/core';
import type { UserStory } from '#src/schemas/user-stories.ts';
export type NewUserStoryPayload = {
    title: string;
    description: string;
    projectId: string;
    epicId: string | null;
    status: UserStory['status'];
    points: UserStory['points'];
    priority: number;
};
export default class UserStoriesService extends Service {
    store: Store;
    list: UserStory[];
    loading: boolean;
    loadByProject(projectId: string): Promise<UserStory[]>;
    loadByEpic(epicId: string): Promise<UserStory[]>;
    findById(id: string): Promise<UserStory>;
    create(data: NewUserStoryPayload): Promise<UserStory>;
}
declare module '@ember/service' {
    interface Registry {
        'user-stories': UserStoriesService;
    }
}
//# sourceMappingURL=user-stories.d.ts.map