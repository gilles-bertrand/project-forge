import {
  withDefaults,
  type WithLegacy,
} from "@warp-drive/legacy/model/migration-support";
import type { Type } from "@warp-drive/core/types/symbols";

const ProjectMemberSchema = withDefaults({
  type: "project-members",
  fields: [
    { name: "projectId", kind: "attribute" },
    { name: "userId", kind: "attribute" },
    { name: "role", kind: "attribute" },
    { name: "joinedAt", kind: "attribute" },
    { name: "firstName", kind: "attribute" },
    { name: "lastName", kind: "attribute" },
    { name: "email", kind: "attribute" },
    { name: "color", kind: "attribute" },
  ],
});

export default ProjectMemberSchema;

export type ProjectMember = WithLegacy<{
  projectId: string;
  userId: string;
  role: string | null;
  joinedAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  color: string | null;
  [Type]: "project-members";
}>;
