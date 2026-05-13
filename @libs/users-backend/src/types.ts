import type { UserEntityType } from "./entities/user.entity.js";
import { z } from "zod";

declare module "fastify" {
  interface FastifyRequest {
    user?: UserEntityType;
  }
}

export const USER_ROLES = [
  "Product Owner",
  "Scrum Master",
  "Developer",
  "Designer UX",
  "QA Tester",
  "DevOps",
] as const;

export const UserRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
