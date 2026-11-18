import { motion } from "framer-motion";
import type { Side, Signal } from "@/lib/bacbo-engine";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const WAVE =
  "M0 14 Q 20 6 40 14 T 80 14 T 120 14 T 160 14 T 200 14 T 240 14 T 280 14 T 320 14 V 40 H 0 Z";

/** Soft, low-contrast water effect — not flashy */
function WaterWave({ isPlayer }: { isPlayer: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] overflow-hidden opacity-70">
      <motion.svg
        viewBox="0 0 320 40"
        preserveAspectRatio="none"
        className={cn(
          "absolute bottom-0 h-full w-[200%]",
          isPlayer ? "fill-player/15" : "fill-banker/15",
        )}
        animate={{ x: ["-50%", "0%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      >
        <path d={WAVE} />
      </motion.svg>

      <motion.svg
        viewBox="0 0 320 40"
        preserveAspectRatio="none"
        className={cn(
          "absolute bottom-0 h-[80%] w-[200%]",
          isPlayer ? "fill-player/22" : "fill-banker/22",
        )}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "linear" }}
      >
        <path d={WAVE} />
      </motion.svg>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t",
          isPlayer ? "from-player/18 to-transparent" : "from-banker/18 to-transparent",
        )}
      />

      {/* Only 2 subtle bubbles */}
      <motion.span
        className={cn(
          "absolute bottom-2 left-[32%] h-1 w-1 rounded-full",
          isPlayer ? "bg-player-glow/40" : "bg-banker-glow/40",
        )}
        animate={{ y: [0, -22], opacity: [0, 0.55, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, delay: 0.4 }}
      />
      <motion.span
        className={cn(
          "absolute bottom-3 left-[58%] h-1 w-1 rounded-full",
          isPlayer ? "bg-player-glow/35" : "bg-banker-glow/35",
        )}
        animate={{ y: [0, -26], opacity: [0, 0.45, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, delay: 1.6 }}
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "relative flex flex-col items-center overflow-hidden rounded-2xl border bg-card px-4 py-4 sm:px-5 sm:py-5",
        isPlayer ? "border-player/40" : "border-banker/40",
      )}
    >
      <WaterWave isPlayer={isPlayer} />

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
