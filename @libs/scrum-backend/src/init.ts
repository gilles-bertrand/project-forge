import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from "fastify";
import { type ZodTypeProvider } from "fastify-type-provider-zod";
import { handleJsonApiErrors, type ModuleInterface } from "@libs/backend-shared";
import { createJwtAuthMiddleware } from "@libs/users-backend";
import type { ScrumLibraryContext } from "#src/context.js";
import {
  mountDashboard,
  mountEpics,
  mountProjects,
  mountSearch,
  mountSprints,
  mountTasks,
  mountUserStories,
} from "#src/mounters.js";

export type FastifyInstanceTypeForModule = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  ZodTypeProvider
>;

export class ScrumModule implements ModuleInterface<FastifyInstanceTypeForModule> {
  private constructor(private context: ScrumLibraryContext) {}

  public static init(context: ScrumLibraryContext): ScrumModule {
    return new ScrumModule(context);
  }

  public async setupRoutes(fastify: FastifyInstanceTypeForModule): Promise<void> {
    await fastify.register(async (f) => {
      f.setErrorHandler((error, request, reply) => {
        handleJsonApiErrors(error, request, reply);
      });

      const jwtAuth = createJwtAuthMiddleware(
        this.context.em,
        this.context.configuration.jwtSecret,
      );
      f.addHook("preValidation", jwtAuth);

      await mountProjects(f, this.context.em);
      await mountEpics(f, this.context.em);
      await mountUserStories(f, this.context.em);
      await mountTasks(f, this.context.em);
      await mountSprints(f, this.context.em);
      await mountSearch(f, this.context.em);
      await mountDashboard(f, this.context.em, this.context.timeTrackingPort);
    });
  }
}
