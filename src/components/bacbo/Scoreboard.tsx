import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useRobot } from "@/lib/robot-context";
import { scoreSignals, summarize, type SignalResult } from "@/lib/scoreboard";
import { cn } from "@/lib/utils";

export function useSessionResults() {
  const { sessionSignals, rounds } = useRobot();
  return useMemo(() => scoreSignals(sessionSignals, rounds), [sessionSignals, rounds]);
}

export function Scoreboard() {
  const s = summarize(useSessionResults());
  const items = [
    { label: "Greens", value: s.greens, tone: "text-success" },
    { label: "Reds", value: s.reds, tone: "text-destructive" },
    { label: "Acerto", value: s.total ? `${s.rate}%` : "—", tone: "text-foreground" },
    { label: "Sequência", value: s.best, tone: "text-tie" },
  ];
  return (
    <div className="liquid-glass grid grid-cols-4 rounded-[1.4rem] px-2 py-2.5">
      {items.map((i) => (
        <div key={i.label} className="flex flex-col items-center">
          <span className={cn("font-display text-lg font-extrabold tabular-nums sm:text-xl", i.tone)}>
            {i.value}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {i.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Floating liquid-glass banner shown when a real round confirms a green. */
export function GreenBanner() {
  const results = useSessionResults();
  const seen = useRef<Set<string> | null>(null);
  const [show, setShow] = useState<SignalResult | null>(null);

  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(results.map((r) => r.key));
      return;
    }
    const fresh = results.filter((r) => !seen.current!.has(r.key));
    fresh.forEach((r) => seen.current!.add(r.key));
    const green = fresh.filter((r) => r.green).at(-1);
    if (!green) return;
    setShow(green);
    const t = setTimeout(() => setShow(null), 4000);
    return () => clearTimeout(t);
  }, [results]);

  const blue = show?.side === "player";
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={show.key}
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4 pt-safe"
        >
          <div className="liquid-glass flex items-center gap-3 rounded-full py-2 pl-2 pr-5">
            <motion.span
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 14 }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-background shadow-lg",
                blue ? "ball-player" : "ball-banker",
              )}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </motion.span>
            <div className="leading-tight">
              <p className="font-display text-sm font-extrabold text-success">GREEN!</p>
              <p className="text-xs text-foreground/80">
                {show.tie ? "Empate · proteção" : `Green no ${blue ? "Azul (Player)" : "Vermelho (Banker)"}`}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
