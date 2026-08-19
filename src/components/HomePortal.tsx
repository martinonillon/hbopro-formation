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
      
      {/* 1. Bandeau bleu de bienvenue (Conservé) */}
      <div 
        className="bg-gradient-to-r from-[#082C66] via-[#0d3b84] to-[#0062FF] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden"
        id="home-welcome-banner"
      >
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-2">
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
      </div>

      {/* 2. Section "LA PHRASE DU JOUR" */}
      <div 
        className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4"
        id="home-section-phrase-du-jour"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-wider uppercase">
                LA PHRASE DU JOUR
              </h2>
              <p className="text-[11px] text-slate-400 font-medium capitalize">
                {formattedToday}
              </p>
            </div>
          </div>

          {dailyQuote.theme && (
            <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-full text-[11px] font-bold">
              {dailyQuote.theme}
            </span>
          )}
        </div>

        <div className="relative pl-6 sm:pl-8 py-2">
          <QuoteIcon className="w-8 h-8 text-amber-300/40 absolute left-0 top-0 -scale-x-100" />
          <blockquote className="relative z-10 text-sm sm:text-base font-medium text-slate-700 italic leading-relaxed">
            « {dailyQuote.text} »
          </blockquote>
          <div className="mt-3 flex items-center justify-end">
            <p className="text-xs font-bold text-slate-900 tracking-tight">
              — {dailyQuote.author}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Section "KPI" */}
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
