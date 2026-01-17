import type { Env } from "../config.js";
import { writeHealthCheck } from "../supabase.js";

export async function supabasePingCheck(env: Env, sb: any) {
  const started = Date.now();
  try {
    // ping trivial: leer 1 fila de orgs (si existe) o solo hacer RPC simple (si tienes)
    const { error } = await sb.from("ops_health_checks").select("id").limit(1);
    if (error) throw error;
    const ms = Date.now() - started;
    await writeHealthCheck({
      sb,
      orgId: env.QA_ORG_ID,
      checkName: "supabase_ping",
      status: ms < 1200 ? "ok" : "warn",
      detail: ms < 1200 ? `latency ${ms} ms` : `high latency ${ms} ms`,
      meta: { latency_ms: ms }
    });
  } catch (e: any) {
    await writeHealthCheck({
      sb,
      orgId: env.QA_ORG_ID,
      checkName: "supabase_ping",
      status: "fail",
      detail: e?.message ?? "supabase ping failed"
    });
    throw e;
  }
}
