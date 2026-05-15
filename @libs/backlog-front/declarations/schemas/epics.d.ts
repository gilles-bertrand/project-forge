import { type WithLegacy } from '@warp-drive/legacy/model/migration-support';
import type { Type } from '@warp-drive/core/types/symbols';
declare const EpicSchema: import("@warp-drive/core/types/schema/fields").LegacyResourceSchema;
export default EpicSchema;
export type EpicStatus = 'todo' | 'in-progress' | 'done';
export type Epic = WithLegacy<{
    title: string;
    description: string;
    projectId: string;
    status: EpicStatus;
    createdAt: string;
    updatedAt: string;
    [Type]: 'epics';
}>;
//# sourceMappingURL=epics.d.ts.map