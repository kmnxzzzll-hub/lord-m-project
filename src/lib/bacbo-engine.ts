/**
 * Bac Bo pattern engine.
 * Rounds: each side rolls two dice; higher sum wins, equal sums = tie (empate).
 * Patterns follow the classic Bac Bo strategy playbook:
 *  - Xadrez (1-1-1), Surf (tendência longa), Parzinho (2-2), 3-1-3, Rampa
 *  - Tendência da mesa: when no classic pattern is formed, follow the side that dominates
 *    the last rounds, so the robot has an entry ready for every round
 *  - Proteção de empate (sinaliza cobertura reforçada)
 */

export type Outcome = "P" | "B" | "T";
export type Side = "player" | "banker";
export type SignalResult = "green_g0" | "green_g1" | "green_g2" | "red";

export interface Round {
  p: [number, number];
  b: [number, number];
  outcome: Outcome;
}

export interface Run {
  side: "P" | "B";
  len: number;
}

export interface PatternMatch {
  side: Side;
  pattern: string;
  confidence: number;
}

export interface Signal extends PatternMatch {
  tieAlert: boolean;
}

const die = (rng: () => number) => 1 + Math.floor(rng() * 6);

export function rollRound(rng: () => number = Math.random): Round {
  const p: [number, number] = [die(rng), die(rng)];
  const b: [number, number] = [die(rng), die(rng)];
  const ps = p[0] + p[1];
  const bs = b[0] + b[1];
  return { p, b, outcome: ps > bs ? "P" : bs > ps ? "B" : "T" };
}

export function seedHistory(n = 40, rng: () => number = Math.random): Round[] {
  return Array.from({ length: n }, () => rollRound(rng));
}

const toSide = (o: "P" | "B"): Side => (o === "P" ? "player" : "banker");
const opposite = (o: "P" | "B"): "P" | "B" => (o === "P" ? "B" : "P");

/** Groups non-tie outcomes into runs, oldest first. The last run may still be growing. */
export function toRuns(outcomes: Outcome[]): Run[] {
  const runs: Run[] = [];
  for (const o of outcomes) {
    if (o === "T") continue;
    const last = runs[runs.length - 1];
    if (last && last.side === o) last.len += 1;
    else runs.push({ side: o, len: 1 });
  }
  return runs;
}

/** Every pattern that currently matches, strongest first. */
export function matchPatterns(outcomes: Outcome[]): PatternMatch[] {
  const runs = toRuns(outcomes);
  const n = runs.length;
  const matches: PatternMatch[] = [];
  if (n === 0) return matches;
  const cur = runs[n - 1]!;
  const at = (i: number) => runs[n - 1 - i]!; // 0 = current run

  // Surf: current run of 3+ → follow the trend
  if (cur.len >= 3) {
    matches.push({
      side: toSide(cur.side),
      pattern: "Surf de tendência",
      confidence: Math.min(88, 62 + (cur.len - 3) * 6),
    });
  }

  // Xadrez 1-1-1: 4+ alternating singles → break to the opposite side
  let singles = 0;
  for (let i = 0; i < n && at(i).len === 1; i++) singles++;
  if (singles >= 4) {
    matches.push({
      side: toSide(opposite(cur.side)),
      pattern: "Xadrez 1-1-1",
      confidence: Math.min(88, 64 + (singles - 4) * 5),
    });
  }

  // Parzinho 2-2
  if (n >= 3 && at(1).len === 2 && at(2).len === 2) {
    if (cur.len === 1) {
      matches.push({ side: toSide(cur.side), pattern: "Parzinho 2-2", confidence: 72 });
    } else if (cur.len === 2) {
      matches.push({ side: toSide(opposite(cur.side)), pattern: "Parzinho 2-2", confidence: 70 });
    }
  }

  // 3-1-3: AAA B A(A) → complete the third block
  if (n >= 3 && at(2).len === 3 && at(1).len === 1 && cur.side === at(2).side && cur.len < 3) {
    matches.push({
      side: toSide(cur.side),
      pattern: "3-1-3",
      confidence: cur.len === 2 ? 78 : 74,
    });
  }

  // Rampa: completed runs growing a, a+1, a+2 → current run keeps climbing
  if (n >= 4) {
    const a = at(3).len;
    if (at(2).len === a + 1 && at(1).len === a + 2 && cur.len < a + 3) {
      matches.push({ side: toSide(cur.side), pattern: "Rampa", confidence: 70 });
    }
  }

  // Tendência da mesa: fallback reading of the last 8 decided rounds.
  if (matches.length === 0) {
    const recent = outcomes.filter((o) => o !== "T").slice(-TREND_WINDOW);
    const p = recent.filter((o) => o === "P").length;
    const b = recent.length - p;
    const side = p === b ? cur.side : p > b ? "P" : "B";
    matches.push({ side: toSide(side), pattern: "Tendência da mesa", confidence: 60 });
  }

  return matches.sort((x, y) => y.confidence - x.confidence);
}

/** Decided rounds the fallback trend reading looks at. */
export const TREND_WINDOW = 8;

/** Tie protection: long drought or a very recent tie means cover the tie with extra care. */
export function tieAlert(outcomes: Outcome[]): boolean {
  const lastTie = outcomes.lastIndexOf("T");
  const since = lastTie === -1 ? outcomes.length : outcomes.length - 1 - lastTie;
  return since >= 12 || since <= 2;
}

export function detectSignal(history: Round[], minConfidence: number): Signal | null {
  const outcomes = history.map((r) => r.outcome);
  const best = matchPatterns(outcomes)[0];
  if (!best || best.confidence < minConfidence) return null;
  return { ...best, tieAlert: tieAlert(outcomes) };
}

/**
 * Resolves an entry against the next rounds: up to 3 attempts (entry + 2 gales).
 * A tie counts as green because the tie is always covered.
 */
export function resolveAttempt(side: Side, outcome: Outcome): "win" | "tie" | "loss" {
  if (outcome === "T") return "tie";
  return toSide(outcome) === side ? "win" : "loss";
}

export function resultFor(attemptIndex: number, won: boolean): SignalResult {
  if (!won) return "red";
  return (["green_g0", "green_g1", "green_g2"] as const)[attemptIndex] ?? "green_g2";
}

export function resolveSignal(
  side: Side,
  next: Outcome[],
): { result: SignalResult; tieHit: boolean; used: number } {
  for (let i = 0; i < Math.min(3, next.length); i++) {
    const r = resolveAttempt(side, next[i]!);
    if (r !== "loss") return { result: resultFor(i, true), tieHit: r === "tie", used: i + 1 };
  }
  return { result: "red", tieHit: false, used: Math.min(3, next.length) };
}

/** Display distribution for Jogador / Casa / Empate, from recent frequency plus the active pattern. */
export function distribution(history: Round[], match?: PatternMatch | null) {
  const recent = history.slice(-20);
  const total = recent.length || 1;
  let p = recent.filter((r) => r.outcome === "P").length / total;
  let b = recent.filter((r) => r.outcome === "B").length / total;
  let t = recent.filter((r) => r.outcome === "T").length / total;
  t = Math.min(0.15, Math.max(0.05, t));
  if (match) {
    const boost = (match.confidence - 50) / 100;
    if (match.side === "player") p += boost;
    else b += boost;
  }
  const rest = 1 - t;
  const sum = p + b || 1;
  const player = Math.round((p / sum) * rest * 100);
  const tie = Math.round(t * 100);
  return { player, banker: 100 - player - tie, tie };
}

export interface DayStats {
  total: number;
  greens: number;
  accuracy: number;
  streak: number;
  g0: number;
  g1: number;
  g2: number;
  reds: number;
}

/** results ordered newest first */
export function computeStats(results: SignalResult[]): DayStats {
  const g0 = results.filter((r) => r === "green_g0").length;
  const g1 = results.filter((r) => r === "green_g1").length;
  const g2 = results.filter((r) => r === "green_g2").length;
  const reds = results.filter((r) => r === "red").length;
  const greens = g0 + g1 + g2;
  let streak = 0;
  for (const r of results) {
    if (r === "red") break;
    streak++;
  }
  return {
    total: results.length,
    greens,
    accuracy: results.length ? Math.round((greens / results.length) * 100) : 0,
    streak,
    g0,
    g1,
    g2,
    reds,
  };
}

export const RESULT_LABEL: Record<SignalResult, string> = {
  green_g0: "GREEN DIRETO",
  green_g1: "GREEN G1",
  green_g2: "GREEN G2",
  red: "RED",
};
