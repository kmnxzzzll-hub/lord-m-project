import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { liveTableQuery, settingsQuery, type RobotSettings } from "@/lib/queries";
import type { LiveRound } from "@/lib/live-table";
import {
  AUTO_CONFIDENCE,
  liveWindow,
  mergeSignals,
  robotView,
  signalsBetween,
  type RobotView,
  type ScheduleConfig,
  type SessionSignal,
} from "@/lib/robot-schedule";
import { loadHistory, saveHistory } from "@/lib/session-history";
import { scoreSignals } from "@/lib/scoreboard";

interface RobotState extends RobotView {
  running: boolean;
  maintenance: boolean;
  apiPaused: boolean;
  isAdmin: boolean;
  rounds: LiveRound[];
  clockOffset: number;
  feed: { lastSuccessAt: number | null; lastError: string | null } | null;
  tableError: boolean;
  sessionSignals: SessionSignal[];
  toggling: boolean;
  toggle: () => void;
  toggleApiPause: () => void;
  pausedUntil: number | null;
}

const RobotCtx = createContext<RobotState | null>(null);
const NO_ROUNDS: LiveRound[] = [];
const PAUSE_MS = 5 * 60 * 1000;
const API_PAUSE_KEY = "bacbo:api-paused";
const ADMIN_LOG_KEY = "bacbo:admin-log";

function logAdminAction(action: string) {
  try {
    const prev = JSON.parse(localStorage.getItem(ADMIN_LOG_KEY) || "[]") as string[];
    const entry = `${new Date().toLocaleString("pt-BR")} — ${action}`;
    localStorage.setItem(ADMIN_LOG_KEY, JSON.stringify([entry, ...prev].slice(0, 30)));
  } catch {
    /* ignore */
  }
}

export function RobotProvider({
  userId,
  sessionStart,
  isAdmin,
  children,
}: {
  userId: string;
  sessionStart: number;
  isAdmin: boolean;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery(settingsQuery);
  const running = !!settings?.running && !!settings.started_at;
  const maintenance = settings?.maintenance ?? false;

  const [apiPaused, setApiPaused] = useState(() => {
    try {
      return localStorage.getItem(API_PAUSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [pausedUntil, setPausedUntil] = useState<number | null>(null);
  const isPaused = pausedUntil !== null && Date.now() < pausedUntil;

  const active = running && !maintenance && !apiPaused;

  const live = useQuery({
    ...liveTableQuery,
    refetchInterval: active && !isPaused ? 2_000 : false,
  });
  const allRounds = live.data?.rounds ?? NO_ROUNDS;
  const clockOffset = live.data?.clockOffset ?? 0;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + clockOffset), 5_000);
    return () => clearInterval(id);
  }, [clockOffset]);

  const liveRun = liveWindow(allRounds, now);
  const windowStart = allRounds.length - liveRun.length;
  const rounds = useMemo(
    () => (windowStart === 0 ? allRounds : allRounds.slice(windowStart)),
    [allRounds, windowStart],
  );
  const [sessionSignals, setSessionSignals] = useState<SessionSignal[]>([]);

  useEffect(() => {
    setSessionSignals(loadHistory(userId, sessionStart));
  }, [userId, sessionStart]);

  const startedAt = settings?.started_at ? Date.parse(settings.started_at) : 0;
  const minConfidence = AUTO_CONFIDENCE;

  const cfg = useMemo<ScheduleConfig | null>(
    () => (active && !isPaused ? { startedAt, minConfidence } : null),
    [active, isPaused, startedAt, minConfidence],
  );

  useEffect(() => setNow(Date.now() + clockOffset), [cfg, allRounds, clockOffset]);
  const view = useMemo(() => robotView(cfg, rounds, now), [cfg, rounds, now]);

  useEffect(() => {
    if (!Number.isFinite(view.wakeAt)) return;
    const wait = view.wakeAt - (Date.now() + clockOffset) + 30;
    const t = setTimeout(() => setNow(Date.now() + clockOffset), Math.max(50, wait));
    return () => clearTimeout(t);
  }, [view.wakeAt, clockOffset]);

  useEffect(() => {
    if (!cfg || maintenance || apiPaused) return;
    const found = signalsBetween(cfg, rounds, Math.max(sessionStart, cfg.startedAt), now);
    if (!found.length) return;
    setSessionSignals((prev) => {
      const next = mergeSignals(prev, found);
      if (next.length === prev.length && next[0]?.key === prev[0]?.key) return prev;
      // Limit to 20 and reset cycle
      const limited = next.slice(0, 20);
      saveHistory(userId, sessionStart, limited);
      return limited;
    });
  }, [cfg, rounds, now, sessionStart, userId, maintenance, apiPaused]);

  // Auto-pause after 3 consecutive losses
  useEffect(() => {
    if (!active || isPaused) return;
    const results = scoreSignals(sessionSignals, rounds);
    const last3 = results.slice(-3);
    if (last3.length === 3 && last3.every((r) => !r.green)) {
      const until = Date.now() + PAUSE_MS;
      setPausedUntil(until);
      void supabase
        .from("robot_settings")
        .update({
          running: false,
          started_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      toast.error("MESA MANIPULANDO, SAI NÃO FIQUE TEIMOSO. Robô pausado 5 minutos.");
      logAdminAction("Auto-pausa após 3 reds");
    }
  }, [sessionSignals, rounds, active, isPaused]);

  const mutation = useMutation({
    mutationFn: async (on: boolean) => {
      if (isPaused && on) throw new Error("paused");
      const stamp = new Date(Date.now() + clockOffset).toISOString();
      const patch = {
        running: on,
        started_at: on ? stamp : null,
        ...(on ? { maintenance: false } : {}),
        updated_at: stamp,
      };
      const { data, error } = await supabase
        .from("robot_settings")
        .update(patch)
        .eq("id", 1)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: RobotSettings) => {
      queryClient.setQueryData(settingsQuery.queryKey, data);
      if (data.running) void queryClient.invalidateQueries({ queryKey: liveTableQuery.queryKey });
      const msg = data.running ? "Robô ligado para todos os usuários" : "Robô pausado 🛑";
      toast.success(msg);
      logAdminAction(data.running ? "Ligou o robô" : "Pausou o robô");
    },
    onError: (e) => {
      if (e instanceof Error && e.message === "paused") {
        toast.error("Robô em pausa automática. Aguarde 5 minutos.");
      } else {
        toast.error("Não foi possível alterar o robô.");
      }
    },
  });

  const toggle = useCallback(() => {
    if (!isAdmin || mutation.isPending || isPaused) return;
    mutation.mutate(!running);
  }, [isAdmin, mutation, running, isPaused]);

  const toggleApiPause = useCallback(() => {
    if (!isAdmin) return;
    setApiPaused((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(API_PAUSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      toast.success(next ? "API da mesa pausada" : "API da mesa reativada");
      logAdminAction(next ? "Pausou a API" : "Reativou a API");
      return next;
    });
  }, [isAdmin]);

  const tableError = live.isError;
  const feed = live.data?.feed ?? null;

  const value = useMemo<RobotState>(
    () => ({
      ...view,
      phaseStart: view.phaseStart - clockOffset,
      phaseEnd: view.phaseEnd - clockOffset,
      wakeAt: view.wakeAt - clockOffset,
      running: running && !isPaused,
      maintenance,
      apiPaused,
      isAdmin,
      rounds,
      clockOffset,
      feed,
      tableError,
      sessionSignals,
      toggling: mutation.isPending,
      toggle,
      toggleApiPause,
      pausedUntil,
    }),
    [
      view,
      clockOffset,
      running,
      isPaused,
      maintenance,
      apiPaused,
      isAdmin,
      rounds,
      feed,
      tableError,
      sessionSignals,
      mutation.isPending,
      toggle,
      toggleApiPause,
      pausedUntil,
    ],
  );

  return <RobotCtx.Provider value={value}>{children}</RobotCtx.Provider>;
}

export function useRobot() {
  const ctx = useContext(RobotCtx);
  if (!ctx) throw new Error("useRobot must be used inside RobotProvider");
  return ctx;
}
