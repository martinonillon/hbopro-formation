import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  CreditCard, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  Search, 
  Filter, 
  ArrowUpDown, 
  RotateCcw, 
  FileSpreadsheet,
  Calendar,
  User,
  ExternalLink,
  Sparkles,
  Check,
  Info,
  Lock,
  FileText,
  Eye,
  X
} from 'lucide-react';
import { TrainingLog, Collaborator } from '../types';
import { getEscaleStyle } from '../data/modulesData';
import { formatDateFR, normalizeDateToISO } from '../utils/dateUtils';

interface PayrollManagementProps {
  trainingLogs: TrainingLog[];
  collaborators?: Collaborator[];
  onUpdateTrainingStatus: (logId: string, updates: Partial<TrainingLog>) => void;
  onEditLog?: (log: TrainingLog) => void;
  onViewCollaborator?: (collabId: string) => void;
  isReadOnly?: boolean;
}

// Helper to calculate duration matching Suivi Général logic
function calculateDuration(log: TrainingLog): number {
  const d1 = new Date(log.dateDebut || log.dateInscription);
  const d2 = new Date(log.dateFin || log.dateValidation || log.dateInscription);
  let days = 1;
  if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
    const diffTime = d2.getTime() - d1.getTime();
    days = diffTime >= 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 : 1;
  }

  const getSessionHours = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (isNaN(sh) || isNaN(eh)) return 0;
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? diff / 60 : 0;
  };

  const s1 = getSessionHours(log.heureDebut1, log.heureFin1);
  const s2 = getSessionHours(log.heureDebut2, log.heureFin2);
  const hoursPerDay = (s1 + s2) || 7;
  return hoursPerDay * days;
}

// Helper to parse date to timestamp for chronological sorting
function parseDateToTime(dateStr?: string): number {
  if (!dateStr) return 0;
  const s = dateStr.trim();
  if (!s) return 0;

  // DD/MM/YYYY or DD-MM-YYYY
  let match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  // YYYY-MM-DD or YYYY/MM/DD
  match = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

export default function PayrollManagement({
  trainingLogs,
  collaborators = [],
  onUpdateTrainingStatus,
  onEditLog,
  onViewCollaborator,
  isReadOnly = false
}: PayrollManagementProps) {
  // Helper to resolve the exact matricule from the collaborator's file
  const getMatriculeForLog = (log: TrainingLog): string => {
    if (!collaborators || collaborators.length === 0) {
      return log.collaboratorId || 'N/A';
    }

    // 1. Direct match by collaborator ID
    let collab = collaborators.find(c => c.id === log.collaboratorId);

    // 2. Direct match by matricule field
    if (!collab && log.collaboratorId) {
      collab = collaborators.find(c => c.matricule && c.matricule.trim().toLowerCase() === log.collaboratorId.trim().toLowerCase());
    }

    // 3. Match by name (Nom + Prénom or Prénom + Nom)
    if (!collab && log.collaboratorName) {
      const cleanLogName = log.collaboratorName.trim().toLowerCase();
      collab = collaborators.find(c => {
        const full1 = `${c.lastName} ${c.firstName}`.toLowerCase();
        const full2 = `${c.firstName} ${c.lastName}`.toLowerCase();
        return full1 === cleanLogName || full2 === cleanLogName || (c.lastName && cleanLogName.length >= 3 && cleanLogName.includes(c.lastName.toLowerCase()));
      });
    }

    if (collab && collab.matricule) {
      return collab.matricule;
    }

    return log.collaboratorId || 'N/A';
  };

  // KPI Filter State: null or 'ALL_DEFAULT' means default 3 statuses.
  // Specific KPI filter: 'A payer' | 'Facturation client' | 'A relancer' | 'Paye OK'
  const [activeKpiFilter, setActiveKpiFilter] = useState<'ALL_DEFAULT' | 'A payer' | 'Facturation client' | 'A relancer' | 'Paye OK'>('ALL_DEFAULT');

  // Search & secondary filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEscale, setFilterEscale] = useState<string>('ALL');
  const [filterService, setFilterService] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // PDF Preview Modal state
  const [pdfPreviewState, setPdfPreviewState] = useState<{
    isOpen: boolean;
    url: string;
    fileName: string;
  } | null>(null);

  const handleOpenPdfInNewTab = (url: string) => {
    const w = window.open();
    if (w) {
      w.document.write(`<iframe src="${url}" style="border:none; width:100%; height:100vh;"></iframe>`);
      w.document.title = "Document d'émargement PDF";
    }
  };

  // Sorting
  const [sortField, setSortField] = useState<keyof TrainingLog>('dateInscription');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Calculate counts for KPI cards across ALL logs
  const kpiStats = useMemo(() => {
    let aPayer = 0;
    let facturation = 0;
    let aRelancer = 0;
    let payees = 0;

    trainingLogs.forEach(log => {
      const c = log.consigne;
      if (c === 'A payer') aPayer++;
      else if (c === 'Facturation client') facturation++;
      else if (c === 'A relancer') aRelancer++;
      else if (c === 'Paye OK' || c === 'Payées') payees++;
    });

    return { aPayer, facturation, aRelancer, payees };
  }, [trainingLogs]);

  // Extract unique escales & services for filter selects
  const uniqueEscales = useMemo(() => {
    const set = new Set<string>();
    trainingLogs.forEach(l => { if (l.escale) set.add(l.escale); });
    return Array.from(set).sort();
  }, [trainingLogs]);

  const uniqueServices = useMemo(() => {
    const set = new Set<string>();
    trainingLogs.forEach(l => { if (l.service) set.add(l.service); });
    return Array.from(set).sort();
  }, [trainingLogs]);

  // Step 1: Base KPI filter (Default = À payer, Facturation client, À relancer)
  const kpiFilteredLogs = useMemo(() => {
    if (activeKpiFilter === 'ALL_DEFAULT') {
      return trainingLogs.filter(log => 
        log.consigne === 'A payer' || 
        log.consigne === 'Facturation client' || 
        log.consigne === 'A relancer'
      );
    }
    if (activeKpiFilter === 'A payer') {
      return trainingLogs.filter(log => log.consigne === 'A payer');
    }
    if (activeKpiFilter === 'Facturation client') {
      return trainingLogs.filter(log => log.consigne === 'Facturation client');
    }
    if (activeKpiFilter === 'A relancer') {
      return trainingLogs.filter(log => log.consigne === 'A relancer');
    }
    if (activeKpiFilter === 'Paye OK') {
      return trainingLogs.filter(log => log.consigne === 'Paye OK' || log.consigne === 'Payées');
    }
    return trainingLogs;
  }, [trainingLogs, activeKpiFilter]);

  // Step 2: Apply search, escale/service, and date range filters
  const searchedLogs = useMemo(() => {
    return kpiFilteredLogs.filter(log => {
      // Escale
      if (filterEscale !== 'ALL' && log.escale !== filterEscale) return false;
      // Service
      if (filterService !== 'ALL' && log.service !== filterService) return false;
      // Date Range Filter ("du ... au ...")
      if (startDate || endDate) {
        const logStart = parseDateToTime(log.dateDebut || log.dateInscription);
        const logEnd = parseDateToTime(log.dateFin || log.dateValidation || log.dateDebut || log.dateInscription);

        if (startDate) {
          const startMs = new Date(startDate + 'T00:00:00').getTime();
          const effectiveEnd = logEnd || logStart;
          if (effectiveEnd && effectiveEnd < startMs) return false;
        }

        if (endDate) {
          const endMs = new Date(endDate + 'T23:59:59').getTime();
          const effectiveStart = logStart || logEnd;
          if (effectiveStart && effectiveStart > endMs) return false;
        }
      }
      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const mat = getMatriculeForLog(log).toLowerCase();
        const matchName = log.collaboratorName?.toLowerCase().includes(term);
        const matchModule = log.moduleName?.toLowerCase().includes(term);
        const matchFormateur = log.formateur?.toLowerCase().includes(term);
        const matchEscale = log.escale?.toLowerCase().includes(term);
        const matchService = log.service?.toLowerCase().includes(term);
        const matchId = log.collaboratorId?.toLowerCase().includes(term);
        const matchMatricule = mat.includes(term);
        if (!matchName && !matchModule && !matchFormateur && !matchEscale && !matchService && !matchId && !matchMatricule) {
          return false;
        }
      }
      return true;
    });
  }, [kpiFilteredLogs, searchTerm, filterEscale, filterService, startDate, endDate, collaborators]);

  // Step 3: Sort logs chronologically or by selected field
  const sortedLogs = useMemo(() => {
    const list = [...searchedLogs];
    list.sort((a, b) => {
      if (sortField === 'dateInscription' || sortField === 'dateDebut') {
        const dateA = a.dateDebut || a.dateInscription || '';
        const dateB = b.dateDebut || b.dateInscription || '';
        const timeA = parseDateToTime(dateA);
        const timeB = parseDateToTime(dateB);
        if (timeA !== timeB) {
          return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        }
        return 0;
      }

      if (sortField === 'collaboratorId') {
        const matA = getMatriculeForLog(a);
        const matB = getMatriculeForLog(b);
        const cmp = matA.localeCompare(matB, 'fr', { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      const valA = String(a[sortField] || '').trim();
      const valB = String(b[sortField] || '').trim();

      const cmp = valA.localeCompare(valB, 'fr', { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [searchedLogs, sortField, sortDirection, collaborators]);

  // Toggle column sort
  const handleSort = (field: keyof TrainingLog) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Export filtered logs to XLSX
  const handleExportXLSX = () => {
    const data = sortedLogs.map(log => ({
      'Matricule': getMatriculeForLog(log),
      'Identité': log.collaboratorName,
      'Escale': log.escale,
      'Service': log.service,
      'Module': log.moduleName,
      'CTT': 'CTT',
      'Dates': `Du ${formatDateFR(log.dateDebut || log.dateInscription)} au ${formatDateFR(log.dateFin || log.dateValidation || log.dateDebut || log.dateInscription)}`,
      'Horaires': log.heureDebut1 && log.heureFin1 ? `${log.heureDebut1} - ${log.heureFin1}` : '08:00 - 16:00',
      'Consigne': log.consigne || 'N/A',
      'Date de paye': log.datePaye ? formatDateFR(log.datePaye) : '',
      'Commentaire': log.commentairePaye || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gestion Paye');

    // Auto-fit column widths
    const max_cols = Object.keys(data[0] || {}).map(key => {
      let max_len = key.length;
      data.forEach(row => {
        const val = row[key as keyof typeof row] || '';
        max_len = Math.max(max_len, String(val).length);
      });
      return { wch: max_len + 3 };
    });
    worksheet['!cols'] = max_cols;

    XLSX.writeFile(workbook, `gestion_paye_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Toggle KPI filter
  const handleKpiCardClick = (kpi: 'A payer' | 'Facturation client' | 'A relancer' | 'Paye OK') => {
    if (activeKpiFilter === kpi) {
      setActiveKpiFilter('ALL_DEFAULT');
    } else {
      setActiveKpiFilter(kpi);
    }
  };

  return (
    <div className="space-y-6" id="payroll-management-container">
      
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="payroll-header">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Gestion Paye</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Suivi des rémunérations, facturations clients et relances de paiement pour l'ensemble des sessions de formation.
          </p>
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportXLSX}
            className="flex items-center gap-2 bg-[#0062FF] hover:bg-[#0052D4] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs hover:shadow-md active:scale-95"
            id="export-paye-xlsx-btn"
          >
            <Download className="h-4 w-4" />
            <span>Exporter en XLSX</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Header (Clickable Filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="payroll-kpi-cards">
        
        {/* Card 1: À payer (Purple) */}
        <button
          onClick={() => handleKpiCardClick('A payer')}
          className={`text-left transition-all p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between cursor-pointer ${
            activeKpiFilter === 'A payer'
              ? 'bg-purple-50/90 border-purple-600 ring-2 ring-purple-500/40 shadow-md scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 shadow-xs'
          }`}
          id="kpi-card-a-payer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-purple-600" />
              À payer
            </span>
            <span className="bg-purple-600 text-white font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
              {kpiStats.aPayer}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-purple-950 font-mono tracking-tight">{kpiStats.aPayer}</p>
            <p className="text-[10px] text-purple-700 font-medium mt-0.5">Sessions en attente de versement</p>
          </div>
          {activeKpiFilter === 'A payer' && (
            <span className="absolute bottom-1.5 right-2 text-[9px] font-bold text-purple-700 bg-purple-200/60 px-1.5 py-0.2 rounded">
              Filtre actif
            </span>
          )}
        </button>

        {/* Card 2: Facturation client (Orange) */}
        <button
          onClick={() => handleKpiCardClick('Facturation client')}
          className={`text-left transition-all p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between cursor-pointer ${
            activeKpiFilter === 'Facturation client'
              ? 'bg-orange-50/90 border-orange-500 ring-2 ring-orange-500/40 shadow-md scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50/30 shadow-xs'
          }`}
          id="kpi-card-facturation"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-orange-500" />
              Facturation client
            </span>
            <span className="bg-orange-500 text-white font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
              {kpiStats.facturation}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-orange-950 font-mono tracking-tight">{kpiStats.facturation}</p>
            <p className="text-[10px] text-orange-700 font-medium mt-0.5">Dossiers à facturer aux clients</p>
          </div>
          {activeKpiFilter === 'Facturation client' && (
            <span className="absolute bottom-1.5 right-2 text-[9px] font-bold text-orange-700 bg-orange-200/60 px-1.5 py-0.2 rounded">
              Filtre actif
            </span>
          )}
        </button>

        {/* Card 3: À relancer (Rose / Red) */}
        <button
          onClick={() => handleKpiCardClick('A relancer')}
          className={`text-left transition-all p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between cursor-pointer ${
            activeKpiFilter === 'A relancer'
              ? 'bg-rose-50/90 border-rose-600 ring-2 ring-rose-500/40 shadow-md scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 shadow-xs'
          }`}
          id="kpi-card-a-relancer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-rose-600 animate-pulse" />
              À relancer
            </span>
            <span className="bg-rose-600 text-white font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
              {kpiStats.aRelancer}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-rose-950 font-mono tracking-tight">{kpiStats.aRelancer}</p>
            <p className="text-[10px] text-rose-700 font-medium mt-0.5">Attestation ou émargement à demander au CDF</p>
          </div>
          {activeKpiFilter === 'A relancer' && (
            <span className="absolute bottom-1.5 right-2 text-[9px] font-bold text-rose-700 bg-rose-200/60 px-1.5 py-0.2 rounded">
              Filtre actif
            </span>
          )}
        </button>

        {/* Card 4: Payées (Emerald / Green) */}
        <button
          onClick={() => handleKpiCardClick('Paye OK')}
          className={`text-left transition-all p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between cursor-pointer ${
            activeKpiFilter === 'Paye OK'
              ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-500/40 shadow-md scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 shadow-xs'
          }`}
          id="kpi-card-payees"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Payées
            </span>
            <span className="bg-emerald-600 text-white font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
              {kpiStats.payees}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-emerald-950 font-mono tracking-tight">{kpiStats.payees}</p>
            <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Règlements effectués et archivés</p>
          </div>
          {activeKpiFilter === 'Paye OK' && (
            <span className="absolute bottom-1.5 right-2 text-[9px] font-bold text-emerald-700 bg-emerald-200/60 px-1.5 py-0.2 rounded">
              Filtre actif
            </span>
          )}
        </button>

      </div>

      {/* Toolbar: Search & Secondary Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3" id="payroll-toolbar">
        
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, matricule, module, formateur..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-[#0062FF] focus:outline-hidden transition-all text-slate-800 placeholder:text-slate-400"
            id="payroll-search-input"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter selects */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Escale Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-500 text-[11px] shrink-0">Escale :</span>
            <select
              value={filterEscale}
              onChange={(e) => setFilterEscale(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Toutes ({uniqueEscales.length})</option>
              {uniqueEscales.map(esc => (
                <option key={esc} value={esc}>{esc}</option>
              ))}
            </select>
          </div>

          {/* Service Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
            <span className="font-semibold text-slate-500 text-[11px] shrink-0">Service :</span>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tous ({uniqueServices.length})</option>
              {uniqueServices.map(srv => (
                <option key={srv} value={srv}>{srv}</option>
              ))}
            </select>
          </div>

          {/* Date Range Filter ("du ... au ...") */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-[#0062FF] shrink-0" />
            <span className="font-semibold text-slate-600 text-[11px] shrink-0">Période :</span>
            <span className="text-slate-400 text-[11px] shrink-0">du</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-medium focus:outline-hidden cursor-pointer"
            />
            <span className="text-slate-400 text-[11px] shrink-0">au</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-medium focus:outline-hidden cursor-pointer"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1 rounded-sm hover:bg-slate-200/60"
                title="Effacer le filtre de date"
              >
                ✕
              </button>
            )}
          </div>

          {/* Active Filter Indicator & Reset */}
          {activeKpiFilter !== 'ALL_DEFAULT' && (
            <button
              onClick={() => setActiveKpiFilter('ALL_DEFAULT')}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              title="Réinitialiser au filtre par défaut (À payer, Facturation client, À relancer)"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Réinitialiser (3 statuts)</span>
            </button>
          )}

        </div>

      </div>

      {/* Active Filter Banner summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Vue affichée :</span>
          {activeKpiFilter === 'ALL_DEFAULT' ? (
            <span className="bg-slate-100 text-slate-800 font-medium px-2 py-0.5 rounded-md border border-slate-200">
              Par défaut (À payer, Facturation client, À relancer)
            </span>
          ) : activeKpiFilter === 'A payer' ? (
            <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-md border border-purple-200">
              Uniquement "À payer"
            </span>
          ) : activeKpiFilter === 'Facturation client' ? (
            <span className="bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-md border border-orange-200">
              Uniquement "Facturation client"
            </span>
          ) : activeKpiFilter === 'A relancer' ? (
            <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md border border-rose-200">
              Uniquement "À relancer"
            </span>
          ) : (
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
              Uniquement "Payées"
            </span>
          )}
        </div>
        <div className="font-mono text-slate-600 font-bold">
          {sortedLogs.length} dossier{sortedLogs.length > 1 ? 's' : ''} trouvé{sortedLogs.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Main Payroll Table (Strict 9 Columns) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden" id="payroll-table-card">
        
        {/* Procedure Indication Banner */}
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-amber-900" id="payroll-procedure-indication">
          <Info className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Saisir la date et le commentaire avant de valider le statut "Paye OK"</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="payroll-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 uppercase tracking-wider font-semibold">
                
                {/* 1. Matricule */}
                <th className="py-3 px-3 cursor-pointer hover:bg-slate-100/70" onClick={() => handleSort('collaboratorId')}>
                  <div className="flex items-center gap-1">
                    <span>Matricule</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>

                {/* 2. Identité */}
                <th className="py-3 px-3 cursor-pointer hover:bg-slate-100/70" onClick={() => handleSort('collaboratorName')}>
                  <div className="flex items-center gap-1">
                    <span>Identité</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>

                {/* 3. Escale / Service */}
                <th className="py-3 px-3 cursor-pointer hover:bg-slate-100/70" onClick={() => handleSort('escale')}>
                  <div className="flex items-center gap-1">
                    <span>Escale / Service</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>

                {/* 4. Module */}
                <th className="py-3 px-3 cursor-pointer hover:bg-slate-100/70" onClick={() => handleSort('moduleName')}>
                  <div className="flex items-center gap-1">
                    <span>Module</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>

                {/* 5. Dates */}
                <th className="py-3 px-3 cursor-pointer hover:bg-slate-100/70 text-center" onClick={() => handleSort('dateInscription')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Dates</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>

                {/* 6. Horaires */}
                <th className="py-3 px-3 text-center">Horaires</th>

                {/* 7. Consigne (Statut) */}
                <th className="py-3 px-3 cursor-pointer hover:bg-slate-100/70 text-center" onClick={() => handleSort('consigne')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Consigne</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>

                {/* 8. Date de paye */}
                <th className="py-3 px-3 text-center">Date de paye</th>

                {/* 9. Commentaire */}
                <th className="py-3 px-3">Commentaire</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sortedLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">Aucun enregistrement de paye correspondant</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Essayez de modifier vos filtres ou de cliquer sur un autre KPI.
                    </p>
                  </td>
                </tr>
              ) : (
                sortedLogs.map((log) => {
                  const isARelancer = log.consigne === 'A relancer';
                  const isPayeOk = log.consigne === 'Paye OK' || log.consigne === 'Payées';

                  // Split identity: NOM (uppercase) / Prénom
                  const nameParts = (log.collaboratorName || '').split(' ');
                  const lastName = nameParts[0]?.toUpperCase() || log.collaboratorName;
                  const firstName = nameParts.slice(1).join(' ') || '';

                  // Schedule info
                  const hasCustomSchedule = log.heureDebut1 && log.heureFin1;
                  const scheduleText = hasCustomSchedule ? `${log.heureDebut1} - ${log.heureFin1}` : '08:00 - 16:00';
                  const durationText = hasCustomSchedule ? '7h00' : '7h';

                  return (
                    <tr 
                      key={log.id} 
                      className={`transition-colors ${
                        isARelancer 
                          ? 'bg-rose-100/80 animate-pulse border-l-4 border-rose-600' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* 1. Matricule (Intérimaire) */}
                      <td className="py-3 px-3 font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {getMatriculeForLog(log)}
                        </span>
                      </td>

                      {/* 2. Identité: NOM (1ère ligne) / Prénom (2ème) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div>
                            <div className="font-extrabold text-slate-900 uppercase text-xs tracking-tight">
                              {lastName}
                            </div>
                            <div className="text-slate-600 text-xs font-medium">
                              {firstName || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Escale / Service */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          {(() => {
                            const style = getEscaleStyle(log.escale);
                            return (
                              <span className={`${style.bg} ${style.text} ${style.border} px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border`}>
                                {log.escale}
                              </span>
                            );
                          })()}
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-100/30">
                            {log.service}
                          </span>
                        </div>
                      </td>

                      {/* 4. Module: Nom + Badges CTT, EMRG, ATTEST */}
                      <td className="py-2.5 px-3 min-w-[170px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-slate-800 text-xs" title={log.moduleName}>
                            {log.moduleName}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* Badge CTT */}
                            <span 
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all select-none cursor-default shrink-0 ${
                                log.cttHbo 
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                                  : 'bg-slate-100 border-slate-200 text-slate-400'
                              }`}
                              title={log.cttHbo ? "Contrat CTT validé" : "Contrat CTT non fait"}
                            >
                              {log.cttHbo && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              CTT
                            </span>

                            {/* Badge EMRG */}
                            {(() => {
                              const hasPdf = !!log.emrgFileUrl;

                              if (hasPdf) {
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPdfPreviewState({
                                        isOpen: true,
                                        url: log.emrgFileUrl!,
                                        fileName: log.emrgFileName || `${log.moduleName}_Emargement.pdf`
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer shrink-0 bg-sky-600 hover:bg-sky-700 border-sky-700 text-white shadow-xs hover:shadow-md ring-2 ring-sky-300 ring-offset-1 hover:scale-105 active:scale-95 group"
                                    title="Consulter le PDF d'émargement (Cliquer pour ouvrir)"
                                  >
                                    <FileText className="h-2.5 w-2.5 text-white" />
                                    <span>EMRG</span>
                                    <Eye className="h-2.5 w-2.5 opacity-80 group-hover:opacity-100" />
                                  </button>
                                );
                              }

                              return (
                                <span 
                                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all select-none cursor-default shrink-0 ${
                                    log.emrg 
                                      ? 'bg-sky-500 border-sky-500 text-white shadow-xs' 
                                      : 'bg-slate-100 border-slate-200 text-slate-400'
                                  }`}
                                  title={log.emrg ? "Émargement validé (Aucun fichier PDF)" : "Émargement non fait"}
                                >
                                  {log.emrg && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                  EMRG
                                </span>
                              );
                            })()}

                            {/* Badge ATTEST */}
                            <span 
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all select-none cursor-default shrink-0 ${
                                log.attest 
                                  ? 'bg-pink-500 border-pink-500 text-white shadow-xs' 
                                  : 'bg-slate-100 border-slate-200 text-slate-400'
                              }`}
                              title={log.attest ? "Attestation validée" : "Attestation non faite"}
                            >
                              {log.attest && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              ATTEST
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 5. Dates: du... 1ère ligne / au... 2ème ligne */}
                      <td className="py-2.5 px-3 text-center text-slate-500 whitespace-nowrap font-mono text-[10px]">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-[9px]">du</span>
                            <span className="font-semibold text-slate-700 bg-slate-50 px-1 py-0.5 rounded border border-slate-200/40">
                              {formatDateFR(log.dateDebut || log.dateInscription)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 text-[9px]">au</span>
                            <span className="font-semibold text-slate-700 bg-slate-50 px-1 py-0.5 rounded border border-slate-200/40">
                              {formatDateFR(log.dateFin || log.dateValidation || log.dateDebut || log.dateInscription)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 6. Horaires: Heure début/fin + Durée calculée identique au suivi général */}
                      <td className="py-2.5 px-3 text-xs text-slate-700 whitespace-nowrap text-center">
                        <div className="font-mono font-medium text-slate-800 text-[11px]">{scheduleText}</div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Durée : <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 font-mono text-[10px]">{calculateDuration(log)} h</span>
                        </div>
                      </td>

                      {/* 7. Consigne (Statut) */}
                      <td className="py-3 px-3 text-center">
                        <select
                          value={['A payer', 'Facturation client', 'A relancer', 'Paye OK', 'Payées'].includes(log.consigne || '') ? log.consigne : (log.consigne || 'A payer')}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            if (isReadOnly) return;
                            const newConsigne = e.target.value;
                            const updates: Partial<TrainingLog> = { consigne: newConsigne };
                            if ((newConsigne === 'Paye OK' || newConsigne === 'Payées') && !log.datePaye) {
                              updates.datePaye = new Date().toISOString().split('T')[0];
                            }
                            onUpdateTrainingStatus(log.id, updates);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed ${
                            log.consigne === 'A payer' ? 'bg-purple-600 text-white border-purple-700 shadow-2xs' :
                            log.consigne === 'Paye OK' || log.consigne === 'Payées' ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs' :
                            log.consigne === 'Facturation client' ? 'bg-orange-500 text-white border-orange-600 shadow-2xs' :
                            log.consigne === 'A relancer' ? 'bg-rose-600 text-white border-rose-700 shadow-2xs' :
                            'bg-[#0062FF] text-white border-blue-700'
                          }`}
                        >
                          {!['A payer', 'Facturation client', 'A relancer', 'Paye OK', 'Payées'].includes(log.consigne || '') && (
                            <option value={log.consigne || ''} disabled hidden>
                              {log.consigne || 'Choisir consigne...'}
                            </option>
                          )}
                          <option value="A payer" className="bg-white text-purple-900 font-bold">À payer</option>
                          <option value="Facturation client" className="bg-white text-orange-900 font-bold">Facturation client</option>
                          <option value="A relancer" className="bg-white text-rose-900 font-bold">À relancer</option>
                          <option value="Paye OK" className="bg-white text-emerald-900 font-bold">Paye OK</option>
                        </select>
                      </td>

                      {/* 8. Date de paye (Editable, click auto-fills today, read-only if Paye OK) */}
                      <td className="py-3 px-3 text-center">
                        {isPayeOk || isReadOnly ? (
                          <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 font-mono font-medium text-xs px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                            <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{formatDateFR(log.datePaye) || '—'}</span>
                          </div>
                        ) : (
                          <input
                            type="date"
                            value={normalizeDateToISO(log.datePaye) || ''}
                            onClick={() => {
                              if (!log.datePaye) {
                                const today = new Date().toISOString().split('T')[0];
                                onUpdateTrainingStatus(log.id, { datePaye: today });
                              }
                            }}
                            onChange={(e) => {
                              onUpdateTrainingStatus(log.id, { datePaye: e.target.value });
                            }}
                            className="w-32 px-2 py-1 rounded border text-xs font-mono transition-all bg-white text-slate-800 border-slate-300 hover:border-[#0062FF] focus:border-[#0062FF] cursor-pointer"
                            title="Un clic remplit automatiquement la date du jour"
                          />
                        )}
                      </td>

                      {/* 9. Commentaire (Texte libre, read-only if Paye OK) */}
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={log.commentairePaye || ''}
                          disabled={isPayeOk || isReadOnly}
                          onChange={(e) => {
                            if (!isPayeOk && !isReadOnly) {
                              onUpdateTrainingStatus(log.id, { commentairePaye: e.target.value });
                            }
                          }}
                          placeholder={isPayeOk || isReadOnly ? "Verrouillé" : "Saisir un commentaire..."}
                          className={`w-full min-w-[150px] px-2.5 py-1 rounded border text-xs transition-all ${
                            isPayeOk || isReadOnly
                              ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed opacity-80'
                              : 'bg-white text-slate-800 border-slate-300 focus:border-[#0062FF] hover:border-slate-400'
                          }`}
                        />
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info in table */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Affichage de {sortedLogs.length} ligne{sortedLogs.length > 1 ? 's' : ''} sur un total de {trainingLogs.length} sessions.</span>
          <span className="text-[11px] text-slate-400">Modifications synchronisées en direct avec l'historique de l'intérimaire</span>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {pdfPreviewState?.isOpen && (
        <div className="fixed inset-0 z-[110] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-scale-in">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm truncate">
                    {pdfPreviewState.fileName || "Document d'émargement (PDF)"}
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Document d'émargement — Gestion Paye
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPdfInNewTab(pdfPreviewState.url)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Ouvrir dans un nouvel onglet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPdfPreviewState(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-2 overflow-hidden flex flex-col items-center justify-center">
              {pdfPreviewState.url ? (
                <iframe
                  src={pdfPreviewState.url}
                  title="Aperçu PDF"
                  className="w-full h-full rounded-xl border border-slate-200 shadow-inner bg-white"
                />
              ) : (
                <div className="text-center p-6 text-slate-500 text-xs">
                  Impossible d'afficher le document PDF.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
