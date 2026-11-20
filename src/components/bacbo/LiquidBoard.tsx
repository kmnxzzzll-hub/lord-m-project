import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Slightly more geometric / cube-like wave with higher amplitude */
const WAVE =
  "M0 18 C 12 6, 28 6, 40 18 C 52 30, 68 30, 80 18 C 92 6, 108 6, 120 18 C 132 30, 148 30, 160 18 C 172 6, 188 6, 200 18 C 212 30, 228 30, 240 18 C 252 6, 268 6, 280 18 C 292 30, 308 30, 320 18 V 40 H 0 Z";

/** Soft, low-cost water effect (SVG + gradient only — no heavy backdrop-blur) */
function WaterWave({
  tone,
  active,
  raised = false,
}: {
  tone: "player" | "banker" | "tie";
  active: boolean;
  raised?: boolean;
}) {
  const fill =
    tone === "player"
      ? "fill-player/15"
      : tone === "banker"
        ? "fill-banker/15"
        : "fill-tie/15";
  const fillStrong =
    tone === "player"
      ? "fill-player/22"
      : tone === "banker"
        ? "fill-banker/22"
        : "fill-tie/22";
  const from =
    tone === "player"
      ? "from-player/18"
      : tone === "banker"
        ? "from-banker/18"
        : "from-tie/18";
  const bubble =
    tone === "player"
      ? "bg-player-glow/40"
      : tone === "banker"
        ? "bg-banker-glow/40"
        : "bg-tie-glow/40";

  const height = raised ? "h-[68%]" : active ? "h-[52%]" : "h-[38%]";

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden transition-all duration-500",
        height,
        active ? "opacity-90" : "opacity-55",
      )}
    >
      <motion.svg
        viewBox="0 0 320 40"
        preserveAspectRatio="none"
        className={cn("absolute bottom-0 h-full w-[200%]", fill)}
        animate={{ x: ["-50%", "0%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      >
        <path d={WAVE} />
      </motion.svg>

      <motion.svg
        viewBox="0 0 320 40"
        preserveAspectRatio="none"
        className={cn("absolute bottom-0 h-[80%] w-[200%]", fillStrong)}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "linear" }}
      >
        <path d={WAVE} />
      </motion.svg>

      <div className={cn("absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t to-transparent", from)} />

      {/* Only 2 subtle bubbles — cheap */}
      <motion.span
        className={cn("absolute bottom-1.5 left-[28%] h-1.5 w-1.5 rounded-full", bubble)}
        animate={{ y: [0, -22], opacity: [0, 0.55, 0] }}
        transition={{ duration: 3.1, repeat: Infinity, delay: 0.3 }}
      />
      <motion.span
        className={cn("absolute bottom-2 left-[62%] h-1.5 w-1.5 rounded-full", bubble)}
        animate={{ y: [0, -26], opacity: [0, 0.45, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, delay: 1.4 }}
      />
    </div>
  );
}

function SideCard({
  tone,
  label,
  value,
  highlight,
}: {
  tone: "player" | "banker";
  label: string;
  value: number | null;
  highlight: boolean;
}) {
  const isPlayer = tone === "player";

  return (
    <motion.div
      layout
      animate={{
        y: highlight ? -6 : 0,
        scale: highlight ? 1.04 : 1,
      }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={cn(
        "relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border bg-card/90 px-3 py-2.5 sm:px-3.5 sm:py-3",
        isPlayer ? "rounded-l-[1.15rem] rounded-r-xl" : "rounded-r-[1.15rem] rounded-l-xl",
        highlight
          ? isPlayer
            ? "border-player/55 ring-2 ring-player/35 shadow-[0_0_24px_-6px_var(--player)]"
            : "border-banker/55 ring-2 ring-banker/35 shadow-[0_0_24px_-6px_var(--banker)]"
          : "border-border",
      )}
    >
      <WaterWave tone={tone} active={highlight || value !== null} raised={highlight} />

      <span
        className={cn(
          "relative z-10 text-[9px] font-semibold uppercase tracking-[0.16em] sm:text-[10px]",
          isPlayer ? "text-player-glow" : "text-banker-glow",
        )}
      >
        {label}
      </span>

      <div className={cn("relative z-10 mt-1.5", isPlayer ? "text-left" : "text-right")}>
        <span className="font-display text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl">
          {value === null ? "--" : `${value}%`}
        </span>
      </div>

      <div
        className={cn(
          "relative z-10 mt-1.5 h-0.5 w-7 rounded-full sm:w-8",
          isPlayer ? "bg-player" : "bg-banker",
          !isPlayer && "ml-auto",
          highlight && "opacity-100",
        )}
      />
    </motion.div>
  );
}

export function LiquidBoard({
  dist,
  winner,
}: {
  dist: { player: number; banker: number; tie: number; sampleSize: number } | null;
  winner?: "player" | "banker" | null;
}) {
  const active = dist !== null;

  return (
    <div className="space-y-1">
      <div className="relative h-24 sm:h-28 lg:h-32">
        <div className="absolute inset-y-0 left-0 w-[47%]">
          <SideCard
            tone="player"
            label="Player"
            value={dist?.player ?? null}
            highlight={winner === "player"}
          />
        </div>

        <div className="absolute inset-y-0 right-0 w-[47%]">
          <SideCard
            tone="banker"
            label="Banker"
            value={dist?.banker ?? null}
            highlight={winner === "banker"}
          />
        </div>

        {/* Center Tie card */}
        <motion.div
          layout
          animate={{
            y: winner ? 2 : 0,
            scale: winner ? 0.96 : 1,
          }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className={cn(
            "absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center overflow-hidden rounded-xl border bg-card/95 shadow-sm sm:h-20 sm:w-20",
            winner ? "border-border/60 opacity-80" : "border-border",
            active && !winner && "ring-1 ring-tie/20",
          )}
        >
          <WaterWave tone="tie" active={active} />

          <span className="relative z-10 text-[8px] font-semibold uppercase tracking-[0.16em] text-tie-glow sm:text-[9px]">
            Tie
          </span>
          <span className="relative z-10 mt-0.5 font-display text-lg font-extrabold tabular-nums sm:text-xl">
            {active ? `${dist!.tie}%` : "--"}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
