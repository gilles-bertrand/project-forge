import {
  withDefaults,
  type WithLegacy,
} from "@warp-drive/legacy/model/migration-support";
import type { Type } from "@warp-drive/core/types/symbols";

const TimeEntrySchema = withDefaults({
  type: "time-entries",
  fields: [
    { name: "taskId", kind: "attribute" },
    { name: "userId", kind: "attribute" },
    { name: "projectId", kind: "attribute" },
    { name: "hours", kind: "attribute" },
    { name: "date", kind: "attribute" },
    { name: "description", kind: "attribute" },
    { name: "createdAt", kind: "attribute" },
  ],
});

export default TimeEntrySchema;

export type TimeEntry = WithLegacy<{
  taskId: string;
  userId: string;
  projectId: string;
  hours: number;
  date: string;
  description: string | null;
  createdAt: string;
  [Type]: "time-entries";
}>;
