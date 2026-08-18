import React, { useState } from 'react';
import { 
  GraduationCap, 
  FolderGit2, 
  TrendingUp,
  Clock, 
  FileText, 
  ShieldCheck, 
  Shield, 
  ArrowRight, 
  Eye, 
  AlertCircle,
  Bell
} from 'lucide-react';
import { AppUser } from '../types';
import { normalizeUserPermissions } from '../data/usersData';

interface HomePortalProps {
  currentUser: AppUser;
  onSelectApp: (app: 'formation' | 'coverageControl' | 'rhGenerator' | 'admin') => void;
  collaboratorsCount?: number;
  trainingLogsCount?: number;
  activeSessionsCount?: number;
  pendingRequestsCount?: number;
}

export default function HomePortal({
  currentUser,
  onSelectApp,
  pendingRequestsCount = 0
}: HomePortalProps) {
  const [infoModal, setInfoModal] = useState<{ title: string; desc: string } | null>(null);

  const permissions = normalizeUserPermissions(currentUser.permissions);

  const permFormation = permissions.formation;
  const permRh = permissions.rhGenerator;
  const permOperations = permissions.operationsTracking;
  const permAbsence = permissions.absenceTracking;
  const permContract = permissions.contractGenerator;
  const permCoverage = permissions.coverageControl;
  const permAdmin = permissions.admin;

  const visibleAppsCount = [
    permFormation !== 'Masquer',
    permRh !== 'Masquer',
    permOperations !== 'Masquer',
    permAbsence !== 'Masquer',
    permContract !== 'Masquer',
    permCoverage !== 'Masquer',
    permAdmin !== 'Masquer',
  ].filter(Boolean).length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in pb-12" id="home-portal-container">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#082C66] via-[#0d3b84] to-[#0062FF] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Bonjour {currentUser.firstName} {currentUser.lastName}
          </h1>
          
          <p className="text-sm sm:text-base text-sky-100/90 leading-relaxed max-w-2xl font-normal">
            Bienvenue sur HubStation — Ton hub centralisé pour piloter et automatiser tes opérations au quotidien.
          </p>
        </div>
      </div>

      {/* When no apps are accessible */}
      {visibleAppsCount === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs max-w-lg mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Aucune application autorisée</h3>
          <p className="text-xs text-slate-500">
            Votre compte ne dispose actuellement d'aucun droit d'accès aux applications métiers. Veuillez contacter votre administrateur pour configurer vos autorisations.
          </p>
        </div>
      )}

      {/* Applications Grid with Custom Gradient Themes - 4 apps per line on large screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6" id="apps-grid">
        
        {/* 1. App Formation (#35ffd0) */}
        {permFormation !== 'Masquer' && (
          <div 
            id="card-app-formation"
            className="group rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-2xl cursor-pointer ring-1 ring-white/20"
            style={{
              background: 'linear-gradient(135deg, #35ffd0 0%, #0ebfa0 100%)',
            }}
            onClick={() => onSelectApp('formation')}
          >
            {/* Watermark Background Icon */}
            <div className="absolute -right-10 -bottom-10 text-white/20 pointer-events-none group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/30 transition-all duration-500">
              <GraduationCap className="w-64 h-64 stroke-[1.5]" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/25 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-sm">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div className="flex items-center gap-1.5">
                  {permFormation === 'Lecture' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-black/25 text-white border border-white/30 backdrop-blur-xs">
                      <Eye className="w-3 h-3 text-amber-300" />
                      Lecture seule
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/25 text-white border border-white/35 backdrop-blur-xs shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                      En ligne
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight">
                App Formation
              </h3>
              <p className="text-xs font-medium text-white/90 mt-1">
                Planifier, suivre les sessions et gérer la paie et la facturation.
              </p>
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
        )}

        {/* 2. App Générateur dossier RH (#ff751f) */}
        {permRh !== 'Masquer' && (
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
            {/* Watermark Background Icon */}
            <div className="absolute -right-10 -bottom-10 text-white/20 pointer-events-none group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/30 transition-all duration-500">
              <FolderGit2 className="w-64 h-64 stroke-[1.5]" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/25 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-sm">
                  <FolderGit2 className="w-8 h-8" />
                </div>
                <div className="flex items-center gap-1.5">
                  {permRh === 'Lecture' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-black/25 text-white border border-white/30 backdrop-blur-xs">
                      <Eye className="w-3 h-3 text-amber-300" />
                      Lecture seule
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/25 text-white border border-white/35 backdrop-blur-xs shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                      En ligne
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight">
                App Générateur dossier RH
              </h3>
              <p className="text-xs font-medium text-white/90 mt-1">
                Standardiser et générer le dossier RH complet de l'intérimaire.
              </p>
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
        )}

        {/* 3. App Suivi d'exploitation (#082c66 - À venir) */}
        {permOperations !== 'Masquer' && (
          <div 
            id="card-app-operations-tracking"
            className="group rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-2xl cursor-pointer ring-1 ring-white/20"
            style={{
              background: 'linear-gradient(135deg, #082c66 0%, #031430 100%)',
            }}
            onClick={() => {
              setInfoModal({
                title: "App Suivi d'exploitation",
                desc: "Ce module est actuellement en cours de développement. Il permettra d'assurer le suivi détaillé de l'activité par escale ainsi que le pilotage complet des KPI opérationnels."
              });
            }}
          >
            {/* Watermark Background Icon */}
            <div className="absolute -right-10 -bottom-10 text-white/15 pointer-events-none group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/25 transition-all duration-500">
              <TrendingUp className="w-64 h-64 stroke-[1.5]" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/25 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-sm">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-amber-950 border border-amber-300 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-900 animate-pulse" />
                  À venir
                </span>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight">
                App Suivi d'exploitation
              </h3>
              <p className="text-xs font-medium text-white/90 mt-1">
                Suivi de l'activité par escale et KPI
              </p>
            </div>

            <div className="relative z-10 pt-8 mt-6 border-t border-white/25 flex items-center justify-end">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-white/90 bg-white/15 px-3.5 py-1.5 rounded-xl border border-white/20">
                <span>Accéder</span>
                <ArrowRight className="w-4 h-4 opacity-50" />
              </div>
            </div>
          </div>
        )}

        {/* 4. App Suivi des absences (#57aea6 - À venir) */}
        {permAbsence !== 'Masquer' && (
          <div 
            id="card-app-absence-tracking"
            className="group rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-2xl cursor-pointer ring-1 ring-white/20"
            style={{
              background: 'linear-gradient(135deg, #57aea6 0%, #3d8c85 100%)',
            }}
            onClick={() => {
              setInfoModal({
                title: "App Suivi des absences",
                desc: "Ce module est actuellement en cours de développement. Il permettra d'assurer le suivi complet des absences et de générer automatiquement le mailing associé."
              });
            }}
          >
            {/* Watermark Background Icon */}
            <div className="absolute -right-10 -bottom-10 text-white/20 pointer-events-none group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/30 transition-all duration-500">
              <Clock className="w-64 h-64 stroke-[1.5]" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/25 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-sm">
                  <Clock className="w-8 h-8" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-amber-950 border border-amber-300 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-900 animate-pulse" />
                  À venir
                </span>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight">
                App Suivi des absences
              </h3>
              <p className="text-xs font-medium text-white/90 mt-1">
                Assure le suivi des absences et génère le mailing associé.
              </p>
            </div>

            <div className="relative z-10 pt-8 mt-6 border-t border-white/25 flex items-center justify-end">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-white/90 bg-white/15 px-3.5 py-1.5 rounded-xl border border-white/20">
                <span>Accéder</span>
                <ArrowRight className="w-4 h-4 opacity-50" />
              </div>
            </div>
          </div>
        )}

        {/* 4. App Générateur import contrat (#0062ff - À venir) */}
        {permContract !== 'Masquer' && (
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
            {/* Watermark Background Icon */}
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
              <p className="text-xs font-medium text-white/90 mt-1">
                Convertir instantanément vos imports de contrats pour HBO.
              </p>
            </div>

            <div className="relative z-10 pt-8 mt-6 border-t border-white/25 flex items-center justify-end">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-white/80 bg-white/15 px-3.5 py-1.5 rounded-xl border border-white/20">
                <span>Accéder</span>
                <ArrowRight className="w-4 h-4 opacity-50" />
              </div>
            </div>
          </div>
        )}

        {/* 5. App Contrôle de couverture (#ff5757) */}
        {permCoverage !== 'Masquer' && (
          <div 
            id="card-app-coverage"
            className="group rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-2xl cursor-pointer ring-1 ring-white/20"
            style={{
              background: 'linear-gradient(135deg, #ff5757 0%, #d32f2f 100%)',
            }}
            onClick={() => onSelectApp('coverageControl')}
          >
            {/* Watermark Background Icon */}
            <div className="absolute -right-10 -bottom-10 text-white/20 pointer-events-none group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/30 transition-all duration-500">
              <ShieldCheck className="w-64 h-64 stroke-[1.5]" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/25 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-sm">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="flex items-center gap-1.5">
                  {permCoverage === 'Lecture' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-black/25 text-white border border-white/30 backdrop-blur-xs">
                      <Eye className="w-3 h-3 text-amber-300" />
                      Lecture seule
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/25 text-white border border-white/35 backdrop-blur-xs shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                      En ligne
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight">
                App Contrôle de couverture
              </h3>
              <p className="text-xs font-medium text-white/90 mt-1">
                Contrôler la conformité entre le planning réel et les contrats édités.
              </p>
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
        )}

        {/* 6. App Administration (#6d72db) */}
        {permAdmin !== 'Masquer' && (
          <div 
            id="card-app-admin"
            className="group rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-2xl cursor-pointer ring-1 ring-white/20"
            style={{
              background: 'linear-gradient(135deg, #6d72db 0%, #4338ca 100%)',
            }}
            onClick={() => {
              onSelectApp('admin');
            }}
          >
            {/* Watermark Background Icon */}
            <div className="absolute -right-10 -bottom-10 text-white/20 pointer-events-none group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/30 transition-all duration-500">
              <Shield className="w-64 h-64 stroke-[1.5]" />
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/25 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-sm relative">
                  <Shield className="w-8 h-8" />
                  {permAdmin === 'Écriture' && pendingRequestsCount > 0 && (
                    <span 
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-md animate-pulse"
                      title={`${pendingRequestsCount} demande(s) en attente de validation`}
                    >
                      {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {permAdmin === 'Écriture' && pendingRequestsCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white border border-rose-400 shadow-md animate-pulse">
                      <Bell className="w-3.5 h-3.5 fill-current" />
                      <span>{pendingRequestsCount} en attente</span>
                    </span>
                  )}
                  {permAdmin === 'Lecture' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-black/25 text-white border border-white/30 backdrop-blur-xs">
                      <Eye className="w-3 h-3 text-amber-300" />
                      Lecture seule
                    </span>
                  ) : (
                    !(permAdmin === 'Écriture' && pendingRequestsCount > 0) && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/25 text-white border border-white/35 backdrop-blur-xs shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                        En ligne
                      </span>
                    )
                  )}
                </div>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight">
                App Administration
              </h3>
              <p className="text-xs font-medium text-white/90 mt-1">
                Gérer les utilisateurs, les rôles et les accès à la plateforme.
              </p>
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
        )}

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
