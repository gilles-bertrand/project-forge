import {
  withDefaults,
  type WithLegacy,
} from "@warp-drive/legacy/model/migration-support";
import type { Type } from "@warp-drive/core/types/symbols";

const SprintSchema = withDefaults({
  type: "sprints",
  fields: [
    { name: "name", kind: "attribute" },
    { name: "goal", kind: "attribute" },
    { name: "projectId", kind: "attribute" },
    { name: "startDate", kind: "attribute" },
    { name: "endDate", kind: "attribute" },
    { name: "status", kind: "attribute" },
    { name: "velocityPoints", kind: "attribute" },
    { name: "completedPoints", kind: "attribute" },
    { name: "createdAt", kind: "attribute" },
    { name: "updatedAt", kind: "attribute" },
  ],
});

export default SprintSchema;

export type SprintStatus = "planned" | "active" | "completed";

export type Sprint = WithLegacy<{
  name: string;
  goal: string | null;
  projectId: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  velocityPoints: number;
  completedPoints: number;
  createdAt: string;
  updatedAt: string;
  [Type]: "sprints";
}>;
