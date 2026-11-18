import { cn } from "@/lib/utils";

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
    <div
      className={cn(
        "relative flex h-full flex-col justify-between rounded-2xl border bg-card px-4 py-4 sm:px-5 sm:py-5",
        isPlayer ? "rounded-l-[1.5rem] rounded-r-xl" : "rounded-r-[1.5rem] rounded-l-xl",
        highlight
          ? isPlayer
            ? "border-player/60 ring-1 ring-player/40"
            : "border-banker/60 ring-1 ring-banker/40"
          : "border-border",
      )}
    >
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.2em] sm:text-[11px]",
          isPlayer ? "text-player-glow" : "text-banker-glow",
        )}
      >
        {label}
      </span>

      <div className={cn("mt-3", isPlayer ? "text-left" : "text-right")}>
        <span className="font-display text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl">
          {value === null ? "--" : `${value}%`}
        </span>
      </div>

      {/* Small accent bar */}
      <div
        className={cn(
          "mt-3 h-1 w-10 rounded-full sm:w-12",
          isPlayer ? "bg-player" : "bg-banker",
          !isPlayer && "ml-auto",
        )}
      />
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

      {/* Center Tie card */}
      <div className="absolute left-1/2 top-1/2 z-10 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border border-border bg-card shadow-lg sm:h-28 sm:w-28 lg:h-32 lg:w-32">
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-tie-glow sm:text-[10px]">
          Tie
        </span>
        <span className="mt-1 font-display text-2xl font-extrabold tabular-nums sm:text-3xl">
          {active ? `${dist!.tie}%` : "--"}
        </span>
      </div>
    </div>
  );
}
