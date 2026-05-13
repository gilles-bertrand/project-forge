import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const TimeEntryEntity = defineEntity({
  name: "TimeEntry",
  tableName: "time_entries",
  properties: {
    id: p.string().primary(),
    taskId: p.string().index(),
    userId: p.string().index(),
    projectId: p.string().index(),
    hours: p.float(),
    date: p.datetime(),
    description: p.string().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type TimeEntryEntityType = InferEntity<typeof TimeEntryEntity>;
