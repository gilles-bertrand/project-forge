import { type WithLegacy } from "@warp-drive/legacy/model/migration-support";
import type { Type } from "@warp-drive/core/types/symbols";
declare const TimeEntrySchema: import("@warp-drive/core/types/schema/fields").LegacyResourceSchema;
export default TimeEntrySchema;
export type TimeEntry = WithLegacy<{
    taskId: string;
    userId: string;
    projectId: string;
    hours: number;
    date: string;
    description: string | null;
    createdAt: string;
    [Type]: "time-entries";
}>;
//# sourceMappingURL=time-entries.d.ts.map