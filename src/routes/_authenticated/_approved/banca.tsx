import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { RotateCcw, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_approved/banca")({
  head: () => ({
    meta: [
      { title: "Gestão de Banca — Bac Bo Live" },
      { name: "description", content: "Calcule sua entrada, meta de lucro e limite de perda do dia." },
      { property: "og:title", content: "Gestão de Banca — Bac Bo Live" },
      { property: "og:description", content: "Stop-Win, Stop-Loss e valor de entrada recomendado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BankPage,
});

const KEY = "bacbo:banca";
interface Plan { bank: number; win: number; loss: number; stake: number; current: number }
const DEFAULT: Plan = { bank: 10000, win: 15, loss: 10, stake: 2, current: 10000 };
const brl = (n: number) =>
  `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;

function BankPage() {
  const [plan, setPlan] = useState<Plan>(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setPlan({ ...DEFAULT, ...JSON.parse(raw) }); } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(plan)); }, [plan, loaded]);

  const set = (k: keyof Plan) => (v: number) => setPlan((p) => ({ ...p, [k]: Number.isFinite(v) ? v : 0 }));
  const target = plan.bank * (1 + plan.win / 100);
  const floor = plan.bank * (1 - plan.loss / 100);
  const entry = plan.bank * (plan.stake / 100);
  const profit = plan.current - plan.bank;
  const progress = profit >= 0
    ? Math.min(100, (profit / (target - plan.bank || 1)) * 100)
    : Math.min(100, (-profit / (plan.bank - floor || 1)) * 100);
  const status = plan.current >= target ? "win" : plan.current <= floor ? "loss" : "ok";

  return (
    <div className="mx-auto space-y-3 pt-2 sm:space-y-4 lg:max-w-3xl">
      <header className="flex items-center gap-3 pb-1">
        <div className="liquid-glass flex h-11 w-11 items-center justify-center rounded-2xl">
          <Wallet className="h-5 w-5 text-success" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Gestão de Banca</h1>
          <p className="text-xs text-muted-foreground">Proteja seu lucro e limite suas perdas</p>
        </div>
      </header>

      <div className="liquid-glass space-y-3 rounded-[1.75rem] p-4 sm:p-5">
        <Field label="Banca inicial (Kz)" value={plan.bank} onChange={(v) => { set("bank")(v); set("current")(v); }} />
        <div className="grid grid-cols-3 gap-2">
          <Field label="Stop-Win %" value={plan.win} onChange={set("win")} />
          <Field label="Stop-Loss %" value={plan.loss} onChange={set("loss")} />
          <Field label="Entrada %" value={plan.stake} onChange={set("stake")} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Entrada" value={brl(entry)} tone="text-foreground" />
        <Stat label="Meta" value={brl(target)} tone="text-success" />
        <Stat label="Limite" value={brl(floor)} tone="text-destructive" />
      </div>

      <div className="liquid-glass space-y-3 rounded-[1.75rem] p-4 sm:p-5">
        <Field label="Banca atual (Kz)" value={plan.current} onChange={set("current")} />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Resultado do dia</span>
          <span className={cn("font-display font-extrabold", profit >= 0 ? "text-success" : "text-destructive")}>
            {profit >= 0 ? "+" : ""}{brl(profit)}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            animate={{ width: `${progress}%` }}
            className={cn("h-full rounded-full", profit >= 0 ? "bg-success" : "bg-destructive")}
          />
        </div>
        <p className={cn("text-center text-sm font-semibold",
          status === "win" ? "text-success" : status === "loss" ? "text-destructive" : "text-muted-foreground")}>
          {status === "win" ? "Meta atingida! Pare por hoje e garanta o lucro."
            : status === "loss" ? "Limite de perda atingido. Pare por hoje."
            : `Faltam ${brl(Math.max(0, target - plan.current))} para a meta.`}
        </p>
        <button
          type="button"
          onClick={() => setPlan((p) => ({ ...p, current: p.bank }))}
          className="liquid-glass mx-auto flex h-10 items-center gap-2 rounded-full px-5 text-xs font-semibold"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Novo dia
        </button>
      </div>
      <p className="px-3 text-center text-[11px] text-muted-foreground/70">
        Jogue com responsabilidade · +18. Nunca aposte mais do que pode perder.
      </p>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((t) => (parseNum(t) === value ? t : String(value)));
  }, [value]);
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</span>
      <input
        type="text" inputMode="decimal" value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.,]/g, "");
          setText(t);
          onChange(parseNum(t));
        }}
        className="h-11 w-full rounded-xl border border-border bg-card/60 px-3 text-[15px] tabular-nums outline-none focus:border-foreground/25"
      />
    </label>
  );
}

function parseNum(t: string) {
  const n = parseFloat(t.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="liquid-glass rounded-2xl p-3 text-center">
      <p className={cn("truncate font-display text-sm font-extrabold", tone)}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
