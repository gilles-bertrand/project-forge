import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const AcceptanceTestEntity = defineEntity({
  name: "AcceptanceTest",
  tableName: "acceptance_tests",
  properties: {
    id: p.string().primary(),
    // Invariant applicatif : exactement un de userStoryId / taskId est non-null
    // (un critère appartient soit à une user story, soit à une task). Validé côté route.
    userStoryId: p.string().nullable().index(),
    taskId: p.string().nullable().index(),
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
