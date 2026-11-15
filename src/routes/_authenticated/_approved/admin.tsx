import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Radio,
  ArrowLeft,
  Ban,
  Check,
  KeyRound,
  Loader2,
  Power,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteUserAccount } from "@/lib/admin.functions";
import { connectLiveTable } from "@/lib/live-table.functions";
import { liveTableQuery } from "@/lib/queries";
import { Avatar } from "@/components/bacbo/Avatar";
import { allProfilesQuery, settingsQuery, type Profile } from "@/lib/queries";
import { useRobot } from "@/lib/robot-context";
import { feedErrorMessage } from "@/lib/live-table";
import { clampAnalysisSeconds, MAX_ANALYSIS_S, MIN_ANALYSIS_S } from "@/lib/robot-schedule";
import { cn } from "@/lib/utils";

type Status = Database["public"]["Enums"]["account_status"];

export const Route = createFileRoute("/_authenticated/_approved/admin")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin) throw redirect({ to: "/robos" });
  },
  head: () => ({
    meta: [
      { title: "Painel Admin — Bac Bo Live" },
      {
        name: "description",
        content: "Gerencie cadastros, acessos e calibragem do robô Bac Bo Live.",
      },
      { property: "og:title", content: "Painel Admin — Bac Bo Live" },
      { property: "og:description", content: "Área administrativa do robô Bac Bo Live." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Tab = "pending" | "users" | "robot" | "account";

function AdminPage() {
  const { profile: me } = Route.useRouteContext();
  const [tab, setTab] = useState<Tab>("pending");
  const { data: profiles = [], isLoading } = useQuery(allProfilesQuery);
  const queryClient = useQueryClient();

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: allProfilesQuery.queryKey });
      const prev = queryClient.getQueryData(allProfilesQuery.queryKey);
      queryClient.setQueryData(allProfilesQuery.queryKey, (old: Profile[] = []) =>
        old.map((p) => (p.id === id ? { ...p, status } : p)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(allProfilesQuery.queryKey, ctx.prev);
      toast.error("Não foi possível atualizar o acesso.");
    },
    onSuccess: (_d, { status }) => {
      const msg: Record<Status, string> = {
        approved: "Acesso liberado",
        rejected: "Cadastro recusado",
        blocked: "Acesso bloqueado",
        pending: "Movido para pendentes",
      };
      toast.success(msg[status]);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: allProfilesQuery.queryKey }),
  });

  const deleteFn = useServerFn(deleteUserAccount);
  const [toDelete, setToDelete] = useState<Profile | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { userId: id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: allProfilesQuery.queryKey });
      const prev = queryClient.getQueryData(allProfilesQuery.queryKey);
      queryClient.setQueryData(allProfilesQuery.queryKey, (old: Profile[] = []) =>
        old.filter((p) => p.id !== id),
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(allProfilesQuery.queryKey, ctx.prev);
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir o cadastro.");
    },
    onSuccess: () => toast.success("Cadastro excluído"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: allProfilesQuery.queryKey }),
  });

  const pending = profiles.filter((p) => p.status === "pending");
  const others = profiles.filter((p) => p.status !== "pending");

  return (
    <div className="mx-auto space-y-3 pt-2 sm:space-y-4 lg:max-w-3xl">
      <header className="flex items-center gap-3">
        <Link
          to="/perfil"
          aria-label="Voltar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">
            Painel do Administrador
          </h1>
          <p className="text-xs text-muted-foreground">Acessos, robô e senha</p>
        </div>
      </header>

      <div className="glass grid grid-cols-4 gap-1 rounded-2xl p-1">
        {(
          [
            ["pending", "Pendentes"],
            ["users", "Usuários"],
            ["robot", "Robô"],
            ["account", "Senha"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="relative rounded-xl px-1 py-2 text-xs font-semibold sm:py-2.5 sm:text-sm"
          >
            {tab === k && (
              <motion.span
                layoutId="admin-tab"
                className="absolute inset-0 rounded-xl bg-secondary ring-1 ring-border"
              />
            )}
            <span
              className={cn(
                "relative block truncate",
                tab === k ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {k === "pending" && pending.length > 0 && (
              <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-tie px-1 text-[10px] font-bold text-background">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "pending" && (
            <List loading={isLoading} empty="Nenhum cadastro aguardando aprovação.">
              {pending.map((p) => (
                <UserRow key={p.id} p={p}>
                  <IconBtn
                    tone="success"
                    label="Aprovar"
                    onClick={() => setStatus.mutate({ id: p.id, status: "approved" })}
                  >
                    <Check className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    tone="danger"
                    label="Recusar"
                    onClick={() => setStatus.mutate({ id: p.id, status: "rejected" })}
                  >
                    <X className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn tone="muted" label="Excluir" onClick={() => setToDelete(p)}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </UserRow>
              ))}
            </List>
          )}
          {tab === "users" && (
            <List loading={isLoading} empty="Nenhum usuário ainda.">
              {others.map((p) => (
                <UserRow key={p.id} p={p} badge={p.status}>
                  {p.id === me.id ? (
                    <span className="text-[11px] text-muted-foreground">Você</span>
                  ) : (
                    <>
                      {p.status === "approved" ? (
                        <IconBtn
                          tone="danger"
                          label="Bloquear"
                          onClick={() => setStatus.mutate({ id: p.id, status: "blocked" })}
                        >
                          <Ban className="h-4 w-4" />
                        </IconBtn>
                      ) : (
                        <IconBtn
                          tone="success"
                          label="Reativar"
                          onClick={() => setStatus.mutate({ id: p.id, status: "approved" })}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </IconBtn>
                      )}
                      <IconBtn tone="muted" label="Excluir" onClick={() => setToDelete(p)}>
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </>
                  )}
                </UserRow>
              ))}
            </List>
          )}
          {tab === "robot" && <RobotControls />}
          {tab === "account" && <PasswordForm />}
        </motion.div>
      </AnimatePresence>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta de {toDelete?.name || toDelete?.email} será apagada de vez. A pessoa precisará
              se cadastrar de novo para pedir acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toDelete) remove.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function List({
  loading,
  empty,
  children,
}: {
  loading: boolean;
  empty: string;
  children: ReactNode[];
}) {
  if (loading) return <div className="glass h-24 animate-pulse rounded-2xl" />;
  if (children.length === 0)
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <Users className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  return <ul className="space-y-2">{children}</ul>;
}

const BADGE: Record<Status, string> = {
  approved: "border-success/30 bg-success/10 text-success",
  pending: "border-tie/30 bg-tie/10 text-tie",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  blocked: "border-destructive/30 bg-destructive/10 text-destructive",
};
const BADGE_LABEL: Record<Status, string> = {
  approved: "Ativo",
  pending: "Pendente",
  rejected: "Recusado",
  blocked: "Bloqueado",
};

function UserRow({ p, badge, children }: { p: Profile; badge?: Status; children: ReactNode }) {
  return (
    <motion.li layout className="glass flex items-center gap-2.5 rounded-2xl p-2.5 sm:gap-3 sm:p-3">
      <Avatar
        value={p.avatar_url}
        name={p.name}
        className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
        textClass="text-sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold sm:text-base">{p.name || "Sem nome"}</p>
          {badge && (
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase",
                BADGE[badge],
              )}
            >
              {BADGE_LABEL[badge]}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{p.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </motion.li>
  );
}

function IconBtn({
  tone,
  label,
  onClick,
  children,
}: {
  tone: "success" | "danger" | "muted";
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold sm:h-10 sm:px-3",
        tone === "success" && "border-success/30 bg-success/10 text-success",
        tone === "danger" && "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "muted" &&
          "border-border bg-secondary text-muted-foreground hover:text-destructive",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}

function RobotControls() {
  const queryClient = useQueryClient();
  const robot = useRobot();
  const { data: settings } = useQuery(settingsQuery);
  const [minConfidence, setMinConfidence] = useState(70);
  const [seconds, setSeconds] = useState(5);
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setMinConfidence(clampConfidence(settings.min_confidence));
    setSeconds(clampAnalysisSeconds(settings.analysis_seconds));
    setMaintenance(settings.maintenance);
  }, [settings]);

  const save = useMutation({
    mutationFn: async (patch: {
      min_confidence?: number;
      analysis_seconds?: number;
      maintenance?: boolean;
    }) => {
      const now = new Date().toISOString();
      // Restart the shared schedule so every user switches to the new timing together.
      const restart =
        settings?.running &&
        (patch.min_confidence !== undefined || patch.analysis_seconds !== undefined);
      const { error } = await supabase
        .from("robot_settings")
        .update({ ...patch, ...(restart ? { started_at: now } : {}), updated_at: now })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Robô atualizado");
      queryClient.invalidateQueries({ queryKey: settingsQuery.queryKey });
    },
    onError: () => toast.error("Não foi possível salvar."),
  });

  return (
    <div className="space-y-3">
      <div className="glass flex items-center gap-3 rounded-2xl p-4 sm:p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-success/30 bg-success/10 text-success">
          <Power className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Robô ligado</p>
          <p className="text-xs text-muted-foreground">
            Só você liga o robô. Desligado, ninguém recebe sinais.
          </p>
        </div>
        <Switch
          checked={robot.running}
          disabled={robot.toggling}
          onCheckedChange={() => robot.toggle()}
        />
      </div>

      <FeedStatus />

      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Força mínima do padrão</p>
            <p className="text-xs text-muted-foreground">
              Só confirma entrada quando o padrão atinge este nível
            </p>
          </div>
          <span className="font-display text-xl font-extrabold sm:text-2xl text-success">
            {minConfidence}%
          </span>
        </div>
        <Slider
          className="mt-4"
          min={MIN_CONFIDENCE}
          max={MAX_CONFIDENCE}
          step={1}
          value={[minConfidence]}
          onValueChange={([v]) => setMinConfidence(v ?? 70)}
        />
        <p className="mt-3 text-[11px] text-muted-foreground">
          {minConfidence >= 73
            ? "Muito alto: a mesa quase nunca forma um padrão tão forte, então os sinais ficam raros."
            : minConfidence <= 62
              ? "Baixo: muitos sinais, mas menos filtrados."
              : "Recomendado: 70%. Mais alto = menos sinais e mais seletivos."}
        </p>
      </div>

      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Tempo da análise</p>
            <p className="text-xs text-muted-foreground">
              Segundos depois que a rodada fecha na mesa. Menos tempo = mais tempo para apostar.
            </p>
          </div>
          <span className="font-display text-xl font-extrabold sm:text-2xl">{seconds}s</span>
        </div>
        <Slider
          className="mt-4"
          min={MIN_ANALYSIS_S}
          max={MAX_ANALYSIS_S}
          step={1}
          value={[seconds]}
          onValueChange={([v]) => setSeconds(v ?? 5)}
        />
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        disabled={save.isPending}
        onClick={() => save.mutate({ min_confidence: minConfidence, analysis_seconds: seconds })}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-success/90 to-success font-semibold text-background disabled:opacity-60"
      >
        <ShieldCheck className="h-4 w-4" /> Salvar calibragem
      </motion.button>

      <div className="glass flex items-center gap-3 rounded-2xl p-4 sm:p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-tie/30 bg-tie/10 text-tie">
          <Wrench className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Modo manutenção</p>
          <p className="text-xs text-muted-foreground">Pausa o robô para todos os usuários</p>
        </div>
        <Switch
          checked={maintenance}
          onCheckedChange={(v) => {
            setMaintenance(v);
            save.mutate({ maintenance: v });
          }}
        />
      </div>
    </div>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.next.length < 6) return setError("A nova senha precisa de pelo menos 6 caracteres.");
    if (form.next.length > 72) return setError("A nova senha é muito longa.");
    if (form.next !== form.confirm) return setError("As senhas novas não são iguais.");
    if (form.next === form.current) return setError("A nova senha precisa ser diferente da atual.");
    setSaving(true);
    try {
      // The backend requires and checks the current password, so a wrong one is rejected.
      const { error } = await supabase.auth.updateUser({
        password: form.next,
        current_password: form.current,
      });
      if (error) {
        const m = error.message.toLowerCase();
        return setError(
          m.includes("current") || m.includes("reauth") || m.includes("invalid")
            ? "Senha atual incorreta."
            : m.includes("weak") || m.includes("pwned") || m.includes("leak")
              ? "Essa senha é fraca ou já apareceu em vazamentos. Escolha outra."
              : "Não foi possível alterar a senha. Tente outra.",
        );
      }
      setForm({ current: "", next: "", confirm: "" });
      toast.success("Senha alterada");
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof typeof form, placeholder: string, autoComplete: string) => (
    <input
      type="password"
      placeholder={placeholder}
      autoComplete={autoComplete}
      value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      className="h-12 w-full rounded-xl border border-border bg-card/70 px-4 text-[15px] outline-none placeholder:text-muted-foreground focus:border-foreground/25"
    />
  );

  return (
    <form onSubmit={onSubmit} className="glass space-y-3 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-tie/30 bg-tie/10 text-tie">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">Alterar minha senha</p>
          <p className="text-xs text-muted-foreground">Informe a senha atual e escolha a nova</p>
        </div>
      </div>
      {field("current", "Senha atual", "current-password")}
      {field("next", "Nova senha", "new-password")}
      {field("confirm", "Repita a nova senha", "new-password")}
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      <motion.button
        whileTap={{ scale: 0.98 }}
        disabled={saving}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-success/90 to-success font-semibold text-background disabled:opacity-60"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}{" "}
        Salvar nova senha
      </motion.button>
    </form>
  );
}

function FeedStatus() {
  const queryClient = useQueryClient();
  const { feed, rounds, tableError } = useRobot();
  const last = rounds[rounds.length - 1];
  const problem = feedErrorMessage(feed?.lastError) ?? (tableError ? feedErrorMessage("x") : null);
  const [key, setKey] = useState("");
  const connectFn = useServerFn(connectLiveTable);
  const connect = useMutation({
    mutationFn: () => connectFn({ data: { key } }),
    onSuccess: (r) => {
      if (r.ok) {
        setKey("");
        toast.success("Mesa conectada. Recebendo rodadas.");
        void queryClient.invalidateQueries({ queryKey: liveTableQuery.queryKey });
      } else {
        toast.error(feedErrorMessage(r.error) ?? "Não foi possível conectar.");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível conectar."),
  });
  return (
    <div className="glass space-y-3 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border",
            problem
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-success/30 bg-success/10 text-success",
          )}
        >
          <Radio className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Mesa ao vivo (LynxMetrics)</p>
          <p className="text-xs text-muted-foreground">
            {problem ??
              (last
                ? `Conectada · recebendo rodadas (${rounds.length})`
                : feed?.lastSuccessAt
                  ? "Conectada · aguardando a próxima rodada da mesa."
                  : "Sem conexão com a mesa.")}
          </p>
        </div>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (key.trim()) connect.mutate();
        }}
      >
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Cole a chave (sk-lynx…)"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background/60 px-3 text-sm outline-none focus:border-success/60"
        />
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={connect.isPending || !key.trim()}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-success px-4 text-sm font-semibold text-background disabled:opacity-50"
        >
          {connect.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Ligar conexão
        </motion.button>
      </form>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Use a chave do Bac Bo Live criada no painel da LynxMetrics. Ela é testada antes de ser
        salva, e a mesa reconecta na hora, já buscando as últimas rodadas.
      </p>
    </div>
  );
}
