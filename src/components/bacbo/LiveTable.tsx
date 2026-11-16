import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import { Ball, outcomeKind, outcomeLabel } from "@/components/bacbo/Ball";
import type { LiveRound } from "@/lib/live-table";
import { cn } from "@/lib/utils";

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function DieFace({
  value,
  tone,
  size = 26,
}: {
  value: number;
  tone: "player" | "banker";
  size?: number;
}) {
  const on = PIPS[value] ?? [];
  return (
    <span
      aria-label={`${value}`}
      className={cn(
        "grid grid-cols-3 grid-rows-3 place-items-center rounded-[26%] bg-card/90 p-[14%] ring-1",
        tone === "player" ? "ring-player-glow/45" : "ring-banker-glow/45",
      )}
      style={{ width: size, height: size }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-[70%] w-[70%] rounded-full",
            on.includes(i) && (tone === "player" ? "bg-player-glow" : "bg-banker-glow"),
          )}
        />
      ))}
    </span>
  );
}

function SideDice({ round, side }: { round: LiveRound | null; side: "player" | "banker" }) {
  const isPlayer = side === "player";
  const dice = round ? (isPlayer ? round.p : round.b) : [0, 0];
  const score = round ? (isPlayer ? round.pScore : round.bScore) : 0;
  const won = !!round && round.outcome === (isPlayer ? "P" : "B");
  return (
    <div className={cn("flex flex-col gap-1", isPlayer ? "items-start" : "items-end")}>
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.2em]",
          isPlayer ? "text-player-glow" : "text-banker-glow",
        )}
      >
        {isPlayer ? "Player" : "Banker"}
      </span>
      <div className={cn("flex items-center gap-1.5", !isPlayer && "flex-row-reverse")}>
        <DieFace value={dice[0] ?? 0} tone={side} />
        <DieFace value={dice[1] ?? 0} tone={side} />
        <span
          className={cn(
            "font-display text-xl font-extrabold tabular-nums sm:text-2xl",
            won ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {score}
        </span>
      </div>
    </div>
  );
}

/** Último resultado ao vivo da mesa. */
export function LiveTableCard({ rounds }: { rounds: LiveRound[] }) {
  const last = rounds[rounds.length - 1] ?? null;

  return (
    <div className="liquid-glass rounded-[1.5rem] p-3.5 sm:p-4">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.18em]">
          <Radio className={cn("h-3.5 w-3.5", last ? "text-success" : "text-muted-foreground")} />
          Mesa ao vivo
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-semibold",
            last ? "text-success" : "text-destructive",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              last ? "bg-success shadow-[0_0_8px_var(--success)]" : "bg-destructive",
            )}
          />
          {last ? "Conectada" : "Sem conexão"}
        </span>
      </div>

      <motion.div
        key={last?.id ?? "none"}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 flex items-end justify-between gap-2"
      >
        <SideDice round={last} side="player" />
        {last ? (
          <Ball
            kind={outcomeKind(last.outcome)}
            label={outcomeLabel(last.outcome)}
            size={30}
            className="mb-0.5"
          />
        ) : (
          <span className="mb-1 font-display text-sm font-bold text-muted-foreground">×</span>
        )}
        <SideDice round={last} side="banker" />
      </motion.div>
      {last?.outcome === "T" && last.multiplier && (
        <p className="mt-2 text-center text-[11px] font-semibold text-tie-glow">
          Tie pagou {last.multiplier}x
        </p>
      )}
    </div>
  );
}
