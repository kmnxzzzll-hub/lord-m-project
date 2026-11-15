import { lynxToRow, type LynxRound } from "./live-table";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/udc_lynxmetrics/v1/bacbo-live";
/** At most one provider call per this interval, shared by every user (API allows 60/min). */
const SYNC_INTERVAL_MS = 4_000;
/** Older than this, re-read the latest page instead of catching up round by round. */
const CATCH_UP_MS = 30 * 60_000;
const KEEP_DAYS = 3;

/**
 * Pulls new rounds from the live table into the database. Throttled through the database,
 * so many users polling at once still make only one provider call per interval.
 */
export async function syncLiveRounds(): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: claimed, error: claimError } = await supabaseAdmin.rpc("claim_live_feed_sync", {
    _min_interval_ms: SYNC_INTERVAL_MS,
  });
  if (claimError) {
    console.error("claim_live_feed_sync failed", claimError);
    return;
  }
  if (!claimed) return;

  const setStatus = (patch: { last_success_at?: string; last_error: string | null }) =>
    supabaseAdmin
      .from("live_feed_status")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", 1);

  try {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["UDC_LYNXMETRICS_API_KEY"];
    if (!lovableKey || !connectionKey) throw new Error("missing_credentials");

    const { data: last } = await supabaseAdmin
      .from("live_rounds")
      .select("id, settled_at")
      .order("settled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const params = new URLSearchParams({ limit: "100" });
    if (last && Date.now() - Date.parse(last.settled_at) < CATCH_UP_MS) params.set("after", last.id);

    const res = await fetch(`${GATEWAY_URL}/results?${params}`, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`LynxMetrics request failed [${res.status}]: ${body.slice(0, 500)}`);
      let code = "";
      try {
        code = (JSON.parse(body) as { error?: { code?: string } }).error?.code ?? "";
      } catch {
        /* not JSON */
      }
      throw new Error(`http_${res.status}${code ? `:${code}` : ""}`);
    }

    const body = (await res.json()) as { data?: LynxRound[] };
    const rows = (body.data ?? []).map(lynxToRow).filter((r) => r !== null);
    if (rows.length) {
      const { error } = await supabaseAdmin
        .from("live_rounds")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw new Error(`db:${error.message}`);
      const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString();
      await supabaseAdmin.from("live_rounds").delete().lt("settled_at", cutoff);
    }
    await setStatus({ last_success_at: new Date().toISOString(), last_error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Live table sync failed:", message);
    await setStatus({ last_error: message.slice(0, 300) });
  }
}
