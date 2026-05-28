import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const ProjectTaskCounterEntity = defineEntity({
  name: "ProjectTaskCounter",
  tableName: "project_task_counters",
  properties: {
    projectId: p.string().primary(),
    nextNumber: p.integer().default(1001),
  },
});

export type ProjectTaskCounterEntityType = InferEntity<typeof ProjectTaskCounterEntity>;
