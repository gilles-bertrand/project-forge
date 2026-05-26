import type { ProjectMemberEntityType } from "#src/project/project-member.entity.js";
import { object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";
import { ProjectMemberRoleSchema } from "#src/types.js";

export type UserLite = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  color: string;
};

export const SerializedProjectMemberSchema = makeJsonApiDocumentSchema(
  "project-members",
  object({
    projectId: string(),
    userId: string(),
    role: ProjectMemberRoleSchema,
    joinedAt: string(),
    firstName: string().nullable(),
    lastName: string().nullable(),
    email: string().nullable(),
    color: string().nullable(),
  }),
);

export function jsonApiSerializeProjectMember(
  m: ProjectMemberEntityType,
  user?: UserLite | null,
): z.infer<typeof SerializedProjectMemberSchema> {
  return {
    id: m.id,
    type: "project-members" as const,
    attributes: {
      projectId: m.projectId,
      userId: m.userId,
      role: m.role as z.infer<typeof ProjectMemberRoleSchema>,
      joinedAt: m.joinedAt.toISOString(),
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
      email: user?.email ?? null,
      color: user?.color ?? null,
    },
  };
}

export function jsonApiSerializeManyProjectMembers(
  members: ProjectMemberEntityType[],
  users: UserLite[] = [],
) {
  const byId = new Map(users.map((u) => [u.id, u]));
  return members.map((m) => jsonApiSerializeProjectMember(m, byId.get(m.userId)));
}
