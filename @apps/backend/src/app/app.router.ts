import { type AuthModule, type UserModule } from "@libs/users-backend";
import type { ScrumModule } from "@libs/scrum-backend";
import type { TimeTrackingModule } from "@libs/time-tracking-backend";
import type { FastifyInstanceType } from "./app.js";
import { statusRoute } from "./status.route.js";

interface AppRouterOptions {
  authModule: AuthModule;
  userModule: UserModule;
  scrumModule: ScrumModule;
  timeTrackingModule: TimeTrackingModule;
}

export async function appRouter(
  fastify: FastifyInstanceType,
  { authModule, userModule, scrumModule, timeTrackingModule }: AppRouterOptions,
) {
  await fastify.register(
    async function (fastify) {
      await fastify.register(statusRoute);
      await authModule.setupRoutes(fastify);
      await fastify.register(async (fastify) => {
        // Resource routes
        fastify.addHook("onRoute", (routeOptions) => {
          if (routeOptions.schema) {
            routeOptions.schema.tags ??= ["resource"];
          }
        });
      });

      await userModule.setupRoutes(fastify);
      await scrumModule.setupRoutes(fastify);
      await timeTrackingModule.setupRoutes(fastify);
    },
    {
      prefix: "api/v1",
    },
  );
}
