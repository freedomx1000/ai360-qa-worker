import type { Env } from "../config.js";
import { writeHealthCheck, writeAlert } from "../supabase.js";

export async function roomGateCheck(env: Env, sb: any) {
  if (!env.APP_BASE_URL) {
    await writeHealthCheck({
      sb,
      orgId: env.QA_ORG_ID,
      checkName: "room_gate",
      status: "warn",
      detail: "APP_BASE_URL not set; skipping"
    });
    return;
  }
  const roomUrl = new URL(env.ROOM_ROUTE, env.APP_BASE_URL).toString();
  const thresholdUrl = new URL(env.ROOM_THRESHOLD_ROUTE, env.APP_BASE_URL).toString();
  try {
    const [r1, r2] = await Promise.all([
      fetch(roomUrl, { method: "GET" }),
      fetch(thresholdUrl, { method: "GET" })
    ]);
    // No exigimos 200 porque puede redirigir a login. Solo evitamos 500/502.
    const bad = (r: Response) => r.status >= 500;
    if (bad(r1) || bad(r2)) {
      await writeHealthCheck({
        sb,
        orgId: env.QA_ORG_ID,
        checkName: "room_gate",
        status: "fail",
        detail: `bad status room=${r1.status} threshold=${r2.status}`,
        meta: { roomUrl, thresholdUrl }
      });
      await writeAlert({
        sb,
        orgId: env.QA_ORG_ID,
        severity: "critical",
        area: "room",
        message: "ROOM routes returning 5xx",
        link: "/room",
        meta: { roomUrl, thresholdUrl  roomUrl, thresholdUrl, check_name: "room_gate" }
      });
      return;
    }
    await writeHealthCheck({
      sb,
      orgId: env.QA_ORG_ID,
      checkName: "room_gate",
      status: "ok",
      detail: `room=${r1.status} threshold=${r2.status}`,
      meta: { roomUrl, thresholdUrl }
    });
  } catch (e: any) {
    await writeHealthCheck({
      sb,
      orgId: env.QA_ORG_ID,
      checkName: "room_gate",
      status: "fail",
      detail: e?.message ?? "room check failed",
      meta: { roomUrl, thresholdUrl }
    });
    throw e;
  }
}
