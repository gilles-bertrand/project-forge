import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const ProjectMemberEntity = defineEntity({
  name: "ProjectMember",
  tableName: "project_members",
  properties: {
    id: p.string().primary(),
    projectId: p.string().index(),
    userId: p.string().index(),
    role: p.string(),
    joinedAt: p.datetime().onCreate(() => new Date()),
  },
});

export type ProjectMemberEntityType = InferEntity<typeof ProjectMemberEntity>;
