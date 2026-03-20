-- Strategy tables: consultation records, client tasks, client questions

-- 1. Consultation records (zápisy ze setkání)
CREATE TABLE public.consultation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.consultation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consultation records"
  ON public.consultation_records FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Admins can manage all consultation records"
  ON public.consultation_records FOR ALL
  USING (public.is_admin());

CREATE TRIGGER update_consultation_records_updated_at
  BEFORE UPDATE ON public.consultation_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Client tasks (úkoly)
CREATE TABLE public.client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT NOT NULL CHECK (assigned_to IN ('klient', 'rr')),
  deadline DATE,
  is_completed BOOLEAN DEFAULT false,
  consultation_id UUID REFERENCES public.consultation_records(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON public.client_tasks FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Users can update own tasks"
  ON public.client_tasks FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admins can manage all tasks"
  ON public.client_tasks FOR ALL
  USING (public.is_admin());

CREATE TRIGGER update_client_tasks_updated_at
  BEFORE UPDATE ON public.client_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Client questions (dotazy)
CREATE TABLE public.client_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  is_sos BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  answered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own questions"
  ON public.client_questions FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Users can create own questions"
  ON public.client_questions FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own questions"
  ON public.client_questions FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Admins can manage all questions"
  ON public.client_questions FOR ALL
  USING (public.is_admin());

CREATE TRIGGER update_client_questions_updated_at
  BEFORE UPDATE ON public.client_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
