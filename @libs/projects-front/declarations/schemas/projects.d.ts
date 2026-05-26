import { type WithLegacy } from "@warp-drive/legacy/model/migration-support";
import type { Type } from "@warp-drive/core/types/symbols";
declare const ProjectSchema: import("@warp-drive/core/types/schema/fields").LegacyResourceSchema;
export default ProjectSchema;
export type ProjectStatus = "planned" | "active" | "paused" | "completed" | "cancelled" | "archived";
export type Project = WithLegacy<{
    createdAt: string;
    updatedAt: string;
    name: string;
    description: string;
    status: ProjectStatus;
    avatar: string | null;
    githubUrl: string | null;
    responsibleId: string;
    createdById: string;
    sprintDurationDays: number;
    defaultVelocityPoints: number;
    [Type]: "projects";
}>;
//# sourceMappingURL=projects.d.ts.map