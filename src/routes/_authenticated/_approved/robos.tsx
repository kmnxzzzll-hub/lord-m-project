import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Power, WifiOff, Wrench } from "lucide-react";
import { Logo } from "@/components/bacbo/Logo";
import { LiquidBoard } from "@/components/bacbo/LiquidBoard";
import { Cube3D } from "@/components/bacbo/Cube3D";
import { LiveTableCard } from "@/components/bacbo/LiveTable";
import { SignalOrb } from "@/components/bacbo/SignalOrb";
import { distribution } from "@/lib/bacbo-engine";
import { useRobot } from "@/lib/robot-context";
import { MIN_HISTORY } from "@/lib/robot-schedule";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_authenticated/_approved/robos")({
  head: () => ({
    meta: [
      { title: "Robôs — Bac Bo Live" },
      {
        name: "description",
        content:
          "Acompanhe o robô Bac Bo Live, que lê as rodadas reais da mesa e mostra o sinal de Jogador ou Casa.",
      },
      { property: "og:title", content: "Robôs — Bac Bo Live" },
      { property: "og:description", content: "Sinais de Jogador ou Casa em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RobotsPage,
});

function Clock() {
  const now = useNow(1000);
  return (
    <span className="font-display tabular-nums">{new Date(now).toLocaleTimeString("pt-BR")}</span>
  );
}

function RobotsPage() {
  const robot = useRobot();
  const { phase, isAdmin } = robot;
  const on = phase !== "off";

  // Liquid stays at the bottom while off or analyzing; it only rises once a signal is out.
  const dist = phase === "signal" ? distribution(robot.history, robot.signal) : null;

  return (
    <div className="space-y-4 sm:space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8 lg:gap-y-5 lg:space-y-0">
      <div className="space-y-4 sm:space-y-5">
        <header className="pt-1 sm:pt-2">
          <Logo />
          <div className="mt-2.5 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  on ? "bg-success" : "bg-muted-foreground",
                )}
              />
              {on ? "Online" : "Standby"}
            </span>
            <Clock />
          </div>
        </header>

        {isAdmin && (
          <motion.button
            onClick={robot.toggle}
            whileTap={{ scale: 0.97 }}
            disabled={robot.toggling}
            className={cn(
              "relative flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full font-display text-[15px] font-bold sm:h-14 sm:text-base tracking-wide transition-colors disabled:opacity-60",
              robot.running
                ? "border border-border bg-secondary text-foreground"
                : "bg-gradient-to-r from-success/90 to-success text-background shadow-[0_18px_40px_-18px_var(--success)]",
            )}
          >
            {!robot.running && (
              <motion.span
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-foreground/30 to-transparent"
                animate={{ x: ["-120%", "320%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <Power className="relative h-5 w-5" />
            <span className="relative">{robot.running ? "Desligar Robô" : "Ligar Robô"}</span>
          </motion.button>
        )}

        <LiquidBoard
          dist={dist}
          winner={phase === "signal" ? (robot.signal?.side ?? null) : null}
        />

        <LiveTableCard rounds={robot.rounds} />
      </div>

      <div className="lg:pt-2">
        <AnimatePresence mode="wait">
          {robot.maintenance ? (
            <Panel key="maint">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-tie/30 bg-tie/10 text-tie">
                <Wrench className="h-7 w-7" />
              </div>
              <span className="mt-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Modo manutenção
              </span>
              <h2 className="mt-1 font-display text-2xl font-extrabold">ROBÔ PAUSADO</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                O administrador está calibrando o sistema. Volte em instantes.
              </p>
            </Panel>
          ) : phase === "off" ? (
            <Panel key="off">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background/60 sm:h-16 sm:w-16 text-muted-foreground">
                <Moon className="h-7 w-7" />
              </div>
              <h2 className="mt-3 font-display text-xl font-extrabold sm:mt-4 sm:text-2xl">
                STANDBY
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isAdmin
                  ? "Toque em Ligar Robô para iniciar os sinais para todos."
                  : "Aguarde o administrador iniciar o robô."}
              </p>
            </Panel>
          ) : robot.reason === "no_connection" ? (
            <Panel key="offline">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive sm:h-16 sm:w-16">
                <WifiOff className="h-7 w-7" />
              </div>
              <span className="mt-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground sm:mt-4">
                Robô ligado
              </span>
              <h2 className="mt-1 font-display text-xl font-extrabold sm:text-2xl">
                SEM CONEXÃO COM A MESA
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A mesa ao vivo não está enviando rodadas, então nenhum sinal será enviado. Não
                recomendamos operar agora.
              </p>
              {isAdmin && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Vá em Painel → Robô → Mesa ao vivo para colar uma nova chave e ligar a conexão.
                </p>
              )}
            </Panel>
          ) : phase === "analyzing" ? (
            <Analyzing key={`analyzing-${robot.key}`} />
          ) : (
            robot.signal && (
              <SignalOrb
                key={`signal-${robot.key}`}
                side={robot.signal.side}
                phaseStart={robot.phaseStart}
                phaseEnd={robot.phaseEnd}
              />
            )
          )}
        </AnimatePresence>
      </div>

      <p className="px-3 text-center lg:col-span-2 text-[11px] leading-relaxed text-muted-foreground/70">
        As rodadas analisadas vêm da mesa Bac Bo Live ao vivo. Os sinais são leituras de padrões e
        não garantem ganhos. Jogue com responsabilidade · +18.
      </p>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="glass flex flex-col items-center rounded-[1.75rem] px-5 py-6 text-center sm:px-6 sm:py-8"
    >
      {children}
    </motion.div>
  );
}

function Analyzing() {
  const { phaseStart, phaseEnd, reason, rounds } = useRobot();
  const now = useNow(100);
  const total = phaseEnd - phaseStart;
  const elapsed = Math.min(total, Math.max(0, now - phaseStart));
  const left = Math.max(0, Math.ceil((total - elapsed) / 1000));
  const isMobile = useIsMobile();

  return (
    <Panel>
      <Cube3D size={isMobile ? 76 : 100} />
      <h2 className="mt-2 font-display text-base font-extrabold tracking-[0.12em] sm:mt-3 sm:text-xl sm:tracking-[0.14em]">
        <span className="text-success">SISTEMA ONLINE</span>{" "}
        <span className="text-foreground">ANALISANDO</span>
      </h2>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {reason === "collecting"
          ? `Coletando rodadas da mesa (${Math.min(rounds.length, MIN_HISTORY)}/${MIN_HISTORY}).`
          : reason === "no_pattern"
            ? "Sem padrão forte agora. Aguardando a próxima rodada da mesa."
            : reason === "next_round"
              ? "Aguardando a próxima rodada da mesa."
              : "Lendo as últimas rodadas da mesa."}
      </p>
      <div className="mt-4 w-full sm:mt-6">
        <div className="mb-1.5 flex justify-end text-[11px] font-semibold text-muted-foreground">
          <span className="tabular-nums">{left}s</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-success/60 to-success transition-[width] duration-100 ease-linear"
            style={{ width: `${(elapsed / total) * 100}%` }}
          >
            <span className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-success shadow-[0_0_12px_var(--success)]" />
          </div>
        </div>
      </div>
    </Panel>
  );
}
