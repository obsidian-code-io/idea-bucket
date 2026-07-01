// Parses and validates environment configuration once at boot.
import { z } from "zod";

const boolish = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1");

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATA_DIR: z.string().default("/data"),
  DB_PATH: z.string().default("/data/idea-bucket.db"),
  UPLOAD_DIR: z.string().default("/data/uploads"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(25),
  ENABLE_BASIC_AUTH: boolish,
  APP_BASIC_AUTH_USER: z.string().default("team"),
  APP_BASIC_AUTH_PASS: z.string().default("change-me"),
  COOKIE_SECRET: z.string().min(1).default("dev-insecure-secret-change-me"),
  PUBLIC_BASE_URL: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.parse(process.env);

export const config = {
  ...parsed,
  MAX_UPLOAD_BYTES: parsed.MAX_UPLOAD_MB * 1024 * 1024,
};

export type Config = typeof config;
