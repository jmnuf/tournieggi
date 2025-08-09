import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    TURSO_AUTH_TOKEN: z.string(),
    TURSO_DATABASE_URL: z.url(),
    CLERK_SECRET_KEY: z.string().min(1),
    BUN_VERSION: z.string().regex(/\d+\.\d+\.\d+/), // <integer>.<integer>.<integer>
  },

  clientPrefix: 'VITE_',
  client: {
    VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    VITE_API_URL: z.string().min(1).optional(),
  },

  runtimeEnv: globalThis.Bun != null ? Bun.env : import.meta.env,
});

