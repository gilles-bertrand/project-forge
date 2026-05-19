import { type WithLegacy } from "@warp-drive/legacy/model/migration-support";
import type { Type } from "@warp-drive/core/types/symbols";
declare const SprintSchema: import("@warp-drive/core/types/schema/fields").LegacyResourceSchema;
export default SprintSchema;
export type SprintStatus = "planned" | "active" | "completed";
export type Sprint = WithLegacy<{
    name: string;
    goal: string | null;
    projectId: string;
    startDate: string;
    endDate: string;
    status: SprintStatus;
    velocityPoints: number;
    completedPoints: number;
    createdAt: string;
    updatedAt: string;
    [Type]: "sprints";
}>;
//# sourceMappingURL=sprints.d.ts.map