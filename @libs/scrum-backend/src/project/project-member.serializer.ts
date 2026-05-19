import type { ProjectMemberEntityType } from "#src/project/project-member.entity.js";
import { object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";
import { ProjectMemberRoleSchema } from "#src/types.js";

export const SerializedProjectMemberSchema = makeJsonApiDocumentSchema(
  "project-members",
  object({
    projectId: string(),
    userId: string(),
    role: ProjectMemberRoleSchema,
    joinedAt: string(),
  }),
);

export function jsonApiSerializeProjectMember(
  m: ProjectMemberEntityType,
): z.infer<typeof SerializedProjectMemberSchema> {
  return {
    id: m.id,
    type: "project-members" as const,
    attributes: {
      projectId: m.projectId,
      userId: m.userId,
      role: m.role as z.infer<typeof ProjectMemberRoleSchema>,
      joinedAt: m.joinedAt.toISOString(),
    },
  };
}

export function jsonApiSerializeManyProjectMembers(members: ProjectMemberEntityType[]) {
  return members.map(jsonApiSerializeProjectMember);
}
