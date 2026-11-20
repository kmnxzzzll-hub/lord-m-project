import { motion } from "framer-motion";
import type { Side, Signal } from "@/lib/bacbo-engine";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/** Slightly more geometric / cube-like wave with higher amplitude */
const WAVE =
  "M0 18 C 12 6, 28 6, 40 18 C 52 30, 68 30, 80 18 C 92 6, 108 6, 120 18 C 132 30, 148 30, 160 18 C 172 6, 188 6, 200 18 C 212 30, 228 30, 240 18 C 252 6, 268 6, 280 18 C 292 30, 308 30, 320 18 V 40 H 0 Z";

/** Single decorative water layer: low without a signal, raised when a signal is shown. */
export function WaterWave({
  side,
  raised = false,
}: {
  side?: Side;
  raised?: boolean;
}) {
  const fill = side === "player"
    ? "fill-player/22"
    : side === "banker"
      ? "fill-banker/22"
      : "fill-muted-foreground/12";
  const gradient = side === "player"
    ? "from-player/22"
    : side === "banker"
      ? "from-banker/22"
      : "from-muted-foreground/10";

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
      initial={{ height: "16%", opacity: 0.4 }}
      animate={{
        height: raised ? "78%" : "16%",
        opacity: raised ? 0.88 : 0.4,
      }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.svg
        viewBox="0 0 320 40"
        preserveAspectRatio="none"
        className={cn("absolute bottom-0 h-full w-[220%]", fill)}
        animate={{ x: ["-50%", "0%"] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "linear" }}
      >
        <path d={WAVE} />
      </motion.svg>
      <motion.svg
        viewBox="0 0 320 40"
        preserveAspectRatio="none"
        className={cn("absolute bottom-0 h-[85%] w-[220%] opacity-70", fill)}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      >
        <path d={WAVE} />
      </motion.svg>
      <div className={cn("absolute inset-0 bg-gradient-to-t to-transparent", gradient)} />
    </motion.div>
  );
}

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
  // Display only (seconds + bar); the signal window itself is driven by the robot schedule.
  const now = useNow(1000);
  const isPlayer = side === "player";
  const left = Math.max(0, Math.min(1, (phaseEnd - now) / (phaseEnd - phaseStart)));
  const secondsLeft = Math.max(0, Math.ceil((phaseEnd - now) / 1000));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "relative flex flex-col items-center overflow-hidden rounded-2xl border bg-card px-4 py-4 sm:px-5 sm:py-5",
        isPlayer ? "border-player/40" : "border-banker/40",
      )}
    >
      <WaterWave side={side} raised />

      <div className="relative z-10 flex flex-col items-center">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full sm:h-14 sm:w-14",
            isPlayer ? "bg-player/12" : "bg-banker/12",
          )}
        >
          <div
            className={cn(
              "h-8 w-8 rounded-full sm:h-9 sm:w-9",
              isPlayer ? "ball-player" : "ball-banker",
            )}
          />
        </div>

        <h2
          className={cn(
            "mt-2.5 font-display text-xl font-extrabold tracking-[0.12em] sm:text-2xl",
            isPlayer ? "text-player-glow" : "text-banker-glow",
          )}
        >
          {isPlayer ? "PLAYER" : "BANKER"}
        </h2>

        <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Aposte agora · <span className="tabular-nums text-foreground">{secondsLeft}s</span>
        </p>

        <div className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-muted sm:w-28">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear",
              isPlayer ? "bg-player-glow" : "bg-banker-glow",
            )}
            style={{ width: `${left * 100}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
