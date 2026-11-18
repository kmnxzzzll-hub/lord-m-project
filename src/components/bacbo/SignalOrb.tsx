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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative flex flex-col items-center overflow-hidden rounded-2xl border bg-card px-4 py-5 sm:px-5 sm:py-6",
        isPlayer ? "border-player/50" : "border-banker/50",
      )}
    >
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20",
          isPlayer ? "bg-player/15" : "bg-banker/15",
        )}
      >
        <div
          className={cn(
            "h-11 w-11 rounded-full sm:h-14 sm:w-14",
            isPlayer ? "ball-player" : "ball-banker",
          )}
        />
      </div>

      <h2
        className={cn(
          "mt-3 font-display text-2xl font-extrabold tracking-[0.12em] sm:mt-4 sm:text-3xl",
          isPlayer ? "text-player-glow" : "text-banker-glow",
        )}
      >
        {isPlayer ? "PLAYER" : "BANKER"}
      </h2>

      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Aposte agora · <span className="tabular-nums text-foreground">{secondsLeft}s</span>
      </p>

      <div className="mt-2 h-1 w-28 overflow-hidden rounded-full bg-muted sm:w-32">
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
