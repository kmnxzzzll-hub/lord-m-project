import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Soft geometric wave */
const WAVE =
  "M0 18 C 12 6, 28 6, 40 18 C 52 30, 68 30, 80 18 C 92 6, 108 6, 120 18 C 132 30, 148 30, 160 18 C 172 6, 188 6, 200 18 C 212 30, 228 30, 240 18 C 252 6, 268 6, 280 18 C 292 30, 308 30, 320 18 V 40 H 0 Z";

/** Water effect that scales with the percentage value */
function WaterWave({
  tone,
  value,
  highlight = false,
}: {
  tone: "player" | "banker" | "tie";
  value: number | null;
  highlight?: boolean;
}) {
  const pct = value ?? 0;

  // Height scales with the number (min 28%, max 78%)
  const heightPct = 28 + Math.min(50, (pct / 100) * 50);
  const opacity = 0.35 + Math.min(0.45, (pct / 100) * 0.45);

  const fill =
    tone === "player"
      ? "fill-player/12"
      : tone === "banker"
        ? "fill-banker/12"
        : "fill-tie/12";
  const fillStrong =
    tone === "player"
      ? "fill-player/18"
      : tone === "banker"
        ? "fill-banker/18"
        : "fill-tie/18";
  const from =
    tone === "player"
      ? "from-player/14"
      : tone === "banker"
        ? "from-banker/14"
        : "from-tie/14";
  const bubble =
    tone === "player"
      ? "bg-player-glow/50"
      : tone === "banker"
        ? "bg-banker-glow/50"
        : "bg-tie-glow/50";

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden transition-all duration-700 ease-out"
      style={{
        height: `${highlight ? Math.min(82, heightPct + 12) : heightPct}%`,
        opacity: highlight ? Math.min(0.95, opacity + 0.2) : opacity,
      }}
    >
      {/* Main wave – more transparent liquid look */}
      <motion.svg
        viewBox="0 0 320 40"
        preserveAspectRatio="none"
        className={cn("absolute bottom-0 h-full w-[210%]", fill)}
        animate={{ x: ["-50%", "0%"] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "linear" }}
      >
        <path d={WAVE} />
      </motion.svg>

      {/* Second layer for depth */}
      <motion.svg
        viewBox="0 0 320 40"
        preserveAspectRatio="none"
        className={cn("absolute bottom-0 h-[75%] w-[210%]", fillStrong)}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: "linear" }}
      >
        <path d={WAVE} />
      </motion.svg>

      <div className={cn("absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t to-transparent", from)} />

      {/* Bubbles – light up more when value is higher */}
      {pct > 15 && (
        <>
          <motion.span
            className={cn("absolute bottom-1.5 left-[26%] h-1.5 w-1.5 rounded-full", bubble)}
            animate={{ y: [0, -20 - pct * 0.15], opacity: [0, 0.6, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, delay: 0.2 }}
          />
          <motion.span
            className={cn("absolute bottom-2 left-[58%] h-1.5 w-1.5 rounded-full", bubble)}
            animate={{ y: [0, -24 - pct * 0.12], opacity: [0, 0.5, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, delay: 1.1 }}
          />
          {pct > 40 && (
            <motion.span
              className={cn("absolute bottom-1 left-[42%] h-1 w-1 rounded-full", bubble)}
              animate={{ y: [0, -18 - pct * 0.1], opacity: [0, 0.45, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: 0.7 }}
            />
          )}
        </>
      )}
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
      <WaterWave tone={tone} value={value} highlight={highlight} />

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
  return (
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
          dist && !winner && "ring-1 ring-tie/20",
        )}
      >
        <WaterWave tone="tie" value={dist?.tie ?? null} />

        <span className="relative z-10 text-[8px] font-semibold uppercase tracking-[0.16em] text-tie-glow sm:text-[9px]">
          Tie
        </span>
        <span className="relative z-10 mt-0.5 font-display text-lg font-extrabold tabular-nums sm:text-xl">
          {dist ? `${dist.tie}%` : "--"}
        </span>
      </motion.div>
    </div>
  );
}
