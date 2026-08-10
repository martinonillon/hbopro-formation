-- =========================================================
-- SCRIPT SQL D'INITIALISATION SUPABASE (HUBJOB - SUIVI FORMATION)
-- Exécutez ce script dans l'Éditeur SQL Supabase (SQL Editor)
-- =========================================================

-- 1. Table des Utilisateurs & Droits (users)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT,
  firstName TEXT,
  lastName TEXT,
  role TEXT DEFAULT 'CONSULTANT',
  escale TEXT DEFAULT 'TOUTES',
  service TEXT DEFAULT 'TOUS',
  permissions JSONB DEFAULT '[]'::jsonb,
  agency TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table des Agents / Collaborateurs (collaborators)
CREATE TABLE IF NOT EXISTS public.collaborators (
  id TEXT PRIMARY KEY,
  lastName TEXT NOT NULL,
  firstName TEXT NOT NULL,
  matricule TEXT,
  service TEXT,
  escale TEXT,
  agency TEXT,
  email TEXT,
  avatar TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table des Suivis & Émargements de Formation (training_logs)
CREATE TABLE IF NOT EXISTS public.training_logs (
  id TEXT PRIMARY KEY,
  collaboratorId TEXT,
  collaboratorName TEXT,
  moduleName TEXT,
  dateInscription TEXT,
  dateValidation TEXT,
  resultat TEXT,
  score NUMERIC,
  cycle TEXT,
  numSession TEXT,
  formateur TEXT,
  consigne TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table du Catalogue des Modules (modules_catalog)
CREATE TABLE IF NOT EXISTS public.modules_catalog (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  validityMonths NUMERIC,
  validityMonthsInitial NUMERIC,
  validityMonthsRecyclage NUMERIC,
  recyclageIntervalMonths NUMERIC,
  regulatoryRef TEXT,
  description TEXT,
  agency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des Paramètres de l'Application (app_settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  customLogo TEXT,
  agencyName TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- ACTIVATION DE LA SYNCHRONISATION TEMPS RÉEL (REALTIME)
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.modules_catalog;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;

-- =========================================================
-- POLITIQUES DE SÉCURITÉ (RLS) - ACCÈS PUBLIC / LECTURE-ÉCRITURE ÉQUIPE
-- =========================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read and write access" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and write access" ON public.collaborators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and write access" ON public.training_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and write access" ON public.modules_catalog FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and write access" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- =========================================================
-- BUCKET DE STOCKAGE POUR LES PDFS D'ÉMARGEMENT (emargements)
-- =========================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('emargements', 'emargements', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public storage upload and view" ON storage.objects 
FOR ALL USING (bucket_id = 'emargements') WITH CHECK (bucket_id = 'emargements');
