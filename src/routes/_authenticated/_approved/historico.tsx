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
        <div key={cycleKey} className="liquid-glass rounded-[1.75rem] px-4 py-3.5 sm:px-5 sm:py-4">
          <ul className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {results.map((r) => (
              <motion.li
                key={r.key}
                layoutId={`card-${r.key}`}
                onClick={() => setSelected(r.key)}
                className="cursor-pointer transition-transform active:scale-95"
                whileHover={{ scale: 1.12 }}
                title={r.side === "player" ? "Player" : "Banker"}
              >
                {/* Bolinha pequenininha na cor do sinal (Player azul / Banker vermelho) — sem G/R */}
                <Ball kind={r.side} size={isMobile ? 18 : 20} />
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              layoutId={`card-${selected}`}
              className="liquid-glass relative w-full max-w-sm rounded-[1.75rem] p-5 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Detalhe do sinal
              </p>
              <div className="mt-4 flex justify-center gap-3">
                {results
                  .filter((r) => r.key === selected)
                  .map((r) => (
                    <div key={r.key} className="text-center">
                      <Ball kind={r.side} label={r.side === "player" ? "P" : "B"} size={56} />
                      <p
                        className={cn(
                          "mt-2.5 font-display text-base font-bold",
                          r.green ? "text-success" : "text-destructive",
                        )}
                      >
                        {r.green ? (r.tie ? "GREEN (Empate)" : "GREEN") : "RED"}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
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
    <ul className="liquid-glass divide-y divide-border/50 rounded-[1.75rem] px-4 sm:px-5">
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
