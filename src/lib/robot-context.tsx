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
  clampAnalysisSeconds,
  liveWindow,
  mergeSignals,
  robotView,
  signalsBetween,
  type RobotView,
  type ScheduleConfig,
  type SessionSignal,
} from "@/lib/robot-schedule";
import { loadHistory, saveHistory } from "@/lib/session-history";

interface RobotState extends RobotView {
  running: boolean;
  maintenance: boolean;
  analysisMs: number;
  isAdmin: boolean;
  /** Real rounds received from the live table, oldest first. */
  rounds: LiveRound[];
  /** Server time minus this device's time; phase times below are already in device time. */
  clockOffset: number;
  /** Feed health, admin only. */
  feed: { lastSuccessAt: number | null; lastError: string | null } | null;
  /** True when the live table could not be read on the last attempt. */
  tableError: boolean;
  /** Signals generated during this login session, newest first. */
  sessionSignals: SessionSignal[];
  toggling: boolean;
  /** Admin only: switches the robot on/off for everyone. */
  toggle: () => void;
}

const RobotCtx = createContext<RobotState | null>(null);
const NO_ROUNDS: LiveRound[] = [];

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
  const active = running && !maintenance;

  // Poll the live table often while the robot runs; slowly otherwise (history stays fresh).
  const live = useQuery({ ...liveTableQuery, refetchInterval: active ? 4_000 : 20_000 });
  const allRounds = live.data?.rounds ?? NO_ROUNDS;
  const clockOffset = live.data?.clockOffset ?? 0;

  const [now, setNow] = useState(() => Date.now());
  // Tick so a table that stops sending is noticed even without new data.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + clockOffset), 5_000);
    return () => clearInterval(id);
  }, [clockOffset]);

  // Only the live run of rounds counts; hours-old rounds from a past connection are hidden.
  const window = liveWindow(allRounds, now);
  const windowStart = allRounds.length - window.length;
  const rounds = useMemo(
    () => (windowStart === 0 ? allRounds : allRounds.slice(windowStart)),
    [allRounds, windowStart],
  );
  const [sessionSignals, setSessionSignals] = useState<SessionSignal[]>([]);

  useEffect(() => {
    setSessionSignals(loadHistory(userId, sessionStart));
  }, [userId, sessionStart]);

  const analysisMs = clampAnalysisSeconds(settings?.analysis_seconds ?? 5) * 1000;
  const startedAt = settings?.started_at ? Date.parse(settings.started_at) : 0;
  const minConfidence = settings?.min_confidence ?? 70;

  const cfg = useMemo<ScheduleConfig | null>(
    () => (active ? { startedAt, analysisMs, minConfidence } : null),
    [active, startedAt, analysisMs, minConfidence],
  );

  // All timing runs on the server clock so every device flips at the same moment.
  useEffect(() => setNow(Date.now() + clockOffset), [cfg, allRounds, clockOffset]);
  const view = useMemo(() => robotView(cfg, rounds, now), [cfg, rounds, now]);

  // Re-render exactly when the view changes on its own (signal reveal, hold timeout).
  useEffect(() => {
    if (!Number.isFinite(view.wakeAt)) return;
    const wait = view.wakeAt - (Date.now() + clockOffset) + 30;
    const t = setTimeout(() => setNow(Date.now() + clockOffset), Math.max(50, wait));
    return () => clearTimeout(t);
  }, [view.wakeAt, clockOffset]);

  // Record every signal revealed since this login.
  useEffect(() => {
    if (!cfg) return;
    const found = signalsBetween(cfg, rounds, Math.max(sessionStart, cfg.startedAt), now);
    if (!found.length) return;
    setSessionSignals((prev) => {
      const next = mergeSignals(prev, found);
      if (next.length === prev.length && next[0]?.key === prev[0]?.key) return prev;
      saveHistory(userId, sessionStart, next);
      return next;
    });
  }, [cfg, rounds, now, sessionStart, userId]);

  const mutation = useMutation({
    mutationFn: async (on: boolean) => {
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
      toast.success(data.running ? "Robô ligado para todos os usuários" : "Robô desligado");
    },
    onError: () => toast.error("Não foi possível alterar o robô."),
  });

  const toggle = useCallback(() => {
    if (!isAdmin || mutation.isPending) return;
    mutation.mutate(!running);
  }, [isAdmin, mutation, running]);

  const tableError = live.isError;
  const feed = live.data?.feed ?? null;

  const value = useMemo<RobotState>(
    () => ({
      ...view,
      // Expose phase times in this device's clock for progress bars.
      phaseStart: view.phaseStart - clockOffset,
      phaseEnd: view.phaseEnd - clockOffset,
      wakeAt: view.wakeAt - clockOffset,
      running,
      maintenance,
      analysisMs,
      isAdmin,
      rounds,
      clockOffset,
      feed,
      tableError,
      sessionSignals,
      toggling: mutation.isPending,
      toggle,
    }),
    [
      view,
      clockOffset,
      running,
      maintenance,
      analysisMs,
      isAdmin,
      rounds,
      feed,
      tableError,
      sessionSignals,
      mutation.isPending,
      toggle,
    ],
  );

  return <RobotCtx.Provider value={value}>{children}</RobotCtx.Provider>;
}

export function useRobot() {
  const ctx = useContext(RobotCtx);
  if (!ctx) throw new Error("useRobot must be used inside RobotProvider");
  return ctx;
}
