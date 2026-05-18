import { type WithLegacy } from "@warp-drive/legacy/model/migration-support";
import type { Type } from "@warp-drive/core/types/symbols";
declare const ProjectMemberSchema: import("@warp-drive/core/types/schema/fields").LegacyResourceSchema;
export default ProjectMemberSchema;
export type ProjectMember = WithLegacy<{
    projectId: string;
    userId: string;
    role: string | null;
    firstName: string;
    lastName: string;
    email: string;
    [Type]: "project-members";
}>;
//# sourceMappingURL=project-members.d.ts.map