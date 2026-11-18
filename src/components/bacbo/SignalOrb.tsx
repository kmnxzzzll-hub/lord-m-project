import { motion } from "framer-motion";
import type { Side, Signal } from "@/lib/bacbo-engine";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

export function SignalOrb({
  side,
  signal: _signal,
  phaseStart,
  phaseEnd,
}: {
  side: Side;
  signal?: Signal | null;
  phaseStart: number;
  phaseEnd: number;
}) {
  const now = useNow(250);
  const isPlayer = side === "player";
  const left = Math.max(0, Math.min(1, (phaseEnd - now) / (phaseEnd - phaseStart)));
  const secondsLeft = Math.max(0, Math.ceil((phaseEnd - now) / 1000));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22 }}
      className={cn(
        "relative flex flex-col items-center overflow-hidden rounded-2xl border bg-card px-5 py-6 sm:px-6 sm:py-9",
        isPlayer ? "border-player/50" : "border-banker/50",
      )}
    >
      <div
        className={cn(
          "flex h-28 w-28 items-center justify-center rounded-full sm:h-36 sm:w-36",
          isPlayer ? "bg-player/20" : "bg-banker/20",
        )}
      >
        <div
          className={cn(
            "h-20 w-20 rounded-full sm:h-28 sm:w-28",
            isPlayer ? "ball-player" : "ball-banker",
          )}
        />
      </div>

      <h2
        className={cn(
          "mt-4 font-display text-3xl font-extrabold tracking-[0.12em] sm:mt-6 sm:text-4xl",
          isPlayer ? "text-player-glow" : "text-banker-glow",
        )}
      >
        {isPlayer ? "PLAYER" : "BANKER"}
      </h2>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:mt-4">
        Aposte agora · <span className="tabular-nums text-foreground">{secondsLeft}s</span>
      </p>

      <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-muted sm:w-40">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-linear",
            isPlayer ? "bg-player-glow" : "bg-banker-glow",
          )}
          style={{ width: `${left * 100}%` }}
        />
      </div>
    </motion.div>
  );
}
