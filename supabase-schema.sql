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

-- =========================================================
-- 6. Table des Commandes de Groupe (commandes_groupe)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.commandes_groupe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  escale text NOT NULL,
  client text NOT NULL,
  service text NOT NULL,
  poste text NOT NULL,
  nombre_agents integer NOT NULL,
  nombre_sessions integer NOT NULL,
  organisme_formation text,
  poei boolean NOT NULL DEFAULT false,
  date_mise_a_disposition date,
  statut text NOT NULL DEFAULT 'en_cours',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.commandes_groupe;
ALTER TABLE public.commandes_groupe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read and write access" ON public.commandes_groupe FOR ALL USING (true) WITH CHECK (true);

-- =========================================================
-- 7. Table des Candidats de Commande de Groupe (commandes_groupe_candidats)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.commandes_groupe_candidats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id uuid NOT NULL REFERENCES public.commandes_groupe(id) ON DELETE CASCADE,

  -- Inscription
  nom text NOT NULL,
  prenom text NOT NULL,
  telephone text,
  email text,
  escale text NOT NULL,
  service text NOT NULL,
  poste text NOT NULL,
  enregistre_le timestamptz NOT NULL DEFAULT now(),
  statut text NOT NULL DEFAULT 'en_cours',

  -- Section 1 : pré-qualification téléphonique
  recruteur_prequal text,
  date_prequal date,
  date_convocation date,
  inscrit_ft boolean,
  identifiant_ft text,
  niveau_anglais text,
  casier_judiciaire_vierge boolean,
  permis_b_vehicule text,
  horaires_decales boolean,
  port_de_charge text,
  compte_rendu_echange text,
  points_alerte_prequal text,

  -- Section 2 : check-list entretien
  recruteur_entretien text,
  date_entretien date,
  date_naissance date,
  lieu_naissance text,
  confirmation_qualification boolean,
  disponibilite_formation text,
  disponibilite_saison text,
  compte_rendu_entretien text,
  points_alerte_entretien text,
  pre_resultat text,
  resultat text,

  -- Section 3 : check-list intégration (stocké en JSONB pour flexibilité identique à l'app Recrutement)
  integration_checklist jsonb DEFAULT '{}'::jsonb,
  commentaires text,

  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.commandes_groupe_candidats;
ALTER TABLE public.commandes_groupe_candidats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read and write access" ON public.commandes_groupe_candidats FOR ALL USING (true) WITH CHECK (true);

