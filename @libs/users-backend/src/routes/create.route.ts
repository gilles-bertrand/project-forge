import type { FastifyInstanceTypeForModule } from "#src/init.js";
import { type UserEntityType } from "#src/entities/user.entity.js";
import type { EntityRepository } from "@mikro-orm/core";
import { randomUUID } from "crypto";
import {
  jsonApiSerializeSingleUserDocument,
  SerializedUserSchema,
} from "#src/serializers/user.serializer.js";
import { hash } from "argon2";
import { email, object, string } from "zod";
import {
  jsonApiErrorDocumentSchema,
  makeSingleJsonApiTopDocument,
  type Route,
} from "@libs/backend-shared";
import { UserRoleSchema, UserColorSchema } from "#src/types.js";

export class CreateRoute implements Route {
  public constructor(private userRepository: EntityRepository<UserEntityType>) {}

  public routeDefinition(f: FastifyInstanceTypeForModule) {
    return f.post(
      "/",
      {
        schema: {
          body: makeSingleJsonApiTopDocument(
            object({
              id: string().optional().nullable(),
              attributes: object({
                email: email(),
                firstName: string(),
                lastName: string(),
                password: string(),
                role: UserRoleSchema,
                color: UserColorSchema,
                avatar: string().url().nullable().optional(),
              }),
            }),
          ),
          response: {
            200: makeSingleJsonApiTopDocument(SerializedUserSchema),
            400: jsonApiErrorDocumentSchema,
            409: jsonApiErrorDocumentSchema,
          },
        },
      },
      async (request, reply) => {
        const body = request.body.data.attributes;

        const password = await hash(body.password);

        const user = this.userRepository.create({
          id: request.body.data.id || randomUUID(),
          email: body.email,
          firstName: body.firstName,
          lastName: body.lastName,
          password,
          role: body.role,
          color: body.color,
          avatar: body.avatar ?? null,
        });

        await this.userRepository.getEntityManager().flush();

        return reply.send(jsonApiSerializeSingleUserDocument(user));
      },
    );
  }
}
