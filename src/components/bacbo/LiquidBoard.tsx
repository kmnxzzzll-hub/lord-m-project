import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tone = "player" | "banker" | "tie";

const tones: Record<Tone, { fill: string; back: string; body: string }> = {
  player: {
    fill: "fill-player-glow",
    back: "fill-player/60",
    body: "from-player-glow via-player to-player/90",
  },
  banker: {
    fill: "fill-banker-glow",
    back: "fill-banker/60",
    body: "from-banker-glow via-banker to-banker/90",
  },
  tie: { fill: "fill-tie-glow", back: "fill-tie/60", body: "from-tie-glow via-tie to-tie/90" },
};

const WAVE =
  "M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 T 250 10 T 300 10 T 350 10 T 400 10 V 24 H 0 Z";

function Liquid({ tone, level, active }: { tone: Tone; level: number; active: boolean }) {
  const t = tones[tone];
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0"
      initial={{ height: "6%" }}
      animate={{ height: `${Math.max(6, Math.min(96, level))}%` }}
      transition={{ type: "spring", stiffness: 30, damping: 12 }}
    >
      <div className="absolute -top-[14px] left-0 h-4 w-[200%]">
        <motion.svg
          viewBox="0 0 400 24"
          preserveAspectRatio="none"
          className={cn("absolute inset-0 h-full w-full", t.back)}
          animate={{ x: ["-50%", "0%"] }}
          transition={{ duration: active ? 3.2 : 7, repeat: Infinity, ease: "linear" }}
        >
          <path d={WAVE} />
        </motion.svg>
        <motion.svg
          viewBox="0 0 400 24"
          preserveAspectRatio="none"
          className={cn("absolute inset-0 top-[3px] h-full w-full", t.fill)}
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: active ? 2.2 : 5, repeat: Infinity, ease: "linear" }}
        >
          <path d={WAVE} />
        </motion.svg>
      </div>
      <div className={cn("h-full w-full bg-gradient-to-b", t.body)} />
      {active && (
        <>
          <motion.span
            className="absolute bottom-3 left-[30%] h-1.5 w-1.5 rounded-full bg-foreground/40"
            animate={{ y: [0, -40], opacity: [0, 0.8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: 0.3 }}
          />
          <motion.span
            className="absolute bottom-2 left-[65%] h-1 w-1 rounded-full bg-foreground/40"
            animate={{ y: [0, -55], opacity: [0, 0.7, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1.1 }}
          />
        </>
      )}
    </motion.div>
  );
}

function Percent({ value }: { value: number | null }) {
  return (
    <motion.span
      key={value ?? "off"}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
    >
      {value === null ? "--" : `${value}%`}
    </motion.span>
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
  const active = value !== null;
  return (
    <motion.div
      className={cn(
        "glass relative h-full overflow-hidden",
        tone === "player" ? "rounded-l-[1.75rem] rounded-r-xl" : "rounded-r-[1.75rem] rounded-l-xl",
        highlight &&
          (tone === "player" ? "ring-2 ring-player-glow/70" : "ring-2 ring-banker-glow/70"),
      )}
      animate={highlight ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={{ duration: 1.6, repeat: highlight ? Infinity : 0 }}
    >
      <Liquid tone={tone} level={active ? value! * 1.25 : 8} active={active} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground/10 via-transparent to-transparent" />
      <div
        className={cn(
          "relative flex h-full flex-col justify-end pb-3 sm:pb-4",
          tone === "player" ? "items-start pl-3 sm:pl-4" : "items-end pr-3 sm:pr-4",
        )}
      >
        <Percent value={value} />
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/80 sm:text-[11px] sm:tracking-[0.25em]">
          {label}
        </span>
      </div>
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
  return (
    <div className="relative h-36 sm:h-44 lg:h-52">
      <div className="absolute inset-y-0 left-0 w-[47%]">
        <SideCard
          tone="player"
          label="Jogador"
          value={dist?.player ?? null}
          highlight={winner === "player"}
        />
      </div>
      <div className="absolute inset-y-0 right-0 w-[47%]">
        <SideCard
          tone="banker"
          label="Casa"
          value={dist?.banker ?? null}
          highlight={winner === "banker"}
        />
      </div>
      <div className="absolute left-1/2 top-1/2 z-10 h-24 w-24 -translate-x-1/2 sm:h-32 sm:w-32 lg:h-36 lg:w-36 -translate-y-1/2">
        <div className="absolute -inset-2 rounded-full bg-tie/15 blur-xl" />
        <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-tie/70 bg-background/80 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <Liquid tone="tie" level={active ? dist!.tie * 2.2 : 6} active={active} />
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-foreground/15 via-transparent to-transparent" />
          <div className="relative flex h-full flex-col items-center justify-center">
            <span className="font-display text-2xl font-extrabold text-foreground drop-shadow sm:text-3xl">
              {active ? `${dist!.tie}%` : "--"}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-tie-glow sm:text-[10px] sm:tracking-[0.25em]">
              Empate
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
