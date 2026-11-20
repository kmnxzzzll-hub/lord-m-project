import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const WAVE =
  "M0 14 Q 20 6 40 14 T 80 14 T 120 14 T 160 14 T 200 14 T 240 14 T 280 14 T 320 14 V 40 H 0 Z";

/** Soft, low-cost water effect (SVG + gradient only — no heavy backdrop-blur) */
function WaterWave({
  tone,
  active,
}: {
  tone: "player" | "banker" | "tie";
  active: boolean;
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

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 h-[42%] overflow-hidden transition-opacity duration-300",
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
        className={cn("absolute bottom-1.5 left-[28%] h-1 w-1 rounded-full", bubble)}
        animate={{ y: [0, -18], opacity: [0, 0.55, 0] }}
        transition={{ duration: 3.1, repeat: Infinity, delay: 0.3 }}
      />
      <motion.span
        className={cn("absolute bottom-2 left-[62%] h-1 w-1 rounded-full", bubble)}
        animate={{ y: [0, -22], opacity: [0, 0.45, 0] }}
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
      <WaterWave tone={tone} active={highlight || value !== null} />

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
  dist: { player: number; banker: number; tie: number } | null;
  winner?: "player" | "banker" | null;
}) {
  const active = dist !== null;
  const tieHighlight = false; // tie is never the recommended bet side

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
  );
}
