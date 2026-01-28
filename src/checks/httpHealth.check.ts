import type { Env } from "../config.js";
import { writeHealthCheck, writeAlert } from "../supabase.js";

export async function httpHealthCheck(env: Env, sb: any) {
  if (!env.APP_BASE_URL) {
    await writeHealthCheck({
      sb,
      orgId: env.QA_ORG_ID,
      checkName: "app_health",
      status: "warn",
      detail: "APP_BASE_URL not set; skipping"
    });
    return;
  }
  const url = new URL(env.APP_HEALTH_PATH, env.APP_BASE_URL).toString();
  const started = Date.now();
  try {
    const res = await fetch(url, { method: "GET" });
    const ms = Date.now() - started;
    if (!res.ok) {
      await writeHealthCheck({
        sb,
        orgId: env.QA_ORG_ID,
        checkName: "app_health",
        status: "fail",
        detail: `HTTP ${res.status} ${res.statusText}`,
        meta: { url, latency_ms: ms }
      });
      await writeAlert({
        sb,
        orgId: env.QA_ORG_ID,
        severity: "critical",
        area: "app",
        message: `APP health failed (${res.status})`,
        link: "/internal",
        meta: { url, check_name: "app_health" }
      });
      return;
    }
    await writeHealthCheck({
      sb,
      orgId: env.QA_ORG_ID,
      checkName: "app_health",
      status: ms < 2000 ? "ok" : "warn",
      detail: ms < 2000 ? `ok ${ms} ms` : `slow ${ms} ms`,
      meta: { url, latency_ms: ms }
    });
  } catch (e: any) {
    await writeHealthCheck({
      sb,
      orgId: env.QA_ORG_ID,
      checkName: "app_health",
      status: "fail",
      detail: e?.message ?? "fetch failed",
      meta: { url }
    });
    await writeAlert({
      sb,
      orgId: env.QA_ORG_ID,
      severity: "critical",
      area: "app",
      message: "APP health fetch failed",
      link: "/internal",
      meta: { url, check_name: "app_health" }
    });
    throw e;
  }
}
