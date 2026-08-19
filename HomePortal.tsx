import React, { useMemo } from 'react';
import { Quote as QuoteIcon, BarChart3, Sparkles } from 'lucide-react';
import { AppUser } from '../types';
import { getDailyQuote } from '../data/quotesData';

interface HomePortalProps {
  currentUser: AppUser;
}

export default function HomePortal({ currentUser }: HomePortalProps) {
  // Retrieve the deterministic quote of the day
  const dailyQuote = useMemo(() => getDailyQuote(), []);

  // Format today's date in French
  const formattedToday = useMemo(() => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in pb-12" id="home-portal-container">
      
      {/* 1. Bandeau bleu de bienvenue avec Phrase du Jour intégrée */}
      <div 
        className="bg-gradient-to-r from-[#082C66] via-[#0d3b84] to-[#0062FF] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden"
        id="home-welcome-banner"
      >
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Gauche : Textes de bienvenue */}
          <div className="space-y-2" id="home-welcome-left-side">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white" id="home-welcome-user">
              Bonjour {currentUser.firstName} {currentUser.lastName}
            </h1>
            
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-sky-200">
                Bienvenue sur HubStation
              </h2>
              <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed font-normal">
                Ton hub centralisé pour piloter et automatiser tes opérations au quotidien.
              </p>
            </div>
          </div>

          {/* Droite : La phrase du jour intégrée */}
          <div className="md:border-l md:border-white/15 md:pl-6 space-y-2 text-right md:text-right" id="home-welcome-right-side">
            {/* En haut à droite : La date du jour en petit texte */}
            <p className="text-[10px] sm:text-xs text-sky-200/90 font-semibold tracking-wide uppercase">
              {formattedToday}
            </p>
            
            {/* Titre "La phrase du jour" en italique */}
            <p className="text-[11px] sm:text-xs font-black italic tracking-wider text-amber-300 uppercase flex items-center justify-end gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              La phrase du jour
            </p>

            {/* Citation et auteur en police plus petite */}
            <div className="space-y-1">
              <blockquote className="text-xs sm:text-sm text-white/95 font-medium italic leading-relaxed">
                « {dailyQuote.text} »
              </blockquote>
              <p className="text-[10px] sm:text-xs font-bold text-sky-200">
                — {dailyQuote.author}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Section "KPI" */}
      <div 
        className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4"
        id="home-section-kpi"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0062FF] border border-blue-200/80 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-wider uppercase">
            KPI
          </h2>
        </div>

        <div className="py-6 px-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center">
          <p className="text-xs sm:text-sm text-slate-500 font-medium italic" id="kpi-placeholder-text">
            (personnalisation à venir, on travaillera dessus plus tard)
          </p>
        </div>
      </div>

    </div>
  );
}
