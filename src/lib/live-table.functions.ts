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

    await syncLiveRounds();

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
          lastError: feedRes.data.last_error,
        }
      : null;
    return {
      rounds: roundsRes.data.map(rowToLiveRound).reverse(),
      serverNow: Date.now(),
      feed,
    };
  });
