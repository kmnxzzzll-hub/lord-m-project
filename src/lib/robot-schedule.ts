/**
 * Shared robot timeline driven by the real Bac Bo Live table. The admin switches the robot on
 * (robot_settings.running + started_at); after every real round that settles, each client runs
 * the pattern engine on the same stored rounds, so all users see the same signal at the same time.
 */
import { detectSignal, type Round, type Side, type Signal } from "./bacbo-engine";
import type { LiveRound } from "./live-table";

/** Typical time between two results at the Bac Bo Live table (measured ~33-38s). */
export const ROUND_MS = 35_000;
/** Automatic analysis: the signal is ready this long after the round settles (no admin setting). */
export const ANALYSIS_MS = 1_500;
/** Estimated moment, after a round settles, when bets for the next round close. */
export const BET_CLOSE_MS = 24_000;
/** A round reaching us later than this after settling leaves too little time to bet: no signal. */
export const LATE_MS = 17_000;
/** No new round for this long: the table is treated as quiet and the robot waits. */
export const STALE_MS = 120_000;
const HISTORY = 60;
/** Past real rounds the robot needs before it reads a pattern. */
export const MIN_HISTORY = 5;

/**
 * The rounds that count as "live": the unbroken recent run ending in a round settled within
 * STALE_MS. Old rounds left in the database from an earlier connection are dropped, so a
 * disconnected table shows nothing instead of hours-old results.
 */
export function liveWindow(rounds: LiveRound[], now: number): LiveRound[] {
  const last = rounds[rounds.length - 1];
  if (!last || now - last.settledAt > STALE_MS) return [];
  let start = rounds.length - 1;
  while (start > 0 && rounds[start]!.settledAt - rounds[start - 1]!.settledAt <= STALE_MS) start--;
  return start === 0 ? rounds : rounds.slice(start);
}

/** When the signal after this round shows: right after the analysis, or as soon as the round arrived. */
export const revealTime = (r: LiveRound) => Math.max(r.settledAt + ANALYSIS_MS, r.receivedAt ?? 0);
/** The round arrived too late to bet on the next one. Same answer on every device. */
export const arrivedLate = (r: LiveRound) =>
  r.receivedAt !== undefined && r.receivedAt - r.settledAt > LATE_MS;

/**
 * Automatic strength: every recognized pattern (Surf, Xadrez, Parzinho, 3-1-3, Rampa) becomes
 * a signal. There is no admin setting, because higher filters left the robot silent for long
 * stretches on the real table.
 */
export const AUTO_CONFIDENCE = 60;

export interface ScheduleConfig {
  startedAt: number;
  minConfidence: number;
}

export type RobotPhase = "off" | "analyzing" | "signal";
/**
 * Why the robot is waiting: no live table, still gathering past rounds, waiting for the next
 * round, no pattern, or bets closed and the entry's result is on its way.
 */
export type WaitReason =
  | "no_connection"
  | "collecting"
  | "next_round"
  | "no_pattern"
  | "result"
  | null;

export interface RobotView {
  phase: RobotPhase;
  /** Id of the real round the current analysis/signal follows (or a waiting key). */
  key: string;
  phaseStart: number;
  phaseEnd: number;
  /** Next moment the view changes on its own, without a new round. */
  wakeAt: number;
  /** True while there is no fresh round to analyze or no pattern for the next one. */
  waiting: boolean;
  reason: WaitReason;
  /** Current entry; also kept while bets are closed and its result is pending. */
  signal: Signal | null;
  /** Real rounds the current reading is based on, oldest first. */
  history: Round[];
  lastRound: LiveRound | null;
}

const signalCache = new Map<string, Signal | null>();

/** Signal for the round that follows rounds[index], from the real rounds up to it. */
export function signalAfter(
  rounds: LiveRound[],
  index: number,
  minConfidence: number,
): Signal | null {
  const round = rounds[index];
  if (!round || index + 1 < MIN_HISTORY) return null;
  const key = `${round.id}:${minConfidence}`;
  if (signalCache.has(key)) return signalCache.get(key)!;
  const history = rounds.slice(Math.max(0, index + 1 - HISTORY), index + 1);
  const signal = detectSignal(history, minConfidence);
  if (signalCache.size > 500) signalCache.clear();
  signalCache.set(key, signal);
  return signal;
}

export function robotView(
  cfg: ScheduleConfig | null,
  rounds: LiveRound[],
  now: number,
): RobotView {
  const lastRound = rounds[rounds.length - 1] ?? null;
  const base = { history: rounds as Round[], lastRound, signal: null };
  if (!cfg) {
    return {
      ...base,
      phase: "off",
      key: "off",
      phaseStart: now,
      phaseEnd: Infinity,
      wakeAt: Infinity,
      waiting: false,
      reason: null,
    };
  }

  const waitFor = (from: number, key: string, reason: WaitReason): RobotView => ({
    ...base,
    phase: "analyzing",
    key,
    phaseStart: from,
    phaseEnd: Math.max(from + 1_000, from + ROUND_MS),
    wakeAt: Infinity,
    waiting: true,
    reason,
  });

  // No live table: nothing received, or the table went quiet.
  if (!lastRound || now - lastRound.settledAt > STALE_MS) {
    return waitFor(Math.max(cfg.startedAt, lastRound?.settledAt ?? 0), "no_connection", "no_connection");
  }
  // Nothing settled since the robot was switched on: wait for the next real round.
  if (lastRound.settledAt < cfg.startedAt) {
    const reason = rounds.length < MIN_HISTORY ? "collecting" : "next_round";
    return waitFor(lastRound.settledAt, `wait:${cfg.startedAt}`, reason);
  }

  const i = rounds.length - 1;
  const settled = lastRound.settledAt;
  const late = arrivedLate(lastRound);
  const signal = late ? null : signalAfter(rounds, i, cfg.minConfidence);
  const revealAt = revealTime(lastRound);
  const closeAt = settled + BET_CLOSE_MS;
  const history = rounds.slice(Math.max(0, i + 1 - HISTORY));
  const common = { history, lastRound, key: lastRound.id };

  if (signal && now >= revealAt) {
    // Bets closed: the entry leaves the screen and the robot waits for its result.
    if (now >= closeAt) {
      return {
        ...common,
        phase: "analyzing",
        phaseStart: closeAt,
        phaseEnd: settled + ROUND_MS,
        wakeAt: Infinity,
        waiting: true,
        reason: "result",
        signal,
      };
    }
    return {
      ...common,
      phase: "signal",
      phaseStart: revealAt,
      phaseEnd: Math.max(revealAt + 1_000, closeAt),
      wakeAt: closeAt,
      waiting: false,
      reason: null,
      signal,
    };
  }
  if (signal) {
    return {
      ...common,
      phase: "analyzing",
      phaseStart: settled,
      phaseEnd: revealAt,
      wakeAt: revealAt,
      waiting: false,
      reason: null,
      signal: null,
    };
  }
  // No entry for the next round (no pattern, too few rounds, or the round came in late).
  return {
    ...common,
    phase: "analyzing",
    phaseStart: settled,
    phaseEnd: settled + ROUND_MS,
    wakeAt: settled + STALE_MS,
    waiting: true,
    reason: rounds.length < MIN_HISTORY ? "collecting" : late ? "next_round" : "no_pattern",
    signal: null,
  };
}

export interface SessionSignal {
  key: string;
  side: Side;
  at: number;
}

/** Signals whose reveal time falls in [from, to], newest first (at most `limit`). */
export function signalsBetween(
  cfg: ScheduleConfig,
  rounds: LiveRound[],
  from: number,
  to: number,
  limit = 60,
): SessionSignal[] {
  const out: SessionSignal[] = [];
  for (let i = rounds.length - 1; i >= 0 && out.length < limit; i--) {
    const r = rounds[i]!;
    if (r.settledAt < cfg.startedAt) break;
    const at = revealTime(r);
    if (at > to) continue;
    if (r.settledAt + ANALYSIS_MS < from) break;
    if (at < from || arrivedLate(r)) continue;
    const signal = signalAfter(rounds, i, cfg.minConfidence);
    if (signal) out.push({ key: r.id, side: signal.side, at });
  }
  return out;
}

/** Merges new signals into the session list: deduped by key, newest first. */
export function mergeSignals(
  existing: SessionSignal[],
  incoming: SessionSignal[],
  limit = 60,
): SessionSignal[] {
  const map = new Map<string, SessionSignal>();
  for (const s of [...existing, ...incoming]) map.set(s.key, s);
  return [...map.values()].sort((a, b) => b.at - a.at).slice(0, limit);
}
