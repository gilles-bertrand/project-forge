import type { AcceptanceTestEntityType } from "#src/acceptance-test/acceptance-test.entity.js";
import { number, object, string } from "zod";
import { z } from "zod";
import { makeJsonApiDocumentSchema } from "@libs/backend-shared";
import { AcceptanceTestStateSchema } from "#src/types.js";

export const SerializedAcceptanceTestSchema = makeJsonApiDocumentSchema(
  "acceptance-tests",
  object({
    userStoryId: string(),
    name: string(),
    description: string(),
    state: AcceptanceTestStateSchema,
    rank: number().int(),
    createdById: string().nullable(),
    createdAt: string(),
    updatedAt: string(),
  }),
);

export function jsonApiSerializeAcceptanceTest(
  at: AcceptanceTestEntityType,
): z.infer<typeof SerializedAcceptanceTestSchema> {
  return {
    id: at.id,
    type: "acceptance-tests" as const,
    attributes: {
      userStoryId: at.userStoryId,
      name: at.name,
      description: at.description,
      state: at.state as z.infer<typeof AcceptanceTestStateSchema>,
      rank: at.rank,
      createdById: at.createdById ?? null,
      createdAt: at.createdAt.toISOString(),
      updatedAt: at.updatedAt.toISOString(),
    },
  };
}

export function jsonApiSerializeManyAcceptanceTests(items: AcceptanceTestEntityType[]) {
  return items.map(jsonApiSerializeAcceptanceTest);
}

export function jsonApiSerializeSingleAcceptanceTestDocument(at: AcceptanceTestEntityType) {
  return { data: jsonApiSerializeAcceptanceTest(at) };
}
