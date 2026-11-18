import { motion } from "framer-motion";
import type { Side, Signal } from "@/lib/bacbo-engine";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const WAVE =
  "M0 12 Q 20 2 40 12 T 80 12 T 120 12 T 160 12 T 200 12 T 240 12 T 280 12 T 320 12 V 40 H 0 Z";

function WaterWave({ isPlayer }: { isPlayer: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] overflow-hidden">
      {/* Back wave */}
      <motion.svg
        viewBox="0 0 320 40"
        preserveAspectRatio="none"
        className={cn(
          "absolute bottom-0 h-full w-[200%]",
          isPlayer ? "fill-player/25" : "fill-banker/25",
        )}
        animate={{ x: ["-50%", "0%"] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
      >
        <path d={WAVE} />
      </motion.svg>

      {/* Front wave */}
      <motion.svg
        viewBox="0 0 320 40"
        preserveAspectRatio="none"
        className={cn(
          "absolute bottom-0 h-[85%] w-[200%]",
          isPlayer ? "fill-player/40" : "fill-banker/40",
        )}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
      >
        <path d={WAVE} />
      </motion.svg>

      {/* Soft liquid body */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t",
          isPlayer ? "from-player/35 to-transparent" : "from-banker/35 to-transparent",
        )}
      />

      {/* Light bubbles */}
      <motion.span
        className={cn(
          "absolute bottom-3 left-[28%] h-1.5 w-1.5 rounded-full",
          isPlayer ? "bg-player-glow/70" : "bg-banker-glow/70",
        )}
        animate={{ y: [0, -36], opacity: [0, 0.9, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, delay: 0.2 }}
      />
      <motion.span
        className={cn(
          "absolute bottom-2 left-[62%] h-1 w-1 rounded-full",
          isPlayer ? "bg-player-glow/60" : "bg-banker-glow/60",
        )}
        animate={{ y: [0, -44], opacity: [0, 0.8, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, delay: 1.1 }}
      />
      <motion.span
        className={cn(
          "absolute bottom-4 left-[46%] h-1.5 w-1.5 rounded-full",
          isPlayer ? "bg-player-glow/50" : "bg-banker-glow/50",
        )}
        animate={{ y: [0, -30], opacity: [0, 0.7, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, delay: 0.7 }}
      />
    </div>
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
      {/* Wave / water effect only when signal is confirmed */}
      <WaterWave isPlayer={isPlayer} />

      <div className="relative z-10 flex flex-col items-center">
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
      </div>
    </motion.div>
  );
}
