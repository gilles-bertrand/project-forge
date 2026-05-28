import { type WithLegacy } from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';
declare const UserStorySchema: import("@warp-drive/core/types/schema/fields").LegacyResourceSchema;
export default UserStorySchema;
export type StoryStatus = 'suggested' | 'accepted' | 'estimated' | 'planned' | 'in-progress' | 'done';
export type StoryPriority = 'Basse' | 'Moyenne' | 'Haute' | 'Critique';
export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13 | 21;
export type UserStory = WithLegacy<{
    title: string;
    description: string;
    notes: string | null;
    color: string | null;
    projectId: string;
    epicId: string | null;
    sprintId: string | null;
    status: StoryStatus;
    points: StoryPoints | null;
    priority: StoryPriority;
    rank: number;
    value: number | null;
    createdById: string | null;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    [Type]: 'user-stories';
}>;
//# sourceMappingURL=user-stories.d.ts.map