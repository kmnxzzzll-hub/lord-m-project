import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, AlertTriangle, PartyPopper } from "lucide-react";
import { useRobot } from "@/lib/robot-context";
import { scoreSignals, summarize, type SignalResult } from "@/lib/scoreboard";
import { cn } from "@/lib/utils";

export function useSessionResults() {
  const { sessionSignals, rounds } = useRobot();
  return useMemo(() => scoreSignals(sessionSignals, rounds), [sessionSignals, rounds]);
}

export function Scoreboard() {
  const results = useSessionResults();
  const s = summarize(results);
  const items = [
    { label: "Greens", value: s.greens, tone: "text-success" },
    { label: "Reds", value: s.reds, tone: "text-destructive" },
    { label: "Acerto", value: s.total ? `${s.rate}%` : "—", tone: "text-foreground" },
    { label: "Sequência", value: s.best, tone: "text-tie" },
  ];

  const recentReds = results.slice(-3).filter((r) => !r.green).length;
  const temp = recentReds >= 2 || (s.total > 5 && s.rate < 50) ? "red" : "green";

  return (
    <div className="space-y-2">
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
      <div className="flex justify-center">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold",
            temp === "green" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", temp === "green" ? "bg-success" : "bg-destructive")} />
          Temperatura: {temp === "green" ? "Padrão respeitado" : "Mesa instável"}
        </span>
      </div>
    </div>
  );
}

export const RESULT_BANNER_MS = 2_600;
const RESULT_FRESH_MS = 75_000;

export function ResultBanner() {
  const results = useSessionResults();
  const seen = useRef<Set<string> | null>(null);
  const [show, setShow] = useState<SignalResult | null>(null);
  const [streakBanner, setStreakBanner] = useState<"greens" | "reds" | null>(null);

  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(results.map((r) => r.key));
      return;
    }
    const fresh = results.filter((r) => !seen.current!.has(r.key));
    fresh.forEach((r) => seen.current!.add(r.key));
    const latest = fresh.filter((r) => Date.now() - r.at < RESULT_FRESH_MS).at(-1);
    if (latest) setShow(latest);

    const last3 = results.slice(-3);
    if (last3.length === 3 && last3.every((r) => !r.green)) {
      setStreakBanner("reds");
    } else if (results.slice(-5).length === 5 && results.slice(-5).every((r) => r.green)) {
      setStreakBanner("greens");
    }
  }, [results]);

  const showKey = show?.key;
  useEffect(() => {
    if (!showKey) return;
    const t = setTimeout(() => setShow(null), RESULT_BANNER_MS);
    return () => clearTimeout(t);
  }, [showKey]);

  useEffect(() => {
    if (!streakBanner) return;
    const t = setTimeout(() => setStreakBanner(null), 5000);
    return () => clearTimeout(t);
  }, [streakBanner]);

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
    <>
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
                  {show.green ? (show.tie ? "GREEN (Empate)" : "GREEN DIRETO") : "LOSS"}
                </p>
                <p className="truncate text-xs text-foreground/80">
                  {show.green
                    ? show.tie
                      ? "Empate · proteção de banca"
                      : `Green no ${sideName}`
                    : `Entrada no ${sideName} não bateu`}
                </p>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {streakBanner && (
          <div
            className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="liquid-glass flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg"
            >
              {streakBanner === "greens" ? (
                <>
                  <PartyPopper className="h-5 w-5 text-success" />
                  <span>💰 Surra no branco, dinheiro no bolso 💰</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">😭</span>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span>MESA MANIPULANDO, SAI NÃO FIQUE TEIMOSO</span>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
