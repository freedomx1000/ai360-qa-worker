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

export async function isCheckStable(params: {
  sb: ReturnType<typeof getSupabase>;
  orgId: string;
  checkName: string;
}) {
  const { sb, orgId, checkName } = params;
  const sinceIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from("ops_health_checks")
    .select("status,created_at")
    .eq("org_id", orgId)
    .eq("check_name", checkName)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) throw error;
  const statuses = (data ?? []).map((r) => r.status);
  // Inteligencia: mínimo 2 resultados y ambos ok, y ninguno warn/fail
  if (statuses.length < 2) return false;
  if (statuses.some((s) => s !== "ok")) return false;
  return true;
}

export async function autoResolveAlertsForCheck(params: {
  sb: ReturnType<typeof getSupabase>;
  orgId: string;
  checkName: string;
}) {
  const { sb, orgId, checkName } = params;
  // Resolve: solo las NO resueltas y asociadas a ese check (meta.check_name)
  // También acepta fallback por área para alertas antiguas sin meta.
  const areaMap: Record<string, string> = {
    app_health: "app",
    room_gate: "room",
    supabase_ping: "supabase",
  };
  const area = areaMap[checkName];
  // 1) Resolver por meta.check_name (modo correcto)
  await sb
    .from("ops_alerts")
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      meta: {
        auto_resolved: true,
        resolved_by: "qa-worker",
        check_name: checkName,
      },
    })
    .eq("org_id", orgId)
    .eq("resolved", false)
    .contains("meta", { check_name: checkName });
  // 2) Fallback: si hay alertas viejas sin meta, resolver por area
  if (area) {
    await sb
      .from("ops_alerts")
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        meta: {
          auto_resolved: true,
          resolved_by: "qa-worker",
          check_name: checkName,
        },
      })
      .eq("org_id", orgId)
      .eq("resolved", false)
      .eq("area", area);
  }
}
