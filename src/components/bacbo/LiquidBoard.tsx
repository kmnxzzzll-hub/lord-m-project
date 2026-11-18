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
        "relative flex h-full flex-col justify-between rounded-2xl border bg-card px-3 py-2.5 sm:px-3.5 sm:py-3",
        isPlayer ? "rounded-l-[1.15rem] rounded-r-xl" : "rounded-r-[1.15rem] rounded-l-xl",
        highlight
          ? isPlayer
            ? "border-player/50 ring-1 ring-player/30"
            : "border-banker/50 ring-1 ring-banker/30"
          : "border-border",
      )}
    >
      <span
        className={cn(
          "text-[9px] font-semibold uppercase tracking-[0.16em] sm:text-[10px]",
          isPlayer ? "text-player-glow" : "text-banker-glow",
        )}
      >
        {label}
      </span>

      <div className={cn("mt-1.5", isPlayer ? "text-left" : "text-right")}>
        <span className="font-display text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl">
          {value === null ? "--" : `${value}%`}
        </span>
      </div>

      <div
        className={cn(
          "mt-1.5 h-0.5 w-7 rounded-full sm:w-8",
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

      <div className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-xl border border-border bg-card shadow-sm sm:h-20 sm:w-20">
        <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-tie-glow sm:text-[9px]">
          Tie
        </span>
        <span className="mt-0.5 font-display text-lg font-extrabold tabular-nums sm:text-xl">
          {active ? `${dist!.tie}%` : "--"}
        </span>
      </div>
    </div>
  );
}
