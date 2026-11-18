import { cn } from "@/lib/utils";

type Tone = "player" | "banker" | "tie";

const tones: Record<Tone, { body: string; ring: string }> = {
  player: {
    body: "from-player/80 via-player to-player/70",
    ring: "ring-player-glow/60",
  },
  banker: {
    body: "from-banker/80 via-banker to-banker/70",
    ring: "ring-banker-glow/60",
  },
  tie: {
    body: "from-tie/80 via-tie to-tie/70",
    ring: "ring-tie-glow/60",
  },
};

function Percent({ value }: { value: number | null }) {
  return (
    <span className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
      {value === null ? "--" : `${value}%`}
    </span>
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
  const level = active ? Math.max(8, Math.min(92, value! * 1.2)) : 8;

  return (
    <div
      className={cn(
        "glass relative h-full overflow-hidden",
        tone === "player" ? "rounded-l-[1.75rem] rounded-r-xl" : "rounded-r-[1.75rem] rounded-l-xl",
        highlight && `ring-2 ${tones[tone].ring}`,
      )}
    >
      {/* Static fill — no continuous wave animation */}
      <div
        className={cn("absolute inset-x-0 bottom-0 bg-gradient-to-b", tones[tone].body)}
        style={{ height: `${level}%` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-foreground/8 via-transparent to-transparent" />
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
    </div>
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
  const tieLevel = active ? Math.max(6, Math.min(90, dist!.tie * 2)) : 6;

  return (
    <div className="relative h-36 sm:h-44 lg:h-52">
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

      {/* Center Tie */}
      <div className="absolute left-1/2 top-1/2 z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 sm:h-32 sm:w-32 lg:h-36 lg:w-36">
        <div className="relative h-full w-full overflow-hidden rounded-full border border-tie/50 bg-background/70 shadow-lg">
          <div
            className={cn("absolute inset-x-0 bottom-0 bg-gradient-to-b", tones.tie.body)}
            style={{ height: `${tieLevel}%` }}
          />
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-foreground/10 via-transparent to-transparent" />
          <div className="relative flex h-full flex-col items-center justify-center">
            <span className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">
              {active ? `${dist!.tie}%` : "--"}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-tie-glow sm:text-[10px] sm:tracking-[0.25em]">
              Tie
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
