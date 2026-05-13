import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const HistoryEntryEntity = defineEntity({
  name: "HistoryEntry",
  tableName: "history_entries",
  properties: {
    id: p.string().primary(),
    ownerType: p.string(),
    ownerId: p.string().index(),
    type: p.string(),
    description: p.string(),
    userId: p.string().index(),
    metadata: p.json().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export type HistoryEntryEntityType = InferEntity<typeof HistoryEntryEntity>;
