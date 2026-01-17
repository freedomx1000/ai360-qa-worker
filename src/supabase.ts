import { createClient } from "@supabase/supabase-js";
import type { Env } from "./config.js";

export function getSupabase(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "ai360-qa-worker" } }
  });
}

export type CheckStatus = "ok" | "warn" | "fail";

export async function writeHealthCheck(params: {
  sb: ReturnType<typeof getSupabase>;
  orgId: string;
  checkName: string;
  status: CheckStatus;
  detail?: string;
  meta?: Record<string, unknown>;
}) {
  const { sb, orgId, checkName, status, detail, meta } = params;
  const { error } = await sb.from("ops_health_checks").insert({
    org_id: orgId,
    check_name: checkName,
    status,
    detail: detail ?? null,
    meta: meta ?? {}
  });
  if (error) throw error;
}

export async function writeAlert(params: {
  sb: ReturnType<typeof getSupabase>;
  orgId: string;
  severity: "info" | "warn" | "critical";
  area: string;
  message: string;
  link?: string;
  meta?: Record<string, unknown>;
}) {
  const { sb, orgId, severity, area, message, link, meta } = params;
  const { error } = await sb.from("ops_alerts").insert({
    org_id: orgId,
    severity,
    area,
    message,
    link: link ?? null,
    meta: meta ?? {}
  });
  if (error) throw error;
}
