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
import { withAuditContext } from "#src/audit/audit.hook.js";
import {
  mountAcceptanceTests,
  mountAttachments,
  mountComments,
  mountDashboard,
  mountEpics,
  mountProjects,
  mountSearch,
  mountSprints,
  mountStoryDependencies,
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

  public get em() {
    return this.context.em;
  }

  public async setupRoutes(fastify: FastifyInstanceTypeForModule): Promise<void> {
    await fastify.register(async (f) => {
      f.setErrorHandler(handleJsonApiErrors);

      const jwtAuth = createJwtAuthMiddleware(
        this.context.em,
        this.context.configuration.jwtSecret,
      );
      f.addHook("preValidation", jwtAuth);
      f.addHook("preHandler", withAuditContext);

      await mountProjects(f, this.context.em, this.context.timeTrackingPort);
      await mountEpics(f, this.context.em);
      await mountUserStories(f, this.context.em);
      await mountTasks(f, this.context.em);
      await mountSprints(f, this.context.em);
      await mountComments(f, this.context.em);
      await mountAttachments(f, this.context.em);
      await mountAcceptanceTests(f, this.context.em);
      await mountStoryDependencies(f, this.context.em);
      await mountSearch(f, this.context.em);
      await mountDashboard(f, this.context.em, this.context.timeTrackingPort);
    });
  }
}
