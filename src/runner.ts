import type { Env } from "./config.js";
import { isCheckStable, autoResolveAlertsForCheck } from "./supabase.js";
import { supabasePingCheck } from "./checks/supabasePing.check.js";
import { httpHealthCheck } from "./checks/httpHealth.check.js";
import { roomGateCheck } from "./checks/roomGate.check.js";

export async function runOnce(env: Env, sb: any) {
  // Orden: base primero
  await supabasePingCheck(env, sb);
  await httpHealthCheck(env, sb);
  await roomGateCheck(env, sb);

    // Auto-resolve inteligente (solo si estable)
  const checkNames = ["supabase_ping", "app_health", "room_gate"];
  for (const name of checkNames) {
    const stable = await isCheckStable({ sb, orgId: env.QA_ORG_ID, checkName: name });
    if (stable) {
      await autoResolveAlertsForCheck({ sb, orgId: env.QA_ORG_ID, checkName: name });
    }
  }
}
