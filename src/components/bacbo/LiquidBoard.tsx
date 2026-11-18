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
        "relative flex h-full flex-col justify-between rounded-2xl border bg-card px-3 py-3 sm:px-4 sm:py-4",
        isPlayer ? "rounded-l-[1.25rem] rounded-r-xl" : "rounded-r-[1.25rem] rounded-l-xl",
        highlight
          ? isPlayer
            ? "border-player/60 ring-1 ring-player/40"
            : "border-banker/60 ring-1 ring-banker/40"
          : "border-border",
      )}
    >
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.18em]",
          isPlayer ? "text-player-glow" : "text-banker-glow",
        )}
      >
        {label}
      </span>

      <div className={cn("mt-2", isPlayer ? "text-left" : "text-right")}>
        <span className="font-display text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl">
          {value === null ? "--" : `${value}%`}
        </span>
      </div>

      <div
        className={cn(
          "mt-2 h-1 w-8 rounded-full sm:w-10",
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
    <div className="relative h-28 sm:h-36 lg:h-40">
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

      <div className="absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border border-border bg-card shadow-md sm:h-24 sm:w-24">
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-tie-glow">
          Tie
        </span>
        <span className="mt-0.5 font-display text-xl font-extrabold tabular-nums sm:text-2xl">
          {active ? `${dist!.tie}%` : "--"}
        </span>
      </div>
    </div>
  );
}
