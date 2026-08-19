import React, { useMemo, useState } from 'react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { 
  Users, 
  Award, 
  BookOpen, 
  AlertTriangle, 
  TrendingUp, 
  Bell, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  PlusCircle,
  CreditCard,
  Euro,
  FileText,
  ArrowRight,
  Calendar,
  Receipt,
  Download
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  CartesianGrid,
  LabelList
} from 'recharts';
import { Collaborator, TrainingLog, RealTimeEvent } from '../types';
import { getEscaleStyle, SERVICES } from '../data/modulesData';
import { formatDateFR, normalizeDateToISO } from '../utils/dateUtils';

interface DashboardProps {
  collaborators: Collaborator[];
  trainingLogs: TrainingLog[];
  events: RealTimeEvent[];
  onTriggerSimulation: () => void;
  onQuickFixLog: (logId: string, result: string) => void;
  onOpenEnrollment: () => void;
  onNavigateToTab: (tab: string, filter?: { resultat?: string | string[]; consigne?: string; madEa?: boolean }) => void;
  isReadOnly?: boolean;
}

const COLORS = ['#082C66', '#35FFD0', '#0062FF', '#57AEA6', '#7C8DD9', '#6D72DB', '#EF4444'];

function parseDateToTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const s = dateStr.trim();
  if (!s) return 0;

  // YYYY-MM-DD
  let match = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  // DD/MM/YYYY
  match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

export default function Dashboard({ 
  collaborators, 
  trainingLogs, 
  events, 
  onTriggerSimulation,
  onQuickFixLog,
  onOpenEnrollment,
  onNavigateToTab,
  isReadOnly = false
}: DashboardProps) {

  // KPI Period Filter State - Default to current year
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [kpiStartDate, setKpiStartDate] = useState<string>(() => `${new Date().getFullYear()}-01-01`);
  const [kpiEndDate, setKpiEndDate] = useState<string>(() => `${new Date().getFullYear()}-12-31`);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleSetYear = (year: number | null) => {
    if (year === null) {
      setKpiStartDate('');
      setKpiEndDate('');
    } else {
      setKpiStartDate(`${year}-01-01`);
      setKpiEndDate(`${year}-12-31`);
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      await new Promise(r => setTimeout(r, 150));
      const targetEl = document.getElementById('dashboard-export-area');
      if (!targetEl) return;

      const canvas = await html2canvas(targetEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F8FAFC'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 10) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const periodSuffix = kpiStartDate && kpiEndDate 
        ? `${kpiStartDate}_au_${kpiEndDate}` 
        : 'Toutes_donnees';

      pdf.save(`KPI_Formation_${periodSuffix}.pdf`);
    } catch (err) {
      console.error('Erreur lors du téléchargement du PDF KPI:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Filter logs for KPI statistics & charts based on selected period
  const filteredKpiLogs = useMemo(() => {
    if (!kpiStartDate && !kpiEndDate) return trainingLogs;

    const startTs = kpiStartDate ? new Date(`${kpiStartDate}T00:00:00`).getTime() : 0;
    const endTs = kpiEndDate ? new Date(`${kpiEndDate}T23:59:59.999`).getTime() : Infinity;

    return trainingLogs.filter(log => {
      const debutTime = parseDateToTimestamp(log.dateDebut || log.dateInscription);
      const finTime = parseDateToTimestamp(log.dateFin || log.dateDebut || log.dateInscription);

      const effectiveStart = debutTime || finTime;
      const effectiveEnd = finTime || debutTime;

      if (!effectiveStart && !effectiveEnd) return false;

      if (startTs > 0 && effectiveEnd < startTs) return false;
      if (endTs !== Infinity && effectiveStart > endTs) return false;

      return true;
    });
  }, [trainingLogs, kpiStartDate, kpiEndDate]);

  // KPIs
  const stats = useMemo(() => {
    const totalCollabs = collaborators.length;
    const totalLogs = filteredKpiLogs.length;
    
    const activeTrainings = filteredKpiLogs.filter(l => l.resultat === 'En cours').length;
    
    const validated = filteredKpiLogs.filter(l => l.resultat === 'Réussite').length;
    const failedOrMissing = filteredKpiLogs.filter(l => 
      l.consigne && l.consigne.trim().toLowerCase() === 'a relancer'
    ).length;

    const complianceRate = totalLogs > 0 ? Math.round((validated / totalLogs) * 100) : 100;

    // New stats requested by user
    const toPay = filteredKpiLogs.filter(l => l.consigne === 'A payer').length;
    const completedTrainingsCount = filteredKpiLogs.filter(l => l.resultat !== 'En cours').length;
    
    // Pending billing count: eligible training logs whose visa is not 'Validée'
    const pendingBillingLogs = filteredKpiLogs.filter(l => 
      ['Absent', 'Echouée', 'Échouée', 'Rattrapage', 'Réussite'].includes(l.resultat) && (l.visa || '').trim() !== 'Validée'
    ).length;

    // Actual sum of all validated invoices
    const validatedTotalCost = filteredKpiLogs
      .filter(l => (l.visa || '').trim() === 'Validée')
      .reduce((sum, l) => sum + (Number(l.montantFacture) || 0), 0);

    const madToRealize = filteredKpiLogs.filter(l => l.resultat === 'En cours' && !l.madEa).length;
    const aTraiter = filteredKpiLogs.filter(l => l.resultat === 'A traiter').length;

    return {
      totalCollabs,
      totalLogs,
      activeTrainings,
      validated,
      failedOrMissing,
      complianceRate,
      toPay,
      completedTrainingsCount,
      pendingBillingLogs,
      validatedTotalCost,
      madToRealize,
      aTraiter
    };
  }, [collaborators, filteredKpiLogs]);

  // Chart 1: Results distribution
  const resultsChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredKpiLogs.forEach(log => {
      counts[log.resultat] = (counts[log.resultat] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredKpiLogs]);

  // Chart 2: Logs by Service (sorted and with gradients)
  const serviceChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    // Initialize all services so they are present in the list
    SERVICES.forEach(srv => {
      counts[srv] = 0;
    });
    filteredKpiLogs.forEach(log => {
      counts[log.service] = (counts[log.service] || 0) + 1;
    });

    // Sort descending so the highest is first, lowest is last
    const sorted = Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Apply color gradient from #082C66 to a lighter blue
    const total = sorted.length;
    return sorted.map((item, index) => {
      const ratio = total > 1 ? index / (total - 1) : 0;
      // Start color: #082C66 (8, 44, 102) -> End color: #B3CFFB (179, 207, 251)
      const r = Math.round(8 + (179 - 8) * ratio);
      const g = Math.round(44 + (207 - 44) * ratio);
      const b = Math.round(102 + (251 - 102) * ratio);
      return {
        ...item,
        color: `rgb(${r}, ${g}, ${b})`
      };
    });
  }, [filteredKpiLogs]);

  // Chart 3: Logs by Escale
  const escaleChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredKpiLogs.forEach(log => {
      counts[log.escale] = (counts[log.escale] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredKpiLogs]);

  // Filter logs for Today: "Aujourd'hui" (seules les formations dont la date correspond à aujourd'hui)
  const todayLogs = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    return trainingLogs.filter(log => {
      const debutTime = parseDateToTimestamp(log.dateDebut);
      const finTime = parseDateToTimestamp(log.dateFin);
      const inscTime = parseDateToTimestamp(log.dateInscription);

      // On today's date
      if (debutTime && debutTime >= todayStart && debutTime <= todayEnd) return true;
      if (finTime && finTime >= todayStart && finTime <= todayEnd) return true;
      if (!debutTime && !finTime && inscTime && inscTime >= todayStart && inscTime <= todayEnd) return true;

      // Spanning today's date (session multi-jours)
      if (debutTime && finTime && debutTime <= todayEnd && finTime >= todayStart) return true;

      return false;
    }).sort((a, b) => {
      const timeA = parseDateToTimestamp(a.dateDebut || a.dateInscription);
      const timeB = parseDateToTimestamp(b.dateDebut || b.dateInscription);
      return timeA - timeB;
    });
  }, [trainingLogs]);

  // Filter logs for Upcoming week N+1 (semaine N+1 du lundi au dimanche, un-affected by KPI date filter)
  const upcomingLogs = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 (Sun) to 6 (Sat)
    const daysToCurrentMonday = currentDay === 0 ? 6 : currentDay - 1;

    // Monday of current week N at 00:00:00
    const mondayCurrentWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToCurrentMonday);

    // Monday of week N+1 at 00:00:00
    const mondayNextWeek = new Date(mondayCurrentWeek.getFullYear(), mondayCurrentWeek.getMonth(), mondayCurrentWeek.getDate() + 7, 0, 0, 0, 0);

    // Sunday of week N+1 at 23:59:59.999
    const sundayNextWeek = new Date(mondayNextWeek.getFullYear(), mondayNextWeek.getMonth(), mondayNextWeek.getDate() + 6, 23, 59, 59, 999);

    const nextWeekStart = mondayNextWeek.getTime();
    const nextWeekEnd = sundayNextWeek.getTime();

    const filtered = trainingLogs.filter(log => {
      const debutTime = parseDateToTimestamp(log.dateDebut || log.dateInscription);
      if (!debutTime) return false;
      return debutTime >= nextWeekStart && debutTime <= nextWeekEnd;
    });

    return filtered.sort((a, b) => {
      const timeA = parseDateToTimestamp(a.dateDebut || a.dateInscription);
      const timeB = parseDateToTimestamp(b.dateDebut || b.dateInscription);
      return timeA - timeB;
    });
  }, [trainingLogs]);

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs" id="dashboard-title-bar">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Tableau KPI de Formation</h2>
          <p className="text-xs text-slate-400 mt-1">
            Consultez les indicateurs d'habilitations réglementaires et d'effectifs en temps réel.
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="inline-flex items-center justify-center gap-2 bg-[#0062FF] hover:bg-[#0062FF]/90 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-all shadow-md shadow-[#0062FF]/10 hover:shadow-[#0062FF]/20 cursor-pointer self-start sm:self-center disabled:opacity-60 disabled:cursor-wait"
            id="dashboard-download-pdf-btn"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                Génération du PDF...
              </>
            ) : (
              <>
                <Download className="h-4.5 w-4.5" />
                Télécharger PDF
              </>
            )}
          </button>
        )}
      </div>

      {/* Exportable Area */}
      <div className="space-y-6 bg-slate-50/50 p-1 rounded-2xl" id="dashboard-export-area">
        {/* KPI Period Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4" id="kpi-period-filter-bar">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Calendar className="h-4 w-4 text-[#0062FF]" />
            <span>Filtre période KPI :</span>
          </div>

          {/* Date Range Pickers */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">du</span>
            <input
              type="date"
              value={kpiStartDate}
              onChange={(e) => setKpiStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:outline-hidden focus:border-[#0062FF] focus:bg-white"
              id="kpi-start-date-input"
            />
            <span className="text-slate-400 font-medium">au</span>
            <input
              type="date"
              value={kpiEndDate}
              onChange={(e) => setKpiEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:outline-hidden focus:border-[#0062FF] focus:bg-white"
              id="kpi-end-date-input"
            />
          </div>

          {/* Quick Year Buttons */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            {[currentYear - 1, currentYear, currentYear + 1].map(yr => (
              <button
                key={yr}
                type="button"
                onClick={() => handleSetYear(yr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  kpiStartDate === `${yr}-01-01` && kpiEndDate === `${yr}-12-31`
                    ? 'bg-[#0062FF] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                id={`kpi-year-${yr}-btn`}
              >
                {yr === currentYear ? `${yr} (Année en cours)` : yr}
              </button>
            ))}

            <button
              type="button"
              onClick={() => handleSetYear(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !kpiStartDate && !kpiEndDate
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              id="kpi-year-all-btn"
            >
              Toutes les données
            </button>
          </div>
        </div>

        {/* Active Filter Counter / Info */}
        {(kpiStartDate || kpiEndDate) && (
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
            <span>Affichage : {filteredKpiLogs.length} session{filteredKpiLogs.length > 1 ? 's' : ''} sur {trainingLogs.length}</span>
            <button
              type="button"
              onClick={() => handleSetYear(null)}
              className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer ml-1"
              title="Afficher toutes les données sans filtre de date"
            >
              Voir tout
            </button>
          </div>
        )}
      </div>

      {/* KPI Section: 2 Rows of 4 Cards */}
      <div className="space-y-4" id="kpi-section">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-grid-row-1">
          {/* Card 1: Taux de Complétion (#57aea6) */}
          <div 
            onClick={() => onNavigateToTab('logs', { resultat: 'Réussite' })}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer group" 
            id="kpi-compliance"
          >
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Taux de Complétion</span>
              <div className="flex items-baseline gap-1">
                <h4 className="text-2xl font-bold text-[#57AEA6] leading-tight">{stats.complianceRate}%</h4>
                <span className="text-xs text-slate-400 font-normal">cible 100%</span>
              </div>
              <div className="w-24 bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-[#57AEA6] h-full rounded-full transition-all duration-500" 
                  style={{ width: `${stats.complianceRate}%` }}
                ></div>
              </div>
            </div>
            <div className="p-3 bg-[#57AEA6]/10 text-[#57AEA6] rounded-xl transition-colors group-hover:bg-[#57AEA6]/20">
              <Award className="h-6 w-6" />
            </div>
          </div>

          {/* Card 2: MAD à Réaliser (#0062ff) */}
          <div 
            onClick={() => onNavigateToTab('logs', { madEa: true })}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer group" 
            id="kpi-mad-realize"
          >
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block font-sans">MAD à Réaliser</span>
              <h4 className="text-2xl font-bold text-[#0062FF] leading-tight">{stats.madToRealize}</h4>
              <span className="text-[11px] text-[#0062FF] font-medium mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                Voir les MAD requises <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="p-3 bg-[#0062FF]/10 text-[#0062FF] rounded-xl transition-colors group-hover:bg-[#0062FF]/20">
              <FileText className="h-6 w-6" />
            </div>
          </div>

          {/* Card 3: Formations en cours (#0062ff) */}
          <div 
            onClick={() => onNavigateToTab('logs', { resultat: ['En cours', 'Rattrapage'] })}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer group" 
            id="kpi-active"
          >
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Formations En cours</span>
              <h4 className="text-2xl font-bold text-[#0062FF] leading-tight">{stats.activeTrainings}</h4>
              <span className="text-[11px] text-[#0062FF] font-medium mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                Voir l'avancement <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="p-3 bg-[#0062FF]/10 text-[#0062FF] rounded-xl transition-colors group-hover:bg-[#0062FF]/20">
              <BookOpen className="h-6 w-6" />
            </div>
          </div>

          {/* Card 4: A traiter (Jaune) */}
          <div 
            onClick={() => onNavigateToTab('logs', { resultat: 'A traiter' })}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer group" 
            id="kpi-a-traiter"
          >
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">A traiter</span>
              <h4 className="text-2xl font-bold text-yellow-600 leading-tight">{stats.aTraiter}</h4>
              <span className="text-[11px] text-yellow-600 font-medium mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                Voir les dossiers à traiter <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl transition-colors group-hover:bg-yellow-100">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-grid-row-2">
          {/* Card 5: Actions Requises (Rouge) */}
          <div 
            onClick={() => onNavigateToTab('logs', { consigne: 'A relancer' })}
            className={`border rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer group ${
              stats.failedOrMissing > 0 
                ? 'animate-pulse-red border-rose-300' 
                : 'bg-white border-slate-200'
            }`} 
            id="kpi-alerts"
          >
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Actions Requises</span>
              <h4 className="text-2xl font-bold text-rose-600 leading-tight">{stats.failedOrMissing}</h4>
              <span className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                Voir les relances <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl transition-colors group-hover:bg-rose-100/70">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>

          {/* Card 6: Formation à payer (Violet - redirected to payroll) */}
          <div 
            onClick={() => onNavigateToTab('payroll')}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer group" 
            id="kpi-to-pay"
          >
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block font-sans">Formation à payer</span>
              <h4 className="text-2xl font-bold text-purple-600 leading-tight">{stats.toPay}</h4>
              <span className="text-[11px] text-purple-600 font-medium mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                Gestion paye <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl transition-colors group-hover:bg-purple-100/70">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>

          {/* Card 7: En facturation (#082c66) */}
          <div 
            onClick={() => onNavigateToTab('billing')}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer group" 
            id="kpi-billing"
          >
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block font-sans">En facturation</span>
              <h4 className="text-2xl font-bold text-[#082C66] leading-tight">{stats.pendingBillingLogs}</h4>
              <span className="text-[11px] text-[#082C66] font-medium mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                Gestion facturation <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="p-3 bg-[#082C66]/10 text-[#082C66] rounded-xl transition-colors group-hover:bg-[#082C66]/20">
              <Receipt className="h-6 w-6" />
            </div>
          </div>

          {/* Card 8: Coût Total de Formation (Orange) */}
          <div 
            onClick={() => onNavigateToTab('billing')}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer group" 
            id="kpi-total-cost"
          >
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block font-sans">Coût Total Formation</span>
              <h4 className="text-2xl font-bold text-orange-600 leading-tight">{stats.validatedTotalCost.toLocaleString('fr-FR')} €</h4>
              <span className="text-[11px] text-slate-400 mt-1 block">Somme factures validées</span>
            </div>
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Euro className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-row">
        {/* Chart 1: Results with updated colors & details list */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] lg:col-span-1 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#082C66] mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-[#0062FF]" /> Répartition des résultats
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Total: {stats.totalLogs}</span>
            </h4>
            <div className="h-[180px]">
              {resultsChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                  Aucune donnée à afficher
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={resultsChartData}
                      cx="50%"
                      cy="48%"
                      innerRadius={42}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {resultsChartData.map((entry, index) => {
                        let color = '#94A3B8'; // fallback gray
                        if (entry.name === 'Réussite') color = '#57aea6';
                        else if (entry.name === 'En cours') color = '#0062ff';
                        else if (entry.name === 'Rattrapage') color = '#f59e0b';
                        else if (entry.name === 'Absent') color = '#7c8dd9';
                        else if (entry.name === 'Echouée') color = '#ff0000';
                        else if (entry.name === 'Annulée') color = '#e87373';
                        else if (entry.name === 'A traiter') color = '#eab308';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                      formatter={(value) => [`${value} formations`, 'Statut']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Detailed breakdown list for each label */}
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-800 mb-1">Détail des parts par résultat :</p>
            <div className="grid grid-cols-2 gap-1 text-[9.5px]">
              {resultsChartData.map(item => {
                let color = '#94A3B8';
                if (item.name === 'Réussite') color = '#57aea6';
                else if (item.name === 'En cours') color = '#0062ff';
                else if (item.name === 'Rattrapage') color = '#f59e0b';
                else if (item.name === 'Absent') color = '#7c8dd9';
                else if (item.name === 'Echouée') color = '#ff0000';
                else if (item.name === 'Annulée') color = '#e87373';
                else if (item.name === 'A traiter') color = '#eab308';
                const pct = stats.totalLogs > 0 ? ((item.value / stats.totalLogs) * 100).toFixed(1) : '0';
                return (
                  <div key={item.name} className="flex items-center justify-between py-1 px-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="flex items-center gap-1 truncate text-slate-700 font-medium">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 ml-1 shrink-0">
                      {item.value} <span className="text-slate-400 font-normal text-[8.5px]">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart 2: Services with values on bars & details list */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] lg:col-span-1 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#082C66] mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#0062FF]" /> Volume par Service
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Total: {stats.totalLogs}</span>
            </h4>
            <div className="h-[180px]">
              {serviceChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                  Aucune donnée à afficher
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceChartData} margin={{ top: 16, right: 5, left: -24, bottom: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94A3B8" 
                      fontSize={8.5} 
                      tickLine={false} 
                      angle={-90} 
                      textAnchor="end" 
                      height={45} 
                      interval={0}
                    />
                    <YAxis stroke="#94A3B8" fontSize={8.5} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={14}>
                      <LabelList dataKey="value" position="top" fontSize={8.5} fontWeight={700} fill="#334155" />
                      {serviceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Detailed breakdown list for each label */}
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-800 mb-1">Détail des parts par service :</p>
            <div className="grid grid-cols-2 gap-1 text-[9.5px]">
              {serviceChartData.map(item => {
                const pct = stats.totalLogs > 0 ? ((item.value / stats.totalLogs) * 100).toFixed(1) : '0';
                return (
                  <div key={item.name} className="flex items-center justify-between py-1 px-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="flex items-center gap-1 truncate text-slate-700 font-medium">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 ml-1 shrink-0">
                      {item.value} <span className="text-slate-400 font-normal text-[8.5px]">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart 3: Escales with details list */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] lg:col-span-1 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#082C66] mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-[#0062FF]" /> Distribution par Escale
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Total: {stats.totalLogs}</span>
            </h4>
            <div className="h-[180px]">
              {escaleChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                  Aucune donnée à afficher
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={escaleChartData}
                      cx="50%"
                      cy="48%"
                      outerRadius={58}
                      label={({ name, percent, cx, x, y }) => (
                        <text 
                          x={x} 
                          y={y} 
                          fontSize={8} 
                          fontWeight={600} 
                          fill="#475569" 
                          textAnchor={x > (cx ?? 0) ? 'start' : 'end'}
                          dominantBaseline="central"
                        >
                          {`${name} (${(percent * 100).toFixed(0)}%)`}
                        </text>
                      )}
                      labelLine={false}
                      dataKey="value"
                    >
                      {escaleChartData.map((entry, index) => {
                        const escaleName = (entry.name || '').toUpperCase().trim();
                        let color = '#64748B';
                        if (escaleName === 'BES') color = '#EF4444';
                        else if (escaleName === 'BOD') color = '#EAB308';
                        else if (escaleName === 'LYS') color = '#8B5CF6';
                        else if (escaleName === 'MPL') color = '#78350F';
                        else if (escaleName === 'MRS') color = '#15803D';
                        else if (escaleName === 'NCE') color = '#0EA5E9';
                        else if (escaleName === 'NTE') color = '#0D9488';
                        else if (escaleName === 'TLS') color = '#EC4899';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                      formatter={(value) => [`${value} formations`, 'Volume']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Detailed breakdown list for each label */}
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-800 mb-1">Détail des parts par escale :</p>
            <div className="grid grid-cols-2 gap-1 text-[9.5px]">
              {escaleChartData.map(item => {
                const escaleName = (item.name || '').toUpperCase().trim();
                let color = '#64748B';
                if (escaleName === 'BES') color = '#EF4444';
                else if (escaleName === 'BOD') color = '#EAB308';
                else if (escaleName === 'LYS') color = '#8B5CF6';
                else if (escaleName === 'MPL') color = '#78350F';
                else if (escaleName === 'MRS') color = '#15803D';
                else if (escaleName === 'NCE') color = '#0EA5E9';
                else if (escaleName === 'NTE') color = '#0D9488';
                else if (escaleName === 'TLS') color = '#EC4899';
                const pct = stats.totalLogs > 0 ? ((item.value / stats.totalLogs) * 100).toFixed(1) : '0';
                return (
                  <div key={item.name} className="flex items-center justify-between py-1 px-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="flex items-center gap-1 truncate text-slate-700 font-medium">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 ml-1 shrink-0">
                      {item.value} <span className="text-slate-400 font-normal text-[8.5px]">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Two lists: "Aujourd'hui" and "Formations à venir" */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-lists-row">
        {/* List 1: Aujourd'hui */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col" id="today-logs-panel">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#0062FF]" /> Aujourd'hui
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Formations en cours à la date du jour.</p>
            </div>
            <span className="text-[10px] bg-[#0062FF]/10 text-[#0062FF] font-semibold px-2 py-0.5 rounded-full">
              {todayLogs.length} formation{todayLogs.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="p-1 flex-1 max-h-[320px] overflow-y-auto divide-y divide-slate-100" id="today-logs-list">
            {todayLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-7 w-7 text-slate-300 mb-2" />
                <h5 className="text-xs font-semibold text-slate-600">Aucune formation aujourd'hui</h5>
                <p className="text-[10px] text-slate-400 mt-1">Aucune session en cours n'a été trouvée pour aujourd'hui.</p>
              </div>
            ) : (
              todayLogs.map(log => (
                <div key={log.id} className="p-2.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 text-xs">
                  {/* Left Aligned: Nom / Prénom / Escale / Service & Nom de la formation */}
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-semibold text-slate-900 truncate">
                      {log.collaboratorName} <span className="text-slate-300 font-normal mx-0.5">/</span> <span className="font-mono text-slate-700 font-bold">{log.escale}</span> <span className="text-slate-300 font-normal mx-0.5">/</span> <span className="text-slate-500 font-normal">{log.service}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      {log.moduleName}
                    </p>
                  </div>

                  {/* Right Aligned: Date de début / Durée & Formateur */}
                  <div className="shrink-0 text-right flex flex-col items-end">
                    <p className="font-semibold text-slate-800 text-xs">
                      {formatDateFR(log.dateDebut || log.dateInscription) || 'En cours'}
                      {log.duree ? ` / ${log.duree}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                      {log.formateur || 'Interne'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* List 2: Formations à venir (Semaine N+1) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col" id="upcoming-logs-panel">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#57AEA6]" /> Formations à venir
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Sessions planifiées pour la semaine N+1 (du lundi au dimanche).</p>
            </div>
            <span className="text-[10px] bg-[#57AEA6]/10 text-[#57AEA6] font-semibold px-2 py-0.5 rounded-full">
              {upcomingLogs.length} formation{upcomingLogs.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="p-1 flex-1 max-h-[320px] overflow-y-auto divide-y divide-slate-100" id="upcoming-logs-list">
            {upcomingLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-7 w-7 text-slate-300 mb-2" />
                <h5 className="text-xs font-semibold text-slate-600">Aucune formation à venir</h5>
                <p className="text-[10px] text-slate-400 mt-1 font-sans">Aucune session planifiée pour la semaine N+1 (du lundi au dimanche).</p>
              </div>
            ) : (
              upcomingLogs.map(log => (
                <div key={log.id} className="p-2.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 text-xs">
                  {/* Left Aligned: Nom / Prénom / Escale / Service & Nom de la formation */}
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-semibold text-slate-900 truncate">
                      {log.collaboratorName} <span className="text-slate-300 font-normal mx-0.5">/</span> <span className="font-mono text-slate-700 font-bold">{log.escale}</span> <span className="text-slate-300 font-normal mx-0.5">/</span> <span className="text-slate-500 font-normal">{log.service}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      {log.moduleName}
                    </p>
                  </div>

                  {/* Right Aligned: Date de début / Durée & Formateur */}
                  <div className="shrink-0 text-right flex flex-col items-end">
                    <p className="font-semibold text-slate-800 text-xs">
                      {formatDateFR(log.dateDebut || log.dateInscription) || 'À venir'}
                      {log.duree ? ` / ${log.duree}` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                      {log.formateur || 'Interne'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
