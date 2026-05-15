import { type WithLegacy } from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';
declare const UserStorySchema: import("@warp-drive/core/types/schema/fields").LegacyResourceSchema;
export default UserStorySchema;
export type StoryStatus = 'todo' | 'in-progress' | 'done';
export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13 | 21;
export type UserStory = WithLegacy<{
    title: string;
    description: string;
    projectId: string;
    epicId: string | null;
    status: StoryStatus;
    points: StoryPoints;
    priority: number;
    createdAt: string;
    updatedAt: string;
    [Type]: 'user-stories';
}>;
//# sourceMappingURL=user-stories.d.ts.map