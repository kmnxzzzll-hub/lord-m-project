import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { History, X } from "lucide-react";
import { Ball, outcomeKind, outcomeLabel } from "@/components/bacbo/Ball";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRobot } from "@/lib/robot-context";
import { scoreSignals } from "@/lib/scoreboard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_approved/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Bac Bo Live" },
      {
        name: "description",
        content: "Os sinais desta sessão e as últimas rodadas reais da mesa Bac Bo Live.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { sessionSignals, rounds } = useRobot();
  const results = scoreSignals(sessionSignals, rounds).slice(-20);
  const [selected, setSelected] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Reset visual when we hit exactly 20 (platform starts a new cycle)
  const cycleKey = Math.floor(results.length / 20);

  return (
    <div className="mx-auto lg:max-w-3xl">
      <header className="flex items-center gap-3 pb-4 pt-2 sm:pb-5 sm:pt-3">
        <div className="liquid-glass flex h-11 w-11 items-center justify-center rounded-2xl">
          <History className="h-5 w-5 text-player-glow" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Histórico</h1>
          <p className="text-xs text-muted-foreground">
            Sinais da plataforma · {results.length} / 20
          </p>
        </div>
      </header>

      {results.length === 0 ? (
        <div className="liquid-glass rounded-[1.75rem] p-8 text-center">
          <p className="font-display text-lg font-bold">Nenhum sinal ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Os sinais que a plataforma enviar aparecem aqui.
          </p>
        </div>
      ) : (
        <div key={cycleKey} className="liquid-glass rounded-[1.75rem] p-4 sm:p-5">
          <ul className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
            {results.map((r) => (
              <motion.li
                key={r.key}
                layoutId={`card-${r.key}`}
                onClick={() => setSelected(r.key)}
                className="cursor-pointer transition-transform active:scale-95"
                whileHover={{ scale: 1.08 }}
              >
                <span
                  className={cn(
                    "relative inline-flex h-11 w-11 items-center justify-center rounded-full font-display text-sm font-bold text-foreground shadow-md sm:h-12 sm:w-12",
                    r.green ? "ball-player" : "ball-banker",
                  )}
                  style={{
                    // Force green / red look for result, not side colors
                    background: r.green
                      ? "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), transparent 45%), linear-gradient(145deg, #22c55e, #16a34a)"
                      : "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.25), transparent 45%), linear-gradient(145deg, #ef4444, #dc2626)",
                    boxShadow: r.green
                      ? "0 4px 14px -4px rgba(34,197,94,0.55)"
                      : "0 4px 14px -4px rgba(239,68,68,0.55)",
                  }}
                >
                  <span className="absolute left-[22%] top-[14%] h-[22%] w-[34%] rounded-full bg-foreground/40 blur-[1px]" />
                  <span className="relative drop-shadow">{r.green ? "G" : "R"}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              layoutId={`card-${selected}`}
              className="liquid-glass relative w-full max-w-md rounded-[1.75rem] p-5 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-center text-sm text-muted-foreground">Detalhe do sinal</p>
              <div className="mt-4 flex justify-center gap-3">
                {results
                  .filter((r) => r.key === selected)
                  .map((r) => (
                    <div key={r.key} className="text-center">
                      <Ball
                        kind={r.side}
                        label={r.side === "player" ? "P" : "B"}
                        size={64}
                      />
                      <p className={cn("mt-2 font-display text-lg font-bold", r.green ? "text-success" : "text-destructive")}>
                        {r.green ? (r.tie ? "GREEN (Empate)" : "GREEN") : "RED"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.at).toLocaleTimeString("pt-BR")}
                      </p>
                    </div>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="mt-5 sm:mt-6">
        <h2 className="pb-2.5 font-display text-base font-bold sm:text-lg">
          Rodadas da mesa · últimas 20
        </h2>
        <RoundsList rounds={rounds.slice(-20).reverse()} isMobile={isMobile} />
      </section>
    </div>
  );
}

function RoundsList({ rounds, isMobile }: { rounds: any[]; isMobile: boolean }) {
  if (rounds.length === 0) {
    return (
      <div className="liquid-glass rounded-[1.75rem] p-6 text-center text-sm text-muted-foreground">
        Sem rodadas ao vivo no momento.
      </div>
    );
  }
  return (
    <ul className="liquid-glass divide-y divide-border/60 rounded-[1.75rem] px-4 sm:px-5">
      {rounds.map((r) => (
        <li key={r.id} className="flex items-center gap-3 py-2.5">
          <Ball
            kind={outcomeKind(r.outcome)}
            label={outcomeLabel(r.outcome)}
            size={isMobile ? 26 : 30}
          />
          <span className="flex-1 text-sm tabular-nums">
            <span className="text-player-glow">
              {r.p[0]}+{r.p[1]} = {r.pScore}
            </span>
            <span className="px-2 text-muted-foreground">×</span>
            <span className="text-banker-glow">
              {r.b[0]}+{r.b[1]} = {r.bScore}
            </span>
          </span>
          <time className="text-xs tabular-nums text-muted-foreground">
            {new Date(r.settledAt).toLocaleTimeString("pt-BR")}
          </time>
        </li>
      ))}
    </ul>
  );
}
