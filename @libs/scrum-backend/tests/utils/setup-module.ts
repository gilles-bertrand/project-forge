import {
  ScrumModule,
  type FastifyInstanceTypeForModule,
  entities,
  type TimeTrackingPort,
} from "#src/index.js";
import { entities as usersEntities, UserEntity } from "@libs/users-backend";
import { MikroORM } from "@mikro-orm/postgresql";
import { fastify } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { sign } from "jsonwebtoken";

/**
 * Stub TimeTrackingPort utilisable par défaut dans les tests scrum-backend.
 * Retourne 0 pour toute requête, ce qui suffit pour la majorité des tests
 * (ceux qui veulent une valeur précise injectent leur propre stub).
 */
export class StubTimeTrackingPort implements TimeTrackingPort {
  public constructor(
    private fixedHours = 0,
    private deleteByProjectIdImpl: (projectId: string) => Promise<void> = async () => {},
  ) {}

  public async sumHoursByUserAndSprint(_userId: string, _sprintId: string): Promise<number> {
    return this.fixedHours;
  }

  public async deleteByProjectId(projectId: string): Promise<void> {
    await this.deleteByProjectIdImpl(projectId);
  }
}

export class ScrumTestModule {
  public static JWT_SECRET = "testSecret";
  public static TEST_USER_ID = "test-user-id";

  declare public fastifyInstance: FastifyInstanceTypeForModule;

  private constructor(
    public module: ScrumModule,
    private orm: MikroORM,
  ) {}

  public static async init(timeTrackingPort: TimeTrackingPort = new StubTimeTrackingPort()) {
    const connectionUrl = process.env.TEST_DATABASE_URL;
    if (!connectionUrl) {
      throw new Error(
        "TEST_DATABASE_URL environment variable is not set. Make sure global-setup.ts ran.",
      );
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

    const module = ScrumModule.init({
      em: sharedEm,
      configuration: { jwtSecret: ScrumTestModule.JWT_SECRET },
      timeTrackingPort,
    });

    const testModule = new ScrumTestModule(module, orm);
    testModule.fastifyInstance = fastifyInstance;

    await module.setupRoutes(fastifyInstance);
    return testModule;
  }

  get em() {
    return this.module.em;
  }

  public generateBearerToken(userId: string = ScrumTestModule.TEST_USER_ID) {
    return "Bearer " + sign({ userId }, ScrumTestModule.JWT_SECRET);
  }

  public async createUser(data: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    color?: string;
    avatar?: string | null;
  }) {
    const now = new Date();
    await this.em.getRepository(UserEntity).insert({
      id: data.id,
      email: data.email,
      firstName: data.firstName ?? "Test",
      lastName: data.lastName ?? "User",
      password: "$argon2id$v=19$test$placeholder",
      role: data.role ?? "Developer",
      color: data.color ?? "#66C7B8",
      avatar: data.avatar ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  public async close() {
    await this.orm.close(true);
  }
}
