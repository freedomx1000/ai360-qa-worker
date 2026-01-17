import type { Env } from "./config.js";
import { supabasePingCheck } from "./checks/supabasePing.check.js";
import { httpHealthCheck } from "./checks/httpHealth.check.js";
import { roomGateCheck } from "./checks/roomGate.check.js";

export async function runOnce(env: Env, sb: any) {
  // Orden: base primero
  await supabasePingCheck(env, sb);
  await httpHealthCheck(env, sb);
  await roomGateCheck(env, sb);
}
