import React, { useState } from 'react';
import { 
  GraduationCap, 
  ShieldCheck, 
  FileText, 
  FolderGit2, 
  Shield, 
  ArrowRight, 
  Sparkles,
  Lock
} from 'lucide-react';
import { AppUser } from '../types';

interface HomePortalProps {
  currentUser: AppUser;
  onSelectApp: (app: 'formation' | 'coverageControl' | 'rhGenerator' | 'admin') => void;
  collaboratorsCount?: number;
  trainingLogsCount?: number;
  activeSessionsCount?: number;
}

export default function HomePortal({
  currentUser,
  onSelectApp
}: HomePortalProps) {
  const [infoModal, setInfoModal] = useState<{ title: string; desc: string } | null>(null);

  const canAccessFormation = Object.entries(currentUser.permissions).some(
    ([key, val]) => ['dashboard', 'calendar', 'logs', 'payroll', 'billing', 'collaborators', 'catalog'].includes(key) && val !== 'Masquer'
  );

  const canAccessCoverage = currentUser.permissions.coverageControl !== 'Masquer';
  const canAccessAdmin = currentUser.permissions.admin !== 'Masquer';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in pb-12" id="home-portal-container">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#082C66] via-[#0d3b84] to-[#0062FF] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-sky-100 border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Portail d'Applications — Hubjob</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Bonjour, {currentUser.firstName} {currentUser.lastName}
          </h1>
          
          <p className="text-sm sm:text-base text-sky-100/90 leading-relaxed max-w-2xl font-normal">
            Bienvenue sur votre espace centralisé de gestion. Sélectionnez une application ci-dessous pour accéder à vos outils métiers et tableaux de bord.
          </p>
        </div>
      </div>

      {/* Applications Grid with Custom Gradient Themes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="apps-grid">
        
        {/* 1. App Formation (#35ffd0) */}
        <div 
          id="card-app-formation"
          className={`group rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 shadow-md ${
            canAccessFormation 
              ? 'hover:-translate-y-1 hover:shadow-2xl cursor-pointer ring-1 ring-black/10' 
              : 'opacity-60 cursor-not-allowed ring-1 ring-black/10'
          }`}
          style={{
            background: 'linear-gradient(135deg, #35ffd0 0%, #0ebfa0 100%)',
          }}
          onClick={() => {
            if (canAccessFormation) {
              onSelectApp('formation');
            }
          }}
        >
          {/* Watermark Background Icon - Enlarged & High Contrast */}
          <div className="absolute -right-10 -bottom-10 text-slate-950/20 pointer-events-none group-hover:scale-110 group-hover:rotate-6 group-hover:text-slate-950/30 transition-all duration-500">
            <GraduationCap className="w-64 h-64 stroke-[1.5]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-5">
              <div className="w-14 h-14 rounded-2xl bg-slate-900/15 backdrop-blur-md text-slate-900 border border-slate-900/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-sm">
                <GraduationCap className="w-8 h-8" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-900/15 text-slate-900 border border-slate-900/25 backdrop-blur-xs shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                En ligne
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              App Formation
            </h3>
          </div>

          <div className="relative z-10 pt-8 mt-6 border-t border-slate-900/20 flex items-center justify-end">
            <button 
              type="button"
              className="inline-flex items-center gap-2 text-xs font-black text-slate-900 group-hover:translate-x-1 transition-transform cursor-pointer bg-white/50 hover:bg-white/75 px-3.5 py-1.5 rounded-xl border border-slate-900/15 shadow-xs"
            >
              <span>Accéder</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. App Contrôle de couverture (#ff5757) */}
        <div 
          id="card-app-coverage"
          className={`group rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 shadow-md ${
            canAccessCoverage 
              ? 'hover:-translate-y-1 hover:shadow-2xl cursor-pointer ring-1 ring-white/20' 
              : 'opacity-60 cursor-not-allowed ring-1 ring-white/20'
          }`}
          style={{
            background: 'linear-gradient(135deg, #ff5757 0%, #d32f2f 100%)',
          }}
          onClick={() => {
            if (canAccessCoverage) {
              onSelectApp('coverageControl');
            }
          }}
        >
          {/* Watermark Background Icon - Enlarged & High Contrast */}
          <div className="absolute -right-10 -bottom-10 text-white/20 pointer-events-none group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/30 transition-all duration-500">
            <ShieldCheck className="w-64 h-64 stroke-[1.5]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/25 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/25 text-white border border-white/35 backdrop-blur-xs shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                En ligne
              </span>
            </div>

            <h3 className="text-xl font-black text-white tracking-tight">
              App Contrôle de couverture
            </h3>
          </div>

          <div className="relative z-10 pt-8 mt-6 border-t border-white/25 flex items-center justify-end">
            <button 
              type="button"
              className="inline-flex items-center gap-2 text-xs font-black text-white group-hover:translate-x-1 transition-transform cursor-pointer bg-white/25 hover:bg-white/40 px-3.5 py-1.5 rounded-xl border border-white/30 shadow-xs"
            >
              <span>Accéder</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. App Générateur import contrat (#0062ff) */}
        <div 
          id="card-app-contract-generator"
          className="group rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-2xl cursor-pointer ring-1 ring-white/20"
          style={{
            background: 'linear-gradient(135deg, #0062ff 0%, #0043b8 100%)',
          }}
          onClick={() => {
            setInfoModal({
              title: "App Générateur import contrat",
              desc: "Ce module est actuellement en cours de développement. Il permettra d'automatiser l'importation et la conversion des données contractuelles vers vos matrices métiers."
            });
          }}
        >
          {/* Watermark Background Icon - Enlarged & High Contrast */}
          <div className="absolute -right-10 -bottom-10 text-white/20 pointer-events-none group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/30 transition-all duration-500">
            <FileText className="w-64 h-64 stroke-[1.5]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/25 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-sm">
                <FileText className="w-8 h-8" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-amber-950 border border-amber-300 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-900 animate-pulse" />
                À venir
              </span>
            </div>

            <h3 className="text-xl font-black text-white tracking-tight">
              App Générateur import contrat
            </h3>
          </div>

          <div className="relative z-10 pt-8 mt-6 border-t border-white/25 flex items-center justify-end">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-white/70 bg-white/15 px-3.5 py-1.5 rounded-xl border border-white/20">
              <span>Accéder</span>
              <ArrowRight className="w-4 h-4 opacity-50" />
            </div>
          </div>
        </div>

        {/* 4. App Générateur dossier RH (#ff751f) */}
        <div 
          id="card-app-rh-generator"
          className="group rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-2xl cursor-pointer ring-1 ring-white/20"
          style={{
            background: 'linear-gradient(135deg, #ff751f 0%, #d84315 100%)',
          }}
          onClick={() => {
            onSelectApp('rhGenerator');
          }}
        >
          {/* Watermark Background Icon - Enlarged & High Contrast */}
          <div className="absolute -right-10 -bottom-10 text-white/20 pointer-events-none group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/30 transition-all duration-500">
            <FolderGit2 className="w-64 h-64 stroke-[1.5]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/25 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-sm">
                <FolderGit2 className="w-8 h-8" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/25 text-white border border-white/35 backdrop-blur-xs shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                En ligne
              </span>
            </div>

            <h3 className="text-xl font-black text-white tracking-tight">
              App Générateur dossier RH
            </h3>
          </div>

          <div className="relative z-10 pt-8 mt-6 border-t border-white/25 flex items-center justify-end">
            <button 
              type="button"
              className="inline-flex items-center gap-2 text-xs font-black text-white group-hover:translate-x-1 transition-transform cursor-pointer bg-white/25 hover:bg-white/40 px-3.5 py-1.5 rounded-xl border border-white/30 shadow-xs"
            >
              <span>Accéder</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5. App Administration (#6d72db) */}
        <div 
          id="card-app-admin"
          className={`group rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 shadow-md ${
            canAccessAdmin 
              ? 'hover:-translate-y-1 hover:shadow-2xl cursor-pointer ring-1 ring-white/20' 
              : 'opacity-60 cursor-not-allowed ring-1 ring-white/20'
          }`}
          style={{
            background: 'linear-gradient(135deg, #6d72db 0%, #4338ca 100%)',
          }}
          onClick={() => {
            if (canAccessAdmin) {
              onSelectApp('admin');
            } else {
              setInfoModal({
                title: "Accès restreint",
                desc: "Votre compte ne dispose pas des droits nécessaires pour accéder à l'application d'administration. Contactez votre administrateur."
              });
            }
          }}
        >
          {/* Watermark Background Icon - Enlarged & High Contrast */}
          <div className="absolute -right-10 -bottom-10 text-white/20 pointer-events-none group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/30 transition-all duration-500">
            <Shield className="w-64 h-64 stroke-[1.5]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/25 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-sm">
                <Shield className="w-8 h-8" />
              </div>
              {canAccessAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/25 text-white border border-white/35 backdrop-blur-xs shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  En ligne
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-black/30 text-white/95 border border-white/25 backdrop-blur-xs">
                  <Lock className="w-3 h-3 text-white" />
                  Verrouillé
                </span>
              )}
            </div>

            <h3 className="text-xl font-black text-white tracking-tight">
              App Administration
            </h3>
          </div>

          <div className="relative z-10 pt-8 mt-6 border-t border-white/25 flex items-center justify-end">
            <button 
              type="button"
              className="inline-flex items-center gap-2 text-xs font-black text-white group-hover:translate-x-1 transition-transform cursor-pointer bg-white/25 hover:bg-white/40 px-3.5 py-1.5 rounded-xl border border-white/30 shadow-xs"
            >
              <span>Accéder</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Informative Modal for Inactive Apps */}
      {infoModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="info-modal-backdrop">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up" id="info-modal-content">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {infoModal.title}
              </h3>
              <p className="text-xs font-semibold text-amber-700 mt-0.5">
                Module à venir, en cours de développement
              </p>
              <p className="text-xs text-slate-600 leading-relaxed mt-2 font-normal">
                {infoModal.desc}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                id="btn-close-info-modal"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
