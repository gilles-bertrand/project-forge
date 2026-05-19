import {
  withDefaults,
  type WithLegacy,
} from "@warp-drive/legacy/model/migration-support";
import type { Type } from "@warp-drive/core/types/symbols";

const ProjectSchema = withDefaults({
  type: "projects",
  fields: [
    { name: "createdAt", kind: "attribute" },
    { name: "updatedAt", kind: "attribute" },
    { name: "name", kind: "attribute" },
    { name: "description", kind: "attribute" },
    { name: "status", kind: "attribute" },
    { name: "avatar", kind: "attribute" },
    { name: "githubUrl", kind: "attribute" },
    { name: "responsibleId", kind: "attribute" },
    { name: "createdById", kind: "attribute" },
  ],
});

export default ProjectSchema;

export type ProjectStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "archived";

export type Project = WithLegacy<{
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string;
  status: ProjectStatus;
  avatar: string | null;
  githubUrl: string | null;
  responsibleId: string;
  createdById: string;
  [Type]: "projects";
}>;
