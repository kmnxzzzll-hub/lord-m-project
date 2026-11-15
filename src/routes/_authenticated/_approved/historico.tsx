import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { History } from "lucide-react";
import { Ball, outcomeKind, outcomeLabel } from "@/components/bacbo/Ball";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRobot } from "@/lib/robot-context";

export const Route = createFileRoute("/_authenticated/_approved/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Bac Bo Live" },
      {
        name: "description",
        content: "Os sinais desta sessão e as últimas rodadas reais da mesa Bac Bo Live.",
      },
      { property: "og:title", content: "Histórico — Bac Bo Live" },
      { property: "og:description", content: "Sinais da sessão e rodadas reais da mesa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { sessionSignals, rounds } = useRobot();
  const recent = rounds.slice(-36).reverse();
  const isMobile = useIsMobile();

  return (
    <div className="mx-auto lg:max-w-3xl">
      <header className="flex items-center gap-3 pb-4 pt-2 sm:pb-5 sm:pt-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card/70">
          <History className="h-5 w-5 text-player-glow" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Histórico</h1>
          <p className="text-xs text-muted-foreground">
            Sinais desta sessão · {sessionSignals.length}
          </p>
        </div>
      </header>

      {sessionSignals.length === 0 ? (
        <div className="glass rounded-[1.75rem] p-8 text-center">
          <p className="font-display text-lg font-bold">Nenhum sinal nesta sessão</p>
          <p className="mt-1 text-sm text-muted-foreground">
            As cores aparecem aqui assim que o robô gerar os sinais.
          </p>
        </div>
      ) : (
        <div className="glass rounded-[1.75rem] p-4 sm:p-5">
          <ul className="grid grid-cols-6 gap-2 sm:grid-cols-8 sm:gap-3 lg:grid-cols-12">
            {sessionSignals.map((s, i) => (
              <motion.li
                key={s.key}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: Math.min(i * 0.025, 0.6),
                  type: "spring",
                  stiffness: 260,
                  damping: 18,
                }}
                className="flex justify-center"
              >
                <Ball
                  kind={s.side}
                  label={s.side === "player" ? "P" : "B"}
                  size={isMobile ? 34 : 40}
                />
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      <section className="mt-5 sm:mt-6">
        <h2 className="pb-2.5 font-display text-base font-bold sm:text-lg">Rodadas da mesa</h2>
        {recent.length === 0 ? (
          <div className="glass rounded-[1.75rem] p-6 text-center text-sm text-muted-foreground">
            Sem rodadas ao vivo no momento. Aguardando conexão com a mesa. Não recomendamos operar
            agora.
          </div>
        ) : (
          <ul className="glass divide-y divide-border/60 rounded-[1.75rem] px-4 sm:px-5">
            {recent.map((r) => (
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
                  {r.outcome === "T" && r.multiplier ? (
                    <span className="pl-2 text-xs font-semibold text-tie-glow">{r.multiplier}x</span>
                  ) : null}
                </span>
                <time className="text-xs tabular-nums text-muted-foreground">
                  {new Date(r.settledAt).toLocaleTimeString("pt-BR")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
