import { defineEntity, p, type InferEntity } from "@mikro-orm/core";

export const UserEntity = defineEntity({
  name: "User",
  properties: {
    id: p.string().primary(),
    email: p.string().unique(),
    firstName: p.string(),
    lastName: p.string(),
    password: p.string(),
    role: p.string(),
    color: p.string(),
    avatar: p.string().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onUpdate(() => new Date())
      .onCreate(() => new Date()),
  },
});

export type UserEntityType = InferEntity<typeof UserEntity>;
