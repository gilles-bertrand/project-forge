import { object, string } from "zod";
import type z from "zod";

const schema = object({
  PORT: string().transform(Number),
  SERVER_URL: string(),
  PRODUCTION_ENV: string().transform((v) => v === "true"),
  DEBUG: string()
    .transform((v) => v === "true")
    .default(false),
  DATABASE_URI: string(),
  SESSION_KEY: string(),
  JWT_SECRET: string(),
  JWT_REFRESH_SECRET: string(),
  SEED: string().default("42").optional(),
  APP_NAME: string().default("SprintForge"),
  APP_URL: string().default("http://localhost:4200"),
  APP_LOGO_URL: string().optional(),
  SMTP_HOST: string().optional(),
  SMTP_PORT: string().optional(),
  SMTP_USER: string().optional(),
  SMTP_PASSWORD: string().optional(),
  SMTP_SECURE: string()
    .transform((v) => v === "true")
    .optional(),
  EMAIL_FROM_NAME: string().default("SprintForge Support"),
  EMAIL_FROM_ADDRESS: string().default("support@example.com"),
});

export type AppConfiguration = z.infer<typeof schema>;

export function loadConfiguration() {
  return schema.parse(process.env);
}
