import { z } from "zod";

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  QA_ORG_ID: z.string().uuid(),
  CHECK_INTERVAL_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  APP_BASE_URL: z.string().url().optional(),
  APP_HEALTH_PATH: z.string().optional().default("/api/health"),
  ROOM_ROUTE: z.string().optional().default("/room"),
  ROOM_THRESHOLD_ROUTE: z.string().optional().default("/room/threshold")
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid env:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
