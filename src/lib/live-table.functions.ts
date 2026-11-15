import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { rowToLiveRound, type LiveRound } from "./live-table";
import { syncLiveRounds } from "./live-table.server";

export interface LiveTableData {
  /** Real rounds, oldest first. */
  rounds: LiveRound[];
  /** Server clock when the answer was produced, to line every device up on the same time. */
  serverNow: number;
  /** Feed health; only filled in for the admin. */
  feed: { lastSuccessAt: number | null; lastError: string | null } | null;
}

/** Latest real rounds from the Bac Bo Live table. Approved users only. */
export const getLiveTable = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LiveTableData> => {
    const { data: approved } = await context.supabase.rpc("is_approved", {
      _user_id: context.userId,
    });
    if (!approved) throw new Error("Conta não aprovada.");

    // A feed problem must never hide the rounds already stored from anyone.
    await syncLiveRounds().catch((e) => console.error("sync failed", e));

    const [roundsRes, feedRes] = await Promise.all([
      context.supabase
        .from("live_rounds")
        .select(
          "id, settled_at, outcome, player_dice, banker_dice, player_score, banker_score, multiplier",
        )
        .order("settled_at", { ascending: false })
        .limit(60),
      // RLS returns this row to the admin only.
      context.supabase
        .from("live_feed_status")
        .select("last_success_at, last_error")
        .eq("id", 1)
        .maybeSingle(),
    ]);
    if (roundsRes.error) {
      console.error("live_rounds read failed", roundsRes.error);
      throw new Error("Não foi possível ler as rodadas da mesa.");
    }
    const feed = feedRes.data
      ? {
          lastSuccessAt: feedRes.data.last_success_at
            ? Date.parse(feedRes.data.last_success_at)
            : null,
          lastError: process.env["SUPABASE_SERVICE_ROLE_KEY"]
            ? feedRes.data.last_error
            : "missing_service_key",
        }
      : null;
    return {
      rounds: roundsRes.data.map(rowToLiveRound).reverse(),
      serverNow: Date.now(),
      feed,
    };
  });

/** Admin only: saves a new LynxMetrics key, tests it and reconnects the table at once. */
export const connectLiveTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string }) => {
    const key = String(input?.key ?? "").trim();
    if (key.length < 8 || key.length > 500) throw new Error("Chave inválida.");
    return { key };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas o administrador pode trocar a chave.");
    if (!process.env["SUPABASE_SERVICE_ROLE_KEY"])
      return { ok: false, error: "missing_service_key" };
    const { testFeedKey, saveFeedKey } = await import("./live-table.server");
    const problem = await testFeedKey(data.key);
    if (problem) return { ok: false, error: problem };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await saveFeedKey(supabaseAdmin, data.key);
    await syncLiveRounds(true);
    return { ok: true, error: null };
  });
