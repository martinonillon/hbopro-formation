import React, { useState } from 'react';
import { Lock, LogIn, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react';
import { AppUser } from '../types';
import { DEFAULT_ADMIN_USER } from '../data/usersData';

interface LoginScreenProps {
  users: AppUser[];
  onLogin: (user: AppUser) => void;
}

export default function LoginScreen({ users, onLogin }: LoginScreenProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanInput = usernameInput.trim().toUpperCase();
    if (!cleanInput) {
      setErrorMsg('Veuillez saisir votre identifiant.');
      return;
    }

    const effectiveUsers = users.length > 0 ? users : [DEFAULT_ADMIN_USER];
    const foundUser = effectiveUsers.find(u => u.username.toUpperCase() === cleanInput);
    if (foundUser) {
      onLogin(foundUser);
    } else {
      setErrorMsg(`Identifiant "${cleanInput}" non reconnu. Veuillez vérifier votre saisie ou contacter l'administrateur.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Subtle Background Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative z-10 animate-fade-in">
        
        {/* Header Branding */}
        <div className="bg-[#082C66] p-8 text-center text-white relative">
          <div className="mx-auto w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 border border-white/20 backdrop-blur-xs">
            <Lock className="w-8 h-8 text-[#ffde59]" />
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase bg-[#0062FF]/40 text-blue-200 px-3 py-1 rounded-full border border-blue-400/30">
            Plateforme Hubjob
          </span>
          <h1 className="text-xl font-black mt-3 text-white tracking-tight">Authentification Sécurisée</h1>
          <p className="text-xs text-blue-200 mt-1 font-medium">Saisissez votre identifiant pour accéder à l'application</p>
        </div>

        {/* Form Area */}
        <form onSubmit={handleLoginSubmit} className="p-6 sm:p-8 space-y-6">
          
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Erreur d'accès</p>
                <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="login-username-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Identifiant Utilisateur
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="login-username-input"
                type="text"
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="AAA1234"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm text-slate-900 font-bold focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-[#0062FF]/20 outline-none transition-all placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 uppercase tracking-wider"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Accès contrôlé selon vos habilitations d'onglets
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-[#0062FF] hover:bg-[#0062FF]/90 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-[#0062FF]/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            id="login-submit-button"
          >
            <LogIn className="w-4 h-4" />
            Se connecter à l'application
          </button>

          {/* Help Notice */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              En cas d'oubli de votre identifiant, merci de contacter votre administrateur.
            </p>
          </div>

        </form>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400">
          Système de gestion des droits Hubjob • Support Admin
        </div>

      </div>
    </div>
  );
}
