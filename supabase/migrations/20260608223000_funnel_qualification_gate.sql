-- Funnel "Strategická konzultace" — qualification gate tracking
-- Přidává funnel sloupce do profiles + tabulku qualification_log pro analytiku.
-- Idempotentní (IF NOT EXISTS) — bezpečné spustit vícekrát.

-- 1. profiles: funnel stav (cache výsledku gate + milníky)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vsl_watched_percent integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qualification_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS qualification_checked_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS arr_call_booked_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consultation_purchased_at timestamptz;

-- 2. qualification_log: každý běh gate (kdo spadl kam) pro analytiku + debug
CREATE TABLE IF NOT EXISTS public.qualification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  result jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS qualification_log_user_id_idx ON public.qualification_log(user_id);

-- 3. RLS — uživatel vidí/zapisuje jen své záznamy, admin vidí vše
ALTER TABLE public.qualification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qlog insert own" ON public.qualification_log;
CREATE POLICY "qlog insert own" ON public.qualification_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "qlog select own" ON public.qualification_log;
CREATE POLICY "qlog select own" ON public.qualification_log
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "qlog admin select" ON public.qualification_log;
CREATE POLICY "qlog admin select" ON public.qualification_log
  FOR SELECT USING (public.is_admin());
