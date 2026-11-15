import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import { Ball, outcomeKind, outcomeLabel } from "@/components/bacbo/Ball";
import type { LiveRound } from "@/lib/live-table";
import { useNow } from "@/lib/use-now";
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
        "grid grid-cols-3 grid-rows-3 place-items-center rounded-[26%] bg-card p-[14%] ring-1",
        tone === "player" ? "ring-player-glow/50" : "ring-banker-glow/50",
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

function SideDice({ round, side }: { round: LiveRound; side: "player" | "banker" }) {
  const isPlayer = side === "player";
  const dice = isPlayer ? round.p : round.b;
  const score = isPlayer ? round.pScore : round.bScore;
  const won = round.outcome === (isPlayer ? "P" : "B");
  return (
    <div className={cn("flex flex-col gap-1", isPlayer ? "items-start" : "items-end")}>
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.2em]",
          isPlayer ? "text-player-glow" : "text-banker-glow",
        )}
      >
        {isPlayer ? "Jogador" : "Casa"}
      </span>
      <div className={cn("flex items-center gap-1.5", !isPlayer && "flex-row-reverse")}>
        <DieFace value={dice[0]} tone={side} />
        <DieFace value={dice[1]} tone={side} />
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

function ago(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `há ${s}s` : `há ${Math.floor(s / 60)} min`;
}

/** Last real result at the table, its dice, and the recent road. */
export function LiveTableCard({
  rounds,
  clockOffset,
  error,
}: {
  rounds: LiveRound[];
  clockOffset: number;
  error: boolean;
}) {
  const now = useNow(1000) + clockOffset;
  const last = rounds[rounds.length - 1];
  const fresh = !!last && now - last.settledAt < 90_000;
  const road = rounds.slice(-14);

  return (
    <div className="glass rounded-[1.5rem] p-3.5 sm:p-4">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.2em]">
          <Radio className={cn("h-3.5 w-3.5", fresh ? "text-success" : "text-muted-foreground")} />
          Mesa ao vivo
        </span>
        <span className="tabular-nums">
          {error && !last
            ? "Sem conexão"
            : last
              ? `Última rodada ${ago(now - last.settledAt)}`
              : "Conectando…"}
        </span>
      </div>

      {last ? (
        <>
          <motion.div
            key={last.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-end justify-between gap-2"
          >
            <SideDice round={last} side="player" />
            <Ball
              kind={outcomeKind(last.outcome)}
              label={outcomeLabel(last.outcome)}
              size={30}
              className="mb-0.5"
            />
            <SideDice round={last} side="banker" />
          </motion.div>
          {last.outcome === "T" && last.multiplier && (
            <p className="mt-2 text-center text-[11px] font-semibold text-tie-glow">
              Empate pagou {last.multiplier}x
            </p>
          )}
          <div className="mt-3 flex items-center justify-end gap-1 overflow-hidden border-t border-border/60 pt-3">
            {road.map((r) => (
              <Ball
                key={r.id}
                kind={outcomeKind(r.outcome)}
                label={outcomeLabel(r.outcome)}
                size={18}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {error
            ? "Não foi possível ler a mesa agora. Tentando de novo…"
            : "Buscando as rodadas da mesa…"}
        </p>
      )}
    </div>
  );
}
