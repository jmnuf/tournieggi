import type { Config } from "drizzle-kit";

export default {
  schema: "./db/schema.ts",
  out: "./migrations",
  dialect: "turso",
  dbCredentials: {
    url: (globalThis.Bun != null ? Bun : process).env.TURSO_DATABASE_URL!,
    authToken: (globalThis.Bun != null ? Bun : process).env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
