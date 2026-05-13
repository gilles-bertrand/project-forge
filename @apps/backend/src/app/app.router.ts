import { type AuthModule, type UserModule } from "@libs/users-backend";
import type { FastifyInstanceType } from "./app.js";
import { statusRoute } from "./status.route.js";

interface AppRouterOptions {
  authModule: AuthModule;
  userModule: UserModule;
}

export async function appRouter(
  fastify: FastifyInstanceType,
  { authModule, userModule }: AppRouterOptions,
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
    },
    {
      prefix: "api/v1",
    },
  );
}
