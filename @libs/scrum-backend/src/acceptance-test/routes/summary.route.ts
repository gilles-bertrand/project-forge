import type { FastifyInstanceTypeForModule } from "#src/init.js";
import type { EntityManager } from "@mikro-orm/core";
import { object, string } from "zod";
import { AcceptanceTestEntity } from "#src/acceptance-test/acceptance-test.entity.js";
import { UserStoryEntity } from "#src/user-story/user-story.entity.js";
import { aggregateTestState } from "#src/acceptance-test/aggregate.js";
import {
  jsonApiErrorDocumentSchema,
  makeJsonApiError,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";
import { AcceptanceTestAggregateStateSchema } from "#src/types.js";

const SummarySchema = object({
  id: string(),
  type: string(),
  attributes: object({
    state: AcceptanceTestAggregateStateSchema,
  }),
});

export class AcceptanceTestSummaryByStoryRoute implements Route {
  public constructor(private em: EntityManager) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.get(
      "/:id/acceptance-tests-summary",
      {
        schema: {
          params: object({ id: string() }),
          response: {
            200: makeSingleJsonApiTopDocument(SummarySchema),
            404: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const { id } = request.params as { id: string };
        const story = await this.em.findOne(UserStoryEntity, { id });
        if (!story) {
          return reply.code(404).send(
            makeJsonApiError(404, "Not Found", {
              code: "USER_STORY_NOT_FOUND",
              detail: `User story with id ${id} not found`,
            }),
          );
        }
        const items = await this.em.getRepository(AcceptanceTestEntity).findAll({
          where: { userStoryId: id },
        });
        const state = aggregateTestState(items);
        return reply.send({
          data: {
            id,
            type: "acceptance-test-summaries",
            attributes: { state },
          },
        });
      },
    );
  }
}
