import { motion } from "framer-motion";
import type { Side, Signal } from "@/lib/bacbo-engine";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const BUBBLES: [number, number, number, number][] = [
  [18, 10, 3.2, 0],
  [62, 6, 2.6, 0.7],
  [38, 14, 3.8, 1.4],
  [78, 8, 2.9, 2.1],
  [8, 7, 3.4, 2.8],
  [50, 11, 3.1, 0.35],
];

function BubbleColumn({ side, isPlayer }: { side: "left" | "right"; isPlayer: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 w-[26%] overflow-hidden",
        side === "left" ? "left-0" : "right-0",
      )}
      style={{
        maskImage: "linear-gradient(to top, transparent, black 18%, black 70%, transparent)",
        WebkitMaskImage: "linear-gradient(to top, transparent, black 18%, black 70%, transparent)",
      }}
    >
      {BUBBLES.map(([left, size, duration, delay], i) => (
        <motion.span
          key={i}
          className={cn(
            "absolute bottom-0 rounded-full border",
            isPlayer ? "border-player-glow/50 bg-player/25" : "border-banker-glow/50 bg-banker/25",
          )}
          style={{
            left: `${side === "left" ? left : 100 - left - 10}%`,
            width: size,
            height: size,
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: [0, -220],
            x: [0, i % 2 ? 6 : -6, 0],
            opacity: [0, 0.9, 0],
            scale: [0.6, 1, 1.1],
          }}
          transition={{ duration, delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
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
      initial={{ opacity: 0, scale: 0.85, y: -24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 260, damping: 16 }}
      className="glass relative flex flex-col items-center overflow-hidden rounded-[1.75rem] px-5 py-6 sm:px-6 sm:py-9"
    >
      <motion.span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[1.75rem] border-2",
          isPlayer ? "border-player" : "border-banker",
        )}
        initial={{ opacity: 0.9, scale: 0.96 }}
        animate={{ opacity: 0, scale: 1.04 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />
      <BubbleColumn side="left" isPlayer={isPlayer} />
      <BubbleColumn side="right" isPlayer={isPlayer} />

      <div className="relative flex h-36 w-36 items-center justify-center sm:h-44 sm:w-44">
        <motion.span
          className={cn(
            "absolute inset-3 rounded-full blur-2xl",
            isPlayer ? "bg-player/50" : "bg-banker/50",
          )}
          animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          initial={{ scale: 0.2, rotate: -40 }}
          animate={{ scale: 1, rotate: 0, y: [0, -6, 0] }}
          transition={{
            scale: { type: "spring", stiffness: 200, damping: 14 },
            rotate: { duration: 0.6 },
            y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          }}
          className={cn(
            "relative h-28 w-28 rounded-full sm:h-36 sm:w-36",
            isPlayer ? "ball-player" : "ball-banker",
          )}
        >
          <span className="absolute left-[20%] top-[12%] h-[24%] w-[38%] rounded-full bg-foreground/40 blur-[4px]" />
        </motion.div>
      </div>
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={cn(
          "relative mt-4 font-display text-3xl font-extrabold tracking-[0.12em] sm:mt-6 sm:text-4xl",
          isPlayer ? "text-player-glow" : "text-banker-glow",
        )}
      >
        {isPlayer ? "PLAYER" : "BANKER"}
      </motion.h2>
      <p className="relative mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:mt-4">
        Aposte agora · <span className="tabular-nums text-foreground">{secondsLeft}s</span>
      </p>
      <div className="relative mt-2 h-1 w-32 overflow-hidden rounded-full bg-muted sm:w-40">
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
