import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const AcceptanceTestEntity = defineEntity({
  name: "AcceptanceTest",
  tableName: "acceptance_tests",
  properties: {
    id: p.string().primary(),
    userStoryId: p.string().index(),
    name: p.string(),
    description: p.string(),
    state: p.string().default("to-check"),
    rank: p.integer().default(0),
    createdById: p.string().nullable().index(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onUpdate(() => new Date())
      .onCreate(() => new Date()),
  },
});

export type AcceptanceTestEntityType = InferEntity<typeof AcceptanceTestEntity>;
