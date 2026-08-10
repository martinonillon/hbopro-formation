import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Receipt, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Download, 
  Search, 
  Filter, 
  ArrowUpDown, 
  RotateCcw, 
  FileSpreadsheet,
  Calendar,
  ExternalLink,
  Info,
  AlertTriangle,
  Lock,
  Euro,
  Check
} from 'lucide-react';
import { TrainingLog, Collaborator } from '../types';
import { getEscaleStyle } from '../data/modulesData';
import { formatDateFR, normalizeDateToISO } from '../utils/dateUtils';

interface BillingManagementProps {
  trainingLogs: TrainingLog[];
  collaborators?: Collaborator[];
  onUpdateTrainingStatus: (logId: string, updates: Partial<TrainingLog>) => void;
  onEditLog?: (log: TrainingLog) => void;
  onViewCollaborator?: (collabId: string) => void;
  isReadOnly?: boolean;
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

export default function BillingManagement({
  trainingLogs,
  collaborators = [],
  onUpdateTrainingStatus,
  onEditLog,
  onViewCollaborator,
  isReadOnly = false
}: BillingManagementProps) {

  // Helper to resolve the exact matricule from the collaborator's file
  const getMatriculeForLog = (log: TrainingLog): string => {
    if (!collaborators || collaborators.length === 0) {
      return log.collaboratorId || 'N/A';
    }

    let collab = collaborators.find(c => c.id === log.collaboratorId);

    if (!collab && log.collaboratorId) {
      collab = collaborators.find(c => c.matricule && c.matricule.trim().toLowerCase() === log.collaboratorId.trim().toLowerCase());
    }

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

  // KPI Filter State:
  // 'ALL_DEFAULT' = Par défaut (visa vide, En attente, Refusée)
  // 'Validée' | 'En attente' | 'Refusée'
  const [activeKpiFilter, setActiveKpiFilter] = useState<'ALL_DEFAULT' | 'Validée' | 'En attente' | 'Refusée'>('ALL_DEFAULT');

  // Search & secondary filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEscale, setFilterEscale] = useState<string>('ALL');
  const [filterService, setFilterService] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<keyof TrainingLog>('dateInscription');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Step 0: Filter eligible logs for billing
  // Le tableau se remplit automatiquement dès qu'une formation du Suivi général passe avec le résultat : Absent, Échouée, Rattrapage ou Réussite.
  const eligibleBillingLogs = useMemo(() => {
    const validResults = ['Absent', 'Échouée', 'Echouée', 'Rattrapage', 'Réussite'];
    return trainingLogs.filter(log => validResults.includes(log.resultat));
  }, [trainingLogs]);

  // Calculate counts for KPI cards across ALL eligible billing logs
  const kpiStats = useMemo(() => {
    let validee = 0;
    let enAttente = 0;
    let mefusee = 0;

    eligibleBillingLogs.forEach(log => {
      const v = (log.visa || '').trim();
      if (v === 'Validée') {
        validee++;
      } else if (v === 'Refusée') {
        mefusee++;
      } else {
        // 'En attente', or empty/undefined
        enAttente++;
      }
    });

    return { validee, enAttente, mefusee };
  }, [eligibleBillingLogs]);

  // Extract unique escales & services for filter selects
  const uniqueEscales = useMemo(() => {
    const set = new Set<string>();
    eligibleBillingLogs.forEach(l => { if (l.escale) set.add(l.escale); });
    return Array.from(set).sort();
  }, [eligibleBillingLogs]);

  const uniqueServices = useMemo(() => {
    const set = new Set<string>();
    eligibleBillingLogs.forEach(l => { if (l.service) set.add(l.service); });
    return Array.from(set).sort();
  }, [eligibleBillingLogs]);

  // Step 1: Base KPI filter
  // Par défaut (sans filtre KPI actif), afficher uniquement les lignes dont le visa est vide, en attente ou refusé.
  // Quand le visa passe à "Validée", la ligne disparaît immédiatement de la vue par défaut (accessible via le KPI "Validée").
  const kpiFilteredLogs = useMemo(() => {
    if (activeKpiFilter === 'ALL_DEFAULT') {
      return eligibleBillingLogs.filter(log => {
        const v = (log.visa || '').trim();
        return !v || v === 'En attente' || v === 'Refusée';
      });
    }
    if (activeKpiFilter === 'Validée') {
      return eligibleBillingLogs.filter(log => (log.visa || '').trim() === 'Validée');
    }
    if (activeKpiFilter === 'En attente') {
      return eligibleBillingLogs.filter(log => {
        const v = (log.visa || '').trim();
        return !v || v === 'En attente';
      });
    }
    if (activeKpiFilter === 'Refusée') {
      return eligibleBillingLogs.filter(log => (log.visa || '').trim() === 'Refusée');
    }
    return eligibleBillingLogs;
  }, [eligibleBillingLogs, activeKpiFilter]);

  // Step 2: Apply search, escale/service, and date range filters
  const searchedLogs = useMemo(() => {
    return kpiFilteredLogs.filter(log => {
      // Escale
      if (filterEscale !== 'ALL' && log.escale !== filterEscale) return false;
      // Service
      if (filterService !== 'ALL' && log.service !== filterService) return false;
      // Date Range Filter
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
        const numFact = (log.numFacture || '').toLowerCase();
        const matchName = log.collaboratorName?.toLowerCase().includes(term);
        const matchModule = log.moduleName?.toLowerCase().includes(term);
        const matchFormateur = log.formateur?.toLowerCase().includes(term);
        const matchEscale = log.escale?.toLowerCase().includes(term);
        const matchService = log.service?.toLowerCase().includes(term);
        const matchId = log.collaboratorId?.toLowerCase().includes(term);
        const matchMatricule = mat.includes(term);
        const matchFacture = numFact.includes(term);
        if (!matchName && !matchModule && !matchFormateur && !matchEscale && !matchService && !matchId && !matchMatricule && !matchFacture) {
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
      'Intérimaire': log.collaboratorName,
      'Escale': log.escale,
      'Service': log.service,
      'Module': log.moduleName,
      'Formateur': log.formateur || '',
      'ID Formateur': log.idFormateur || '',
      'Type': log.type || '',
      'Cycle': log.cycle || '',
      'Dates': `Du ${formatDateFR(log.dateDebut || log.dateInscription)} au ${formatDateFR(log.dateFin || log.dateValidation || log.dateDebut || log.dateInscription)}`,
      'Résultat': log.resultat || '',
      'N° Facture': log.numFacture || '',
      'Montant (€)': log.montantFacture !== undefined ? log.montantFacture : '',
      'Date Validation': log.dateValidation ? formatDateFR(log.dateValidation) : '',
      'Visa Facturation': log.visa || 'En attente',
      'Notes': log.cleanNotes || log.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gestion Facturation');

    const max_cols = Object.keys(data[0] || {}).map(key => {
      let max_len = key.length;
      data.forEach(row => {
        const val = row[key as keyof typeof row] || '';
        max_len = Math.max(max_len, String(val).length);
      });
      return { wch: max_len + 3 };
    });
    worksheet['!cols'] = max_cols;

    XLSX.writeFile(workbook, `gestion_facturation_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Toggle KPI filter
  const handleKpiCardClick = (kpi: 'Validée' | 'En attente' | 'Refusée') => {
    if (activeKpiFilter === kpi) {
      setActiveKpiFilter('ALL_DEFAULT');
    } else {
      setActiveKpiFilter(kpi);
    }
  };

  return (
    <div className="space-y-6" id="billing-management-container">
      
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="billing-header">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="h-6 w-6 text-[#0062FF]" />
              Gestion Facturation
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Suivi automatique des factures de formation, saisie des montants, validation des visas et préparation des factures clients.
          </p>
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportXLSX}
            className="flex items-center gap-2 bg-[#0062FF] hover:bg-[#0052D4] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer"
            id="export-billing-xlsx-btn"
          >
            <Download className="h-4 w-4" />
            <span>Exporter en XLSX</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Header (Clickable Filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="billing-kpi-cards">
        
        {/* Card 1: Validée (Vert / Emerald) */}
        <button
          type="button"
          onClick={() => handleKpiCardClick('Validée')}
          className={`text-left transition-all p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between cursor-pointer ${
            activeKpiFilter === 'Validée'
              ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-500/40 shadow-md scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 shadow-xs'
          }`}
          id="kpi-card-billing-validee"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Validée
            </span>
            <span className="bg-emerald-600 text-white font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
              {kpiStats.validee}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-emerald-950 font-mono tracking-tight">{kpiStats.validee}</p>
            <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Factures validées et approuvées</p>
          </div>
          {activeKpiFilter === 'Validée' && (
            <span className="absolute bottom-1.5 right-2 text-[9px] font-bold text-emerald-700 bg-emerald-200/60 px-1.5 py-0.2 rounded">
              Filtre actif
            </span>
          )}
        </button>

        {/* Card 2: En attente (Orange / Amber) */}
        <button
          type="button"
          onClick={() => handleKpiCardClick('En attente')}
          className={`text-left transition-all p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between cursor-pointer ${
            activeKpiFilter === 'En attente'
              ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/40 shadow-md scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 shadow-xs'
          }`}
          id="kpi-card-billing-en-attente"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-500" />
              En attente
            </span>
            <span className="bg-amber-500 text-white font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
              {kpiStats.enAttente}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-amber-950 font-mono tracking-tight">{kpiStats.enAttente}</p>
            <p className="text-[10px] text-amber-700 font-medium mt-0.5">Factures en attente de vérification</p>
          </div>
          {activeKpiFilter === 'En attente' && (
            <span className="absolute bottom-1.5 right-2 text-[9px] font-bold text-amber-700 bg-amber-200/60 px-1.5 py-0.2 rounded">
              Filtre actif
            </span>
          )}
        </button>

        {/* Card 3: Refusée (Rouge / Rose) */}
        <button
          type="button"
          onClick={() => handleKpiCardClick('Refusée')}
          className={`text-left transition-all p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between cursor-pointer ${
            activeKpiFilter === 'Refusée'
              ? 'bg-rose-50/90 border-rose-600 ring-2 ring-rose-500/40 shadow-md scale-[1.02]'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 shadow-xs'
          }`}
          id="kpi-card-billing-refusee"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-rose-600" />
              Refusée
            </span>
            <span className="bg-rose-600 text-white font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
              {kpiStats.mefusee}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-rose-950 font-mono tracking-tight">{kpiStats.mefusee}</p>
            <p className="text-[10px] text-rose-700 font-medium mt-0.5">Factures rejetées ou contestées</p>
          </div>
          {activeKpiFilter === 'Refusée' && (
            <span className="absolute bottom-1.5 right-2 text-[9px] font-bold text-rose-700 bg-rose-200/60 px-1.5 py-0.2 rounded">
              Filtre actif
            </span>
          )}
        </button>

      </div>

      {/* Toolbar: Search & Secondary Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3" id="billing-toolbar">
        
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, matricule, n° facture, module..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-[#0062FF] focus:outline-hidden transition-all text-slate-800 placeholder:text-slate-400"
            id="billing-search-input"
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
              title="Réinitialiser au filtre par défaut (vide, en attente, refusé)"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Réinitialiser filtre</span>
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
              Par défaut (visa vide, en attente ou refusé)
            </span>
          ) : activeKpiFilter === 'Validée' ? (
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
              Uniquement "Validée"
            </span>
          ) : activeKpiFilter === 'En attente' ? (
            <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-200">
              Uniquement "En attente"
            </span>
          ) : (
            <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md border border-rose-200">
              Uniquement "Refusée"
            </span>
          )}
        </div>
        <div className="font-mono text-slate-600 font-bold">
          {sortedLogs.length} ligne{sortedLogs.length > 1 ? 's' : ''} trouvée{sortedLogs.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Main Billing Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden" id="billing-table-card">
        
        {/* Warning Consigne Notice Banner */}
        <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-xs font-bold text-amber-900" id="billing-procedure-indication">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Saisir le n° de facture, le montant et la date avant de passer le statut à 'Validée'.</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="billing-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 uppercase tracking-wider font-semibold">
                
                {/* 1. Intérimaire (NOM + Prénom + Matricule) */}
                <th className="py-3 px-3 cursor-pointer hover:bg-slate-100/70" onClick={() => handleSort('collaboratorName')}>
                  <div className="flex items-center gap-1">
                    <span>Intérimaire</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>

                {/* 2. Escale / Service */}
                <th className="py-3 px-3 cursor-pointer hover:bg-slate-100/70" onClick={() => handleSort('escale')}>
                  <div className="flex items-center gap-1">
                    <span>Escale / Service</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>

                {/* 3. Module / Formateur + ID */}
                <th className="py-3 px-3 cursor-pointer hover:bg-slate-100/70" onClick={() => handleSort('moduleName')}>
                  <div className="flex items-center gap-1">
                    <span>Module / Formateur + ID</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>

                {/* 4. Type / Cycle */}
                <th className="py-3 px-3 cursor-pointer hover:bg-slate-100/70" onClick={() => handleSort('type')}>
                  <div className="flex items-center gap-1">
                    <span>Type / Cycle</span>
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

                {/* 6. Résultat */}
                <th className="py-3 px-3 cursor-pointer hover:bg-slate-100/70 text-center" onClick={() => handleSort('resultat')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Résultat</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>

                {/* 7. N° Facture */}
                <th className="py-3 px-3">N° Facture</th>

                {/* 8. Montant (€) */}
                <th className="py-3 px-3 text-center">Montant (€)</th>

                {/* 9. Date validation */}
                <th className="py-3 px-3 text-center">Date validation</th>

                {/* 10. Visa Facturation */}
                <th className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100/70" onClick={() => handleSort('visa')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Visa</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>

              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sortedLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">Aucune facture à afficher dans cette vue</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Modifiez vos filtres ou cliquez sur une autre carte KPI en haut.
                    </p>
                  </td>
                </tr>
              ) : (
                sortedLogs.map((log) => {
                  const currentVisa = (log.visa || '').trim();
                  const isValidated = currentVisa === 'Validée';
                  const isRejected = currentVisa === 'Refusée';

                  // Split identity: NOM (uppercase) / Prénom
                  const nameParts = (log.collaboratorName || '').split(' ');
                  const lastName = nameParts[0]?.toUpperCase() || log.collaboratorName;
                  const firstName = nameParts.slice(1).join(' ') || '';

                  return (
                    <tr 
                      key={log.id} 
                      className={`transition-colors ${
                        isRejected 
                          ? 'bg-rose-50/60 hover:bg-rose-100/60' 
                          : isValidated
                            ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                            : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* 1. Intérimaire: NOM + Prénom + Matricule */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 min-w-[130px]">
                          <div>
                            <div className="font-extrabold text-slate-900 uppercase text-xs tracking-tight">
                              {lastName}
                            </div>
                            <div className="text-slate-600 text-xs font-medium">
                              {firstName || '—'}
                            </div>
                            <div className="mt-0.5">
                              <span className="bg-slate-100 text-[10px] text-slate-600 font-mono font-bold px-1.5 py-0.2 rounded border border-slate-200">
                                {getMatriculeForLog(log)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Escale / Service */}
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

                      {/* 3. Module / Formateur + ID */}
                      <td className="py-2.5 px-3 min-w-[170px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-900 text-xs" title={log.moduleName}>
                            {log.moduleName}
                          </span>
                          
                          {/* Badges EMRG et ATTEST */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {/* Badge EMRG */}
                            <span 
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all select-none cursor-default shrink-0 ${
                                log.emrg 
                                  ? 'bg-sky-500 border-sky-500 text-white shadow-xs' 
                                  : 'bg-slate-100 border-slate-200 text-slate-400'
                              }`}
                              title={log.emrg ? "Émargement validé" : "Émargement non fait"}
                            >
                              {log.emrg && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              EMRG
                            </span>

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

                          <span className="text-[10px] text-slate-500 font-medium">
                            Formateur : <span className="font-semibold text-slate-700">{log.formateur || 'Interne'}</span>
                            {log.idFormateur && (
                              <span className="ml-1 text-[9px] bg-slate-100 px-1 py-0.2 rounded font-mono text-slate-600">ID: {log.idFormateur}</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* 4. Type / Cycle */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                            {log.type || 'Présentiel'}
                          </span>
                          <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-purple-100">
                            Cycle : {log.cycle || 'INI'}
                          </span>
                        </div>
                      </td>

                      {/* 5. Dates: Du [JJ/MM/AAAA] au [JJ/MM/AAAA] */}
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

                      {/* 6. Résultat */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${
                          log.resultat === 'Réussite' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          log.resultat === 'Echouée' || log.resultat === 'Échouée' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          log.resultat === 'Absent' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          log.resultat === 'Rattrapage' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                          'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {log.resultat}
                        </span>
                      </td>

                      {/* 7. N° Facture */}
                      <td className="py-3 px-3">
                        {isValidated || isReadOnly ? (
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 font-mono font-bold text-xs px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                            <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{log.numFacture || '—'}</span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={log.numFacture || ''}
                            onChange={(e) => onUpdateTrainingStatus(log.id, { numFacture: e.target.value })}
                            placeholder="Saisir n°..."
                            className="w-28 px-2 py-1 rounded border text-xs font-mono transition-all bg-white text-slate-800 border-slate-300 focus:border-[#0062FF] hover:border-slate-400"
                          />
                        )}
                      </td>

                      {/* 8. Montant (€) */}
                      <td className="py-3 px-3 text-center">
                        {isValidated || isReadOnly ? (
                          <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 font-mono font-extrabold text-xs px-2.5 py-1 rounded-md border border-emerald-200 shadow-2xs">
                            <Lock className="h-3 w-3 text-emerald-600 shrink-0" />
                            <span>{log.montantFacture !== undefined ? `${log.montantFacture} €` : '0 €'}</span>
                          </div>
                        ) : (
                          <div className="relative inline-block w-24">
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={log.montantFacture ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                onUpdateTrainingStatus(log.id, { montantFacture: val === '' ? undefined : parseFloat(val) });
                              }}
                              placeholder="0"
                              className="w-full pl-2 pr-5 py-1 rounded border text-xs font-mono font-bold text-slate-800 border-slate-300 focus:border-[#0062FF] hover:border-slate-400 text-right"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">€</span>
                          </div>
                        )}
                      </td>

                      {/* 9. Date validation */}
                      <td className="py-3 px-3 text-center">
                        {isValidated || isReadOnly ? (
                          <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 font-mono font-medium text-xs px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                            <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{formatDateFR(log.dateValidation) || '—'}</span>
                          </div>
                        ) : (
                          <input
                            type="date"
                            value={normalizeDateToISO(log.dateValidation) || ''}
                            onClick={() => {
                              if (!log.dateValidation) {
                                const today = new Date().toISOString().split('T')[0];
                                onUpdateTrainingStatus(log.id, { dateValidation: today });
                              }
                            }}
                            onChange={(e) => {
                              onUpdateTrainingStatus(log.id, { dateValidation: e.target.value });
                            }}
                            className="w-32 px-2 py-1 rounded border text-xs font-mono transition-all bg-white text-slate-800 border-slate-300 hover:border-[#0062FF] focus:border-[#0062FF] cursor-pointer"
                            title="Un clic remplit automatiquement la date du jour"
                          />
                        )}
                      </td>

                      {/* 10. Visa Facturation */}
                      <td className="py-3 px-3 text-center">
                        <select
                          value={log.visa || ''}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            if (isReadOnly) return;
                            const newVisa = e.target.value;
                            const updates: Partial<TrainingLog> = { visa: newVisa };
                            if (newVisa === 'Validée' && !log.dateValidation) {
                              updates.dateValidation = new Date().toISOString().split('T')[0];
                            }
                            onUpdateTrainingStatus(log.id, updates);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed ${
                            log.visa === 'Validée' ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs' :
                            log.visa === 'Refusée' ? 'bg-rose-600 text-white border-rose-700 shadow-2xs' :
                            log.visa === 'En attente' ? 'bg-amber-500 text-white border-amber-600 shadow-2xs' :
                            'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <option value="" className="bg-white text-slate-600 font-medium">— Visa —</option>
                          <option value="En attente" className="bg-white text-amber-900 font-bold">En attente</option>
                          <option value="Validée" className="bg-white text-emerald-900 font-bold">Validée</option>
                          <option value="Refusée" className="bg-white text-rose-900 font-bold">Refusée</option>
                        </select>
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
          <span>Affichage de {sortedLogs.length} ligne{sortedLogs.length > 1 ? 's' : ''} sur un total de {eligibleBillingLogs.length} factures éligibles.</span>
          <span className="text-[11px] text-slate-400">Statuts de visa synchronisés avec le suivi général</span>
        </div>
      </div>

    </div>
  );
}
