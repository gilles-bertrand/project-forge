import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const EpicEntity = defineEntity({
  name: "Epic",
  tableName: "epics",
  properties: {
    id: p.string().primary(),
    title: p.string(),
    description: p.string(),
    projectId: p.string().index(),
    status: p.string(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onUpdate(() => new Date())
      .onCreate(() => new Date()),
  },
});

export type EpicEntityType = InferEntity<typeof EpicEntity>;
