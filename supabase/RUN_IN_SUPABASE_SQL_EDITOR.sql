-- ============================================================================
-- ClassCode Tracker - Complete Supabase Database Setup Script
-- Copy ALL lines below -> Paste into Supabase Console -> SQL Editor -> Click RUN
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('STUDENT', 'ADMIN', 'SUPER_ADMIN')) DEFAULT 'STUDENT',
  name TEXT NOT NULL,
  roll_number TEXT UNIQUE,
  department TEXT NOT NULL DEFAULT 'CSE',
  section TEXT NOT NULL DEFAULT 'A',
  batch_year INTEGER NOT NULL DEFAULT 2025,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active_deleted ON public.profiles(is_active, deleted_at);
CREATE INDEX IF NOT EXISTS idx_profiles_dept_sec_batch ON public.profiles(department, section, batch_year);

-- 2. SECURITY DEFINER HELPER FUNCTION FOR RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('ADMIN', 'SUPER_ADMIN')
      AND is_active = true
      AND deleted_at IS NULL
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3. PLATFORM ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.platform_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('leetcode', 'codeforces', 'codechef', 'atcoder', 'geeksforgeeks', 'hackerrank', 'interviewbit', 'code360')),
  handle TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'VERIFIED', 'FAILED')) DEFAULT 'PENDING',
  verify_token TEXT NOT NULL,
  verified_at TIMESTAMPTZ NULL,
  last_synced_at TIMESTAMPTZ NULL,
  sync_status TEXT NOT NULL CHECK (sync_status IN ('OK', 'STALE', 'FAILED')) DEFAULT 'STALE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_user_platform UNIQUE (user_id, platform)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unq_verified_platform_handle 
ON public.platform_accounts(platform, lower(handle)) 
WHERE (status = 'VERIFIED');

CREATE INDEX IF NOT EXISTS idx_pa_user_platform ON public.platform_accounts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_pa_status ON public.platform_accounts(status);

-- 4. PLATFORM SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS public.platform_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rating INTEGER DEFAULT 0,
  max_rating INTEGER DEFAULT 0,
  global_rank INTEGER DEFAULT 0,
  country_rank INTEGER DEFAULT 0,
  total_solved INTEGER DEFAULT 0,
  easy_solved INTEGER DEFAULT 0,
  medium_solved INTEGER DEFAULT 0,
  hard_solved INTEGER DEFAULT 0,
  contests_attended INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  compact_metrics JSONB DEFAULT '{}'::jsonb,
  raw_payload JSONB NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_snapshot_user_platform_date UNIQUE (user_id, platform, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_platform_date ON public.platform_snapshots(user_id, platform, snapshot_date DESC);

-- 5. RATING HISTORIES TABLE
CREATE TABLE IF NOT EXISTS public.rating_histories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  contest_name TEXT NOT NULL,
  contest_id TEXT,
  rating INTEGER NOT NULL,
  rank INTEGER,
  rating_change INTEGER DEFAULT 0,
  contest_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_rating_history UNIQUE (user_id, platform, contest_name, contest_date)
);

CREATE INDEX IF NOT EXISTS idx_rating_histories_user ON public.rating_histories(user_id, platform, contest_date DESC);

-- 6. SUBMISSION DAYS TABLE
CREATE TABLE IF NOT EXISTS public.submission_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  submission_date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_user_platform_subdate UNIQUE (user_id, platform, submission_date)
);

CREATE INDEX IF NOT EXISTS idx_submission_days_user_date ON public.submission_days(user_id, submission_date DESC);

-- 7. CONTESTS TABLE
CREATE TABLE IF NOT EXISTS public.contests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('BEFORE', 'CODING', 'FINISHED')) DEFAULT 'BEFORE',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unq_contest_platform_name_start UNIQUE (platform, name, start_time)
);

CREATE INDEX IF NOT EXISTS idx_contests_start_phase ON public.contests(start_time ASC, phase);

-- 8. LEADERBOARD CACHE TABLE
CREATE TABLE IF NOT EXISTS public.leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope TEXT NOT NULL CHECK (scope IN ('OVERALL', 'LEETCODE', 'CODECHEF', 'CODEFORCES', 'ATCODER', 'GEEKSFORGEEKS', 'HACKERRANK', 'INTERVIEWBIT', 'CODE360')),
  filter_time TEXT NOT NULL CHECK (filter_time IN ('ALL_TIME', 'LAST_30_DAYS')) DEFAULT 'ALL_TIME',
  department TEXT NOT NULL DEFAULT 'ALL',
  section TEXT NOT NULL DEFAULT 'ALL',
  batch_year INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  roll_number TEXT NOT NULL,
  student_name TEXT NOT NULL,
  total_solved INTEGER NOT NULL DEFAULT 0,
  rating_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  overall_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  rank_change_week INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lb_cache_scope ON public.leaderboard_cache(scope, filter_time, department, section, batch_year, rank ASC);

-- 9. SCORE CONFIGS TABLE
CREATE TABLE IF NOT EXISTS public.score_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  weight_problems_solved NUMERIC(4,2) NOT NULL DEFAULT 0.35,
  weight_cf_rating NUMERIC(4,2) NOT NULL DEFAULT 0.20,
  weight_lc_rating NUMERIC(4,2) NOT NULL DEFAULT 0.20,
  weight_cc_rating NUMERIC(4,2) NOT NULL DEFAULT 0.10,
  weight_atcoder_rating NUMERIC(4,2) NOT NULL DEFAULT 0.05,
  weight_contests NUMERIC(4,2) NOT NULL DEFAULT 0.05,
  weight_streak NUMERIC(4,2) NOT NULL DEFAULT 0.05,
  inactive_days_threshold INTEGER NOT NULL DEFAULT 14,
  tier_elite_min_solved INTEGER NOT NULL DEFAULT 400,
  tier_advanced_min_solved INTEGER NOT NULL DEFAULT 250,
  tier_intermediate_min_solved INTEGER NOT NULL DEFAULT 100,
  anonymize_student_names BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.score_configs (is_active) VALUES (true) ON CONFLICT DO NOTHING;

-- 10. SYNC JOBS TABLE
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL CHECK (job_type IN ('USER_SYNC', 'CONTEST_SYNC', 'LEADERBOARD_RECOMPUTE', 'PRUNE_RETENTION')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')) DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ NULL,
  locked_by TEXT NULL,
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_pending ON public.sync_jobs(status, next_run_at ASC, attempts) WHERE (status = 'PENDING');

-- 11. ADAPTER HEALTH TABLE
CREATE TABLE IF NOT EXISTS public.adapter_health (
  platform TEXT PRIMARY KEY,
  is_healthy BOOLEAN NOT NULL DEFAULT true,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT NULL,
  circuit_broken_until TIMESTAMPTZ NULL,
  last_success_at TIMESTAMPTZ NULL,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- 13. LOGIN ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  ip_address INET NOT NULL,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON public.login_attempts(email, ip_address, attempted_at DESC);

-- 14. CONSENT RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  policy_version TEXT NOT NULL DEFAULT 'DPDP-2023-v1.0',
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET NULL,
  user_agent TEXT NULL,
  CONSTRAINT unq_user_consent_version UNIQUE (user_id, policy_version)
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adapter_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR (SELECT public.is_admin()));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR (SELECT public.is_admin())) WITH CHECK (id = auth.uid() OR (SELECT public.is_admin()));

CREATE POLICY "pa_select" ON public.platform_accounts FOR SELECT TO authenticated USING (user_id = auth.uid() OR (SELECT public.is_admin()));
CREATE POLICY "pa_insert_student" ON public.platform_accounts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'PENDING');
CREATE POLICY "pa_delete_student" ON public.platform_accounts FOR DELETE TO authenticated USING (user_id = auth.uid() OR (SELECT public.is_admin()));

CREATE POLICY "snapshots_select" ON public.platform_snapshots FOR SELECT TO authenticated USING (user_id = auth.uid() OR (SELECT public.is_admin()));
CREATE POLICY "rating_select" ON public.rating_histories FOR SELECT TO authenticated USING (user_id = auth.uid() OR (SELECT public.is_admin()));
CREATE POLICY "submission_days_select" ON public.submission_days FOR SELECT TO authenticated USING (user_id = auth.uid() OR (SELECT public.is_admin()));
CREATE POLICY "contests_read_all" ON public.contests FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "leaderboard_admin_read" ON public.leaderboard_cache FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "score_configs_read" ON public.score_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "score_configs_admin_write" ON public.score_configs FOR ALL TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "sync_jobs_read" ON public.sync_jobs FOR SELECT TO authenticated USING ((payload->>'userId')::uuid = auth.uid() OR (SELECT public.is_admin()));
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "consent_select_own" ON public.consent_records FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "consent_insert_own" ON public.consent_records FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
