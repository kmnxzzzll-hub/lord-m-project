import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
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

/** How long the win/loss notice stays on screen before it leaves by itself. */
export const RESULT_BANNER_MS = 2_600;

/**
 * Floating liquid-glass notice shown when a real round settles an entry: green (a tie counts as
 * green) or loss. It closes on its own after RESULT_BANNER_MS.
 */
export function ResultBanner() {
  const results = useSessionResults();
  const seen = useRef<Set<string> | null>(null);
  const [show, setShow] = useState<SignalResult | null>(null);

  // Detect results that are new since the last look (the first look only marks what exists).
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(results.map((r) => r.key));
      return;
    }
    const fresh = results.filter((r) => !seen.current!.has(r.key));
    fresh.forEach((r) => seen.current!.add(r.key));
    const latest = fresh.at(-1);
    if (latest) setShow(latest);
  }, [results]);

  // Its own timer, so table refreshes every few seconds can never keep the notice stuck.
  const showKey = show?.key;
  useEffect(() => {
    if (!showKey) return;
    const t = setTimeout(() => setShow(null), RESULT_BANNER_MS);
    return () => clearTimeout(t);
  }, [showKey]);

  const blue = show?.side === "player";
  const sideName = blue ? "Azul (Player)" : "Vermelho (Banker)";
  const glow = !show
    ? ""
    : !show.green
      ? "shadow-[0_0_28px_-4px_var(--destructive)]"
      : show.tie
        ? "shadow-[0_0_28px_-4px_var(--tie)]"
        : blue
          ? "shadow-[0_0_28px_-4px_var(--player)]"
          : "shadow-[0_0_28px_-4px_var(--banker)]";

  return (
    <AnimatePresence>
      {show && (
        <div
          className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-4"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <motion.div
            key={show.key}
            role="status"
            initial={{ opacity: 0, y: -20, width: 120, height: 36, borderRadius: 999 }}
            animate={{ opacity: 1, y: 0, width: 300, height: 60 }}
            exit={{ opacity: 0, y: -16, width: 120, height: 36 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={cn(
              "liquid-glass flex items-center gap-3 overflow-hidden rounded-full pl-2 pr-5",
              glow,
            )}
          >
            <motion.span
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: [0, 1.2, 1], rotate: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-background shadow-lg",
                !show.green
                  ? "bg-destructive"
                  : show.tie
                    ? "bg-tie"
                    : blue
                      ? "ball-player"
                      : "ball-banker",
              )}
            >
              {show.green ? (
                <Check className="h-5 w-5" strokeWidth={3} />
              ) : (
                <X className="h-5 w-5" strokeWidth={3} />
              )}
            </motion.span>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="min-w-0 leading-tight"
            >
              <p
                className={cn(
                  "font-display text-sm font-extrabold",
                  show.green ? "text-success" : "text-destructive",
                )}
              >
                {show.green ? "🎉 GREEN!" : "😕 LOSS"}
              </p>
              <p className="truncate text-xs text-foreground/80">
                {show.green
                  ? show.tie
                    ? "Empate · conta como Green"
                    : `Green no ${sideName}`
                  : `Entrada no ${sideName} não bateu`}
              </p>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
