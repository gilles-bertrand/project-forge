import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from "fastify";
import { type ZodTypeProvider } from "fastify-type-provider-zod";
import { handleJsonApiErrors, type ModuleInterface, type Route } from "@libs/backend-shared";
import { createJwtAuthMiddleware } from "@libs/users-backend";
import type { TimeTrackingLibraryContext } from "#src/context.js";
import { TimeEntryEntity } from "#src/entities/time-entry.entity.js";
import { ListTimeEntriesRoute } from "#src/routes/list.route.js";
import { GetTimeEntryRoute } from "#src/routes/get.route.js";
import { CreateTimeEntryRoute } from "#src/routes/create.route.js";
import { UpdateTimeEntryRoute } from "#src/routes/update.route.js";
import { DeleteTimeEntryRoute } from "#src/routes/delete.route.js";

export type FastifyInstanceTypeForModule = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  ZodTypeProvider
>;

export class TimeTrackingModule implements ModuleInterface<FastifyInstanceTypeForModule> {
  private constructor(private context: TimeTrackingLibraryContext) {}

  public static init(context: TimeTrackingLibraryContext): TimeTrackingModule {
    return new TimeTrackingModule(context);
  }

  public get em() {
    return this.context.em;
  }

  public async setupRoutes(fastify: FastifyInstanceTypeForModule): Promise<void> {
    const em = this.context.em;
    const repo = em.getRepository(TimeEntryEntity);
    const jwtAuth = createJwtAuthMiddleware(em, this.context.configuration.jwtSecret);

    await fastify.register(
      async (f) => {
        f.setErrorHandler(handleJsonApiErrors);
        f.addHook("preValidation", jwtAuth);

        const routes: Route<FastifyInstanceTypeForModule>[] = [
          new ListTimeEntriesRoute(em),
          new GetTimeEntryRoute(repo),
          new CreateTimeEntryRoute(repo),
          new UpdateTimeEntryRoute(repo),
          new DeleteTimeEntryRoute(repo),
        ];
        for (const r of routes) r.routeDefinition(f);
      },
      { prefix: "/time-entries" },
    );
  }
}
