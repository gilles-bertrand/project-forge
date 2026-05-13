import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const ProjectEntity = defineEntity({
  name: "Project",
  tableName: "projects",
  properties: {
    id: p.string().primary(),
    name: p.string(),
    description: p.string(),
    status: p.string(),
    avatar: p.string().nullable(),
    githubUrl: p.string().nullable(),
    responsibleId: p.string().index(),
    createdById: p.string().index(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onUpdate(() => new Date())
      .onCreate(() => new Date()),
  },
});

export type ProjectEntityType = InferEntity<typeof ProjectEntity>;
