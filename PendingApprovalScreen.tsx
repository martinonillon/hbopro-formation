import React, { useState } from 'react';
import { 
  Clock, 
  ShieldAlert, 
  LogOut, 
  RefreshCw, 
  Mail, 
  User, 
  Briefcase, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import { AppUser } from '../types';

interface PendingApprovalScreenProps {
  currentUser: AppUser;
  onLogout: () => void;
  onRefreshStatus?: () => void;
}

export default function PendingApprovalScreen({
  currentUser,
  onLogout,
  onRefreshStatus
}: PendingApprovalScreenProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshStatus) {
      onRefreshStatus();
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col antialiased text-slate-800" id="pending-approval-screen">
      
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 h-16 shrink-0 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img
              src="/logo.png"
              alt="HubStation"
              className="h-10 w-auto object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="hidden sm:block pl-3 border-l border-slate-200">
              <h1 className="text-base font-extrabold text-[#082C66] tracking-tight leading-tight">HubStation</h1>
              <p className="text-[11px] text-slate-500 font-medium">Portail sécurisé</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200/80 transition-all cursor-pointer shadow-2xs active:scale-95"
            id="btn-pending-logout"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-scale-in">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#082C66] to-[#0062FF] text-white p-6 sm:p-8 text-center relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
            
            <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg ring-4 ring-white/20 mb-4 animate-pulse">
              <Clock className="w-8 h-8 stroke-[2.5]" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-amber-300 border border-white/20 backdrop-blur-xs mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
              Statut : En attente de validation
            </span>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Votre compte est en attente de validation
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 mt-2 max-w-md mx-auto leading-relaxed">
              Un administrateur doit valider votre profil et vous attribuer vos droits d'accès avant que vous ne puissiez accéder aux applications métiers.
            </p>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Identity Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Récapitulatif de votre demande :</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0062FF] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Collaborateur</p>
                    <p className="font-extrabold text-slate-900 truncate">
                      {currentUser.firstName} {currentUser.lastName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Poste</p>
                    <p className="font-extrabold text-slate-900 truncate">
                      {currentUser.role || 'Non spécifié'}
                    </p>
                  </div>
                </div>

                <div className="sm:col-span-2 flex items-center gap-2.5 pt-2 border-t border-slate-200/60">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Adresse E-mail de connexion</p>
                    <p className="font-extrabold text-slate-900 font-mono text-[11px] truncate">
                      {currentUser.email || currentUser.username}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Notice */}
            <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-[#082C66] space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-[#082C66]">
                <ShieldAlert className="w-4 h-4 text-[#0062FF] shrink-0" />
                <span>Que se passe-t-il ensuite ?</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 pl-6 list-disc">
                <li>Votre mot de passe a déjà été enregistré lors de votre première connexion.</li>
                <li>Votre administrateur examine votre demande et configure vos permissions.</li>
                <li>Dès validation, vous recevrez une confirmation et pourrez accéder directement à HubStation avec vos identifiants.</li>
              </ul>
            </div>

            {/* Support contact */}
            <div className="text-center text-xs text-slate-500">
              <p>Une question ou une urgence ? Contactez l'administrateur :</p>
              <a 
                href="mailto:martin@hubjob.fr?subject=Demande%20de%20validation%20de%20compte%20HubStation"
                className="font-bold text-[#0062FF] hover:underline inline-flex items-center gap-1 mt-0.5"
              >
                <span>martin@hubjob.fr</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-full sm:flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                id="btn-check-status-again"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0062FF]' : ''}`} />
                <span>{isRefreshing ? 'Vérification en cours...' : 'Vérifier si mon compte a été validé'}</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="w-full sm:w-auto py-3 px-5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>Déconnexion</span>
              </button>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 font-medium">
        ©2026 Hubjob — HubStation
      </footer>

    </div>
  );
}
