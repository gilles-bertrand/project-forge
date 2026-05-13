import type { ProjectEntityType } from "#src/project/project.entity.js";
import { object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";
import { ProjectStatusSchema } from "#src/types.js";

export const SerializedProjectSchema = makeJsonApiDocumentSchema(
  "projects",
  object({
    name: string(),
    description: string(),
    status: ProjectStatusSchema,
    avatar: string().nullable(),
    githubUrl: string().nullable(),
    responsibleId: string(),
    createdById: string(),
    createdAt: string(),
    updatedAt: string(),
  }),
);

export function jsonApiSerializeProject(
  p: ProjectEntityType,
): z.infer<typeof SerializedProjectSchema> {
  return {
    id: p.id,
    type: "projects" as const,
    attributes: {
      name: p.name,
      description: p.description,
      status: p.status as z.infer<typeof ProjectStatusSchema>,
      avatar: p.avatar ?? null,
      githubUrl: p.githubUrl ?? null,
      responsibleId: p.responsibleId,
      createdById: p.createdById,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    },
  };
}

export function jsonApiSerializeManyProjects(projects: ProjectEntityType[]) {
  return projects.map(jsonApiSerializeProject);
}

export function jsonApiSerializeSingleProjectDocument(p: ProjectEntityType) {
  return { data: jsonApiSerializeProject(p) };
}
