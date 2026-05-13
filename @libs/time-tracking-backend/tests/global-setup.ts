import { entities } from "#src/index.js";
import { entities as usersEntities, UserEntity } from "@libs/users-backend";
import { MikroORM } from "@mikro-orm/postgresql";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { TimeTrackingTestModule } from "./utils/setup-module.js";

let container: StartedPostgreSqlContainer;

export async function setup() {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("test_db")
    .withUsername("test_user")
    .withPassword("test_password")
    .start();

  process.env.TEST_DATABASE_URL = container.getConnectionUri();

  const orm = await MikroORM.init({
    entities: [...usersEntities, ...entities],
    clientUrl: process.env.TEST_DATABASE_URL,
  });

  await orm.schema.refresh();

  await orm.em
    .getRepository(UserEntity)
    .insert(TimeTrackingTestModule.seedUserInsert(TimeTrackingTestModule.TEST_USER_ID));

  await orm.close();
}

export async function teardown() {
  await container?.stop();
}
