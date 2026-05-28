import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const EpicEntity = defineEntity({
  name: "Epic",
  tableName: "epics",
  properties: {
    id: p.string().primary(),
    title: p.string(),
    description: p.string(),
    notes: p.string().nullable(),
    color: p.string().default("#6B7280"),
    type: p.string().default("functional"),
    value: p.integer().nullable(),
    rank: p.integer().default(0),
    projectId: p.string().index(),
    createdById: p.string().nullable().index(),
    status: p.string(),
    tags: p.array().default([]),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onUpdate(() => new Date())
      .onCreate(() => new Date()),
  },
});

export type EpicEntityType = InferEntity<typeof EpicEntity>;
