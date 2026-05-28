import { defineConfig, MikroORM } from "@mikro-orm/postgresql";
import type { AppConfiguration } from "../configuration.js";
import { entities as usersEntities } from "@libs/users-backend";
import { entities as scrumEntities } from "@libs/scrum-backend";
import { entities as timeTrackingEntities } from "@libs/time-tracking-backend";

export function databaseConfig(config: Pick<AppConfiguration, "DATABASE_URI">) {
  return defineConfig({
    seeder: {
      pathTs: "./src/seeders",
    },
    migrations: {
      path: "./src/migrations",
      glob: "!(*.d).{js,ts}",
      transactional: true,
      allOrNothing: true,
      emit: "ts",
    },
    clientUrl: config.DATABASE_URI,
    entities: [...usersEntities, ...scrumEntities, ...timeTrackingEntities],
  });
}

export async function createDatabaseConnection(config: Pick<AppConfiguration, "DATABASE_URI">) {
  const orm = await MikroORM.init(databaseConfig(config));
  return orm;
}
