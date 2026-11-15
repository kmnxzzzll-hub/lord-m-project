import { describe, expect, it } from "vitest";
import type { Outcome } from "./bacbo-engine";
import type { LiveRound } from "./live-table";
import {
  clampConfidence,
  clampAnalysisSeconds,
  liveWindow,
  mergeSignals,
  robotView,
  ROUND_MS,
  SIGNAL_HOLD_MS,
  signalsBetween,
  STALE_MS,
  type ScheduleConfig,
} from "./robot-schedule";

const T0 = 1_800_000_000_000;
/** Real-looking rounds, one every ROUND_MS, the last settling at `lastAt`. */
function table(seq: string, lastAt: number): LiveRound[] {
  const out = seq.split("") as Outcome[];
  return out.map((outcome, i) => ({
    id: `r${i}`,
    settledAt: lastAt - (out.length - 1 - i) * ROUND_MS,
    outcome,
    p: [3, 3],
    b: [2, 2],
    pScore: 6,
    bScore: 4,
    multiplier: null,
  }));
}

const cfg: ScheduleConfig = { startedAt: T0, analysisMs: 5_000, minConfidence: 60 };
// Ends in a run of three Jogador wins → "Surf" pattern says Jogador next.
const surf = (lastAt: number) => table("BPBBPPP", lastAt);

describe("robot driven by the real table", () => {
  it("sends no signal while the admin has not switched the robot on", () => {
    const v = robotView(null, surf(T0 + 10_000), T0 + 20_000);
    expect(v.phase).toBe("off");
    expect(v.signal).toBeNull();
  });

  it("waits for a fresh table round after being switched on", () => {
    const v = robotView(cfg, surf(T0 - 1_000), T0 + 2_000);
    expect(v.phase).toBe("analyzing");
    expect(v.waiting).toBe(true);
    expect(v.signal).toBeNull();
  });

  it("analyzes for the analysis time after a round settles, then reveals the signal", () => {
    const at = T0 + 60_000;
    const rounds = surf(at);
    expect(robotView(cfg, rounds, at + 4_000).phase).toBe("analyzing");
    const v = robotView(cfg, rounds, at + 5_000);
    expect(v.phase).toBe("signal");
    expect(v.signal?.side).toBe("player");
    expect(v.key).toBe("r6");
  });

  it("drops the signal if no new round arrives in time", () => {
    const at = T0 + 60_000;
    const v = robotView(cfg, surf(at), at + SIGNAL_HOLD_MS + 1);
    expect(v.phase).toBe("analyzing");
    expect(v.signal).toBeNull();
  });

  it("waits when the table has been quiet for two minutes", () => {
    const at = T0 + 60_000;
    const v = robotView(cfg, surf(at), at + STALE_MS + 1);
    expect(v.waiting).toBe(true);
    expect(v.signal).toBeNull();
  });

  it("every user gets the same signal from the same rounds", () => {
    const at = T0 + 60_000;
    const a = robotView(cfg, surf(at), at + 6_000);
    const b = robotView({ ...cfg }, surf(at), at + 6_000);
    expect(a.signal).toEqual(b.signal);
  });

  it("keeps the analysis time between 2 and 10 seconds", () => {
    expect(clampAnalysisSeconds(15)).toBe(10);
    expect(clampAnalysisSeconds(1)).toBe(2);
    expect(clampAnalysisSeconds(5)).toBe(5);
  });

  it("session history only includes signals revealed after the user signed in", () => {
    const at = T0 + 300_000;
    const rounds = table("PPPPPPPPPP", at);
    const signIn = at - 2 * ROUND_MS;
    const list = signalsBetween(cfg, rounds, signIn, at + 6_000);
    expect(list.map((s) => s.key)).toEqual(["r9", "r8", "r7"]);
    for (const s of list) expect(s.at).toBeGreaterThanOrEqual(signIn);
  });

  it("shows the robot as disconnected when the table has sent nothing", () => {
    const v = robotView(cfg, [], T0 + 5_000);
    expect(v.reason).toBe("no_connection");
    expect(v.signal).toBeNull();
  });

  it("needs at least 5 past real rounds before sending a signal", () => {
    const at = T0 + 60_000;
    const four = table("PPPP", at);
    const v = robotView(cfg, four, at + 6_000);
    expect(v.signal).toBeNull();
    expect(v.reason).toBe("collecting");
    expect(robotView(cfg, table("BPPPP", at), at + 6_000).phase).not.toBe("off");
  });

  it("hides rounds from an old connection", () => {
    const at = T0 + 60_000;
    expect(liveWindow(surf(at), at + STALE_MS + 1)).toEqual([]);
    const old = table("PPP", at - 271 * 60_000);
    const fresh = surf(at).map((r) => ({ ...r, id: `n${r.id}` }));
    expect(liveWindow([...old, ...fresh], at + 1_000)).toHaveLength(fresh.length);
  });

  it("merging keeps one entry per signal, newest first", () => {
    const a = { key: "x:1", side: "player" as const, at: 1 };
    const b = { key: "x:2", side: "banker" as const, at: 2 };
    expect(mergeSignals([a], [a, b])).toEqual([b, a]);
  });
});

describe("clampConfidence", () => {
  it("caps the strength at 75 so a high setting cannot stop all signals", () => {
    expect(clampConfidence(80)).toBe(75);
    expect(clampConfidence(90)).toBe(75);
  });
  it("keeps 70 as is and raises very low values to 55", () => {
    expect(clampConfidence(70)).toBe(70);
    expect(clampConfidence(40)).toBe(55);
  });
});
