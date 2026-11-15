import { lynxToRow, type LynxRound } from "./live-table";

/** LynxMetrics Bac Bo Live API; keys start with `sk-lynx` and go in the `x-api-key` header. */
const API_URL = "https://api.lynxmetrics.com/v1/bacbo-live";
// The provider itself gives up at 10s; wait a little longer so its own error reaches us.
const TIMEOUT_MS = 12_000;

const lynxFetch = (path: string, key: string) =>
  fetch(`${API_URL}${path}`, {
    headers: { "x-api-key": key, accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

async function errorCode(res: Response): Promise<string> {
  const body = await res.text();
  let code = "";
  try {
    code = (JSON.parse(body) as { error?: { code?: string } }).error?.code ?? "";
  } catch {
    /* not JSON */
  }
  return `http_${res.status}${code ? `:${code}` : ""}`;
}
/** At most one provider call per this interval, shared by every user (API allows 60/min). */
const SYNC_INTERVAL_MS = 4_000;
/** Older than this, re-read the latest page instead of catching up round by round. */
const CATCH_UP_MS = 30 * 60_000;
const KEEP_DAYS = 3;

/**
 * Pulls new rounds from the live table into the database. Throttled through the database,
 * so many users polling at once still make only one provider call per interval.
 */
const CONFIG_BUCKET = "app-config";
const KEY_PATH = "lynxmetrics.json";

type Admin = ReturnType<typeof import("./admin-client.server").getAdminClient>;

/** API key the admin saved in the panel; falls back to the server setting. */
export async function readFeedKey(admin: Admin): Promise<string | null> {
  const { data } = await admin.storage.from(CONFIG_BUCKET).download(KEY_PATH);
  if (data) {
    try {
      const key = (JSON.parse(await data.text()) as { key?: string }).key;
      if (key) return key;
    } catch {
      /* ignore */
    }
  }
  return process.env["LYNXMETRICS_API_KEY"] || process.env["UDC_LYNXMETRICS_API_KEY"] || null;
}

export async function saveFeedKey(admin: Admin, key: string): Promise<void> {
  await admin.storage.createBucket(CONFIG_BUCKET, { public: false }).catch(() => undefined);
  const { error } = await admin.storage
    .from(CONFIG_BUCKET)
    .upload(KEY_PATH, new Blob([JSON.stringify({ key })], { type: "application/json" }), {
      upsert: true,
    });
  if (error) throw new Error(`storage:${error.message}`);
}

/** Calls the provider once with this key; returns an error code or null when it works. */
export async function testFeedKey(key: string): Promise<string | null> {
  try {
    const res = await lynxFetch("/results?limit=1", key);
    return res.ok ? null : await errorCode(res);
  } catch {
    return "network";
  }
}

/** Set after a 429: no provider calls before this time (from the Retry-After header). */
let pausedUntil = 0;
/** Pages fetched per sync when catching up after a pause. */
const MAX_PAGES = 3;

export async function syncLiveRounds(force = false): Promise<void> {
  if (!(await import("./admin-client.server")).serviceKey()) return;
  if (!force && Date.now() < pausedUntil) return;
  const { getAdminClient } = await import("./admin-client.server");
  const supabaseAdmin = getAdminClient();
  const { data: claimed, error: claimError } = await supabaseAdmin.rpc("claim_live_feed_sync", {
    _min_interval_ms: force ? 0 : SYNC_INTERVAL_MS,
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
    const connectionKey = await readFeedKey(supabaseAdmin);
    if (!connectionKey) throw new Error("missing_credentials");

    const { data: last } = await supabaseAdmin
      .from("live_rounds")
      .select("id, settled_at")
      .order("settled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Resume right after the last stored round (oldest first); a stale or unknown cursor
    // falls back to the latest page so the table never gets stuck on an old id.
    let cursor = last && Date.now() - Date.parse(last.settled_at) < CATCH_UP_MS ? last.id : null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams({ limit: "100" });
      if (cursor) params.set("after", cursor);
      let res = await lynxFetch(`/results?${params}`, connectionKey);
      if (!res.ok && cursor && (res.status === 400 || res.status === 403 || res.status === 404)) {
        const code = await errorCode(res);
        if (!/unauthorized|key_|trial_expired|subscription_required/.test(code)) {
          cursor = null;
          res = await lynxFetch("/results?limit=100", connectionKey);
        } else throw new Error(code);
      }
      if (!res.ok) {
        if (res.status === 429) {
          const wait = Number(res.headers.get("retry-after"));
          pausedUntil = Date.now() + (Number.isFinite(wait) && wait > 0 ? wait : 10) * 1000;
        }
        const code = await errorCode(res);
        console.error(`LynxMetrics request failed: ${code}`);
        throw new Error(code);
      }

      const body = (await res.json().catch(() => null)) as {
        data?: LynxRound[];
        nextCursor?: string | null;
      } | null;
      if (!body || !Array.isArray(body.data)) throw new Error("bad_response");
      const rows = body.data.map(lynxToRow).filter((r) => r !== null);
      if (rows.length) {
        const { error } = await supabaseAdmin
          .from("live_rounds")
          .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
        if (error) throw new Error(`db:${error.message}`);
      }
      // Only a full page read with `after` has more to catch up on.
      if (!cursor || body.data.length < 100 || !body.nextCursor) break;
      cursor = body.nextCursor;
    }
    const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString();
    await supabaseAdmin.from("live_rounds").delete().lt("settled_at", cutoff);
    await setStatus({ last_success_at: new Date().toISOString(), last_error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Live table sync failed:", message);
    await setStatus({ last_error: message.slice(0, 300) });
  }
}
