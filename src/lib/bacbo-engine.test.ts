import { describe, expect, it } from "vitest";
import {
  computeStats,
  detectSignal,
  distribution,
  matchPatterns,
  resolveSignal,
  rollRound,
  type Outcome,
  type Round,
} from "./bacbo-engine";

const seq = (s: string) => s.split("") as Outcome[];
const rounds = (s: string): Round[] => seq(s).map((outcome) => ({ p: [1, 1], b: [1, 1], outcome }));

describe("bac bo patterns", () => {
  it("Surf: a run of 3+ follows the trend", () => {
    expect(matchPatterns(seq("BPPP"))[0]).toMatchObject({
      pattern: "Surf de tendência",
      side: "player",
    });
  });

  it("Xadrez 1-1-1: four alternating singles breaks to the opposite side", () => {
    const m = matchPatterns(seq("PBPB")).find((x) => x.pattern === "Xadrez 1-1-1");
    expect(m?.side).toBe("player");
  });

  it("Parzinho 2-2: PP BB P → completes the pair on player", () => {
    const m = matchPatterns(seq("PPBBP")).find((x) => x.pattern === "Parzinho 2-2");
    expect(m?.side).toBe("player");
  });

  it("3-1-3: BBB P BB → completes the banker block", () => {
    const m = matchPatterns(seq("BBBPBB")).find((x) => x.pattern === "3-1-3");
    expect(m).toMatchObject({ side: "banker", confidence: 78 });
  });

  it("ties are skipped when reading runs", () => {
    expect(matchPatterns(seq("BPTPTP"))[0]).toMatchObject({
      pattern: "Surf de tendência",
      side: "player",
    });
  });

  it("no signal below the minimum confidence", () => {
    expect(detectSignal(rounds("BPPP"), 70)).toBeNull();
    expect(detectSignal(rounds("BPPP"), 60)).not.toBeNull();
  });
});

describe("signal resolution (entry + 2 gales, tie covered)", () => {
  it("first round win is GREEN DIRETO", () => {
    expect(resolveSignal("player", seq("P")).result).toBe("green_g0");
  });
  it("win on the second round is G1, third is G2", () => {
    expect(resolveSignal("player", seq("BP")).result).toBe("green_g1");
    expect(resolveSignal("banker", seq("PPB")).result).toBe("green_g2");
  });
  it("a tie counts as green because the tie is covered", () => {
    expect(resolveSignal("banker", seq("PT"))).toMatchObject({ result: "green_g1", tieHit: true });
  });
  it("three losses is RED", () => {
    expect(resolveSignal("player", seq("BBB")).result).toBe("red");
  });
});

describe("stats", () => {
  it("accuracy, streak and gale counts", () => {
    const s = computeStats(["green_g0", "green_g1", "red", "green_g2"]);
    expect(s).toMatchObject({
      total: 4,
      greens: 3,
      accuracy: 75,
      streak: 2,
      g0: 1,
      g1: 1,
      g2: 1,
      reds: 1,
    });
  });
  it("distribution sums to 100 and tie stays between 5 and 15", () => {
    const d = distribution(rounds("PPPPPPPPPPTTTTTTTTTT"));
    expect(d.player + d.banker + d.tie).toBe(100);
    expect(d.tie).toBe(15);
  });
  it("rolls follow dice sums", () => {
    const r = rollRound(() => 0.99);
    expect(r.outcome).toBe("T");
  });
});

describe("tendência da mesa", () => {
  const seq = (s: string) => s.split("") as ("P" | "B" | "T")[];
  it("gives an entry when no classic pattern is formed, following the dominant side", () => {
    const m = matchPatterns(seq("PPBPPBPB"));
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ pattern: "Tendência da mesa", side: "player" });
  });
  it("is not used when a classic pattern exists", () => {
    expect(matchPatterns(seq("BPPP")).map((x) => x.pattern)).not.toContain("Tendência da mesa");
  });
});
