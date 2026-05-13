import { TimeTrackingModule, type FastifyInstanceTypeForModule, entities } from "#src/index.js";
import { entities as usersEntities } from "@libs/users-backend";
import { MikroORM } from "@mikro-orm/postgresql";
import { fastify } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { sign } from "jsonwebtoken";

export class TimeTrackingTestModule {
  public static JWT_SECRET = "testSecret";
  public static TEST_USER_ID = "test-user-id";

  declare public fastifyInstance: FastifyInstanceTypeForModule;

  private constructor(
    public module: TimeTrackingModule,
    private orm: MikroORM,
  ) {}

  public static async init() {
    const connectionUrl = process.env.TEST_DATABASE_URL;
    if (!connectionUrl) {
      throw new Error("TEST_DATABASE_URL not set. global-setup.ts must run first.");
    }

    const orm = await MikroORM.init({
      entities: [...usersEntities, ...entities],
      clientUrl: connectionUrl,
    });

    const fastifyInstance = fastify().withTypeProvider<ZodTypeProvider>();
    fastifyInstance.setValidatorCompiler(validatorCompiler);
    fastifyInstance.setSerializerCompiler(serializerCompiler);
    fastifyInstance.addContentTypeParser(
      "application/vnd.api+json",
      // @ts-expect-error fastify default parser signature mismatch
      fastifyInstance.getDefaultJsonParser("ignore", "ignore"),
    );

    const sharedEm = orm.em.fork();

    const module = TimeTrackingModule.init({
      em: sharedEm,
      configuration: { jwtSecret: TimeTrackingTestModule.JWT_SECRET },
    });

    const testModule = new TimeTrackingTestModule(module, orm);
    testModule.fastifyInstance = fastifyInstance;

    await module.setupRoutes(fastifyInstance);
    return testModule;
  }

  get em() {
    return this.module["context"].em;
  }

  public generateBearerToken(userId: string = TimeTrackingTestModule.TEST_USER_ID) {
    return "Bearer " + sign({ userId }, TimeTrackingTestModule.JWT_SECRET);
  }

  static seedUserInsert(userId: string) {
    const now = new Date();
    return {
      id: userId,
      email: `${userId}@test.com`,
      firstName: "Test",
      lastName: "User",
      password: "$argon2id$v=19$test$placeholder",
      role: "Developer",
      color: "#66C7B8",
      avatar: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  public async close() {
    await this.orm.close(true);
  }
}
