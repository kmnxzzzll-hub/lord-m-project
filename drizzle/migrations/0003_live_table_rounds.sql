-- Real Bac Bo Live rounds received from the live table feed (newest kept a few days).
CREATE TABLE public.live_rounds (
  id text PRIMARY KEY,
  table_id text,
  started_at timestamptz,
  settled_at timestamptz NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('player', 'banker', 'tie')),
  player_dice smallint[] NOT NULL,
  banker_dice smallint[] NOT NULL,
  player_score smallint NOT NULL,
  banker_score smallint NOT NULL,
  multiplier integer,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_rounds_settled_at_idx ON public.live_rounds (settled_at DESC);

GRANT SELECT ON public.live_rounds TO authenticated;
GRANT ALL ON public.live_rounds TO service_role;
ALTER TABLE public.live_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users read live rounds" ON public.live_rounds
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

-- Single-row feed status: throttles calls to the provider and records the last error.
CREATE TABLE public.live_feed_status (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_attempt_at timestamptz NOT NULL DEFAULT 'epoch',
  last_success_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_feed_status TO authenticated;
GRANT ALL ON public.live_feed_status TO service_role;
ALTER TABLE public.live_feed_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read feed status" ON public.live_feed_status
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Atomically claims the right to call the provider; at most one caller per interval wins.
CREATE OR REPLACE FUNCTION public.claim_live_feed_sync(_min_interval_ms integer)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  claimed boolean;
BEGIN
  INSERT INTO public.live_feed_status AS s (id, last_attempt_at)
  VALUES (1, now())
  ON CONFLICT (id) DO UPDATE SET last_attempt_at = now()
    WHERE s.last_attempt_at < now() - make_interval(secs => _min_interval_ms / 1000.0)
  RETURNING true INTO claimed;
  RETURN coalesce(claimed, false);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_live_feed_sync(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_live_feed_sync(integer) TO service_role;
