import { loadEnv } from "./config.js";
import { getSupabase } from "./supabase.js";
import { runOnce } from "./runner.js";

const env = loadEnv();
const sb = getSupabase(env);

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`[qa-worker] started. interval=${env.CHECK_INTERVAL_SECONDS} s org=${env.QA_ORG_ID}`);
  // loop infinito (Render Background Worker)
  while (true) {
    const started = Date.now();
    try {
      await runOnce(env, sb);
      const took = Date.now() - started;
      console.log(`[qa-worker] run ok (${took} ms)`);
    } catch (e: any) {
      console.log(`[qa-worker] run fail: ${e?.message ?? e}`);
    }
    await sleep(env.CHECK_INTERVAL_SECONDS * 1000);
  }
}

main().catch((e) => {
  console.error("[qa-worker] fatal:", e);
  process.exit(1);
});
