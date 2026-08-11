import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Download, 
  SlidersHorizontal, 
  MapPin, 
  FileCheck, 
  Edit3, 
  Calendar,
  Layers,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  PlusCircle,
  Trash2,
  AlertCircle,
  Check
} from 'lucide-react';
import { TrainingLog } from '../types';
import { ESCALES, SERVICES, RESULTATS, CONSIGNES, TYPES, CYCLES, getEscaleStyle, FORMATEURS } from '../data/modulesData';
import { formatDateFR } from '../utils/dateUtils';

// Helper to parse any date format (YYYY-MM-DD, DD/MM/YYYY, etc.) to a sortable timestamp
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

  // Fallback to JS standard parsing
  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

interface TrainingLogsProps {
  trainingLogs: TrainingLog[];
  onUpdateTrainingStatus: (logId: string, updates: Partial<TrainingLog>) => void;
  onDeleteTrainingLog: (logId: string) => void;
  onOpenEnrollment: () => void;
  onEditLog: (log: TrainingLog) => void;
  initialFilters?: {
    resultat?: string | string[];
    consigne?: string;
    madEa?: boolean;
    name?: string;
  } | null;
  onClearFilters?: () => void;
  onViewCollaborator?: (collaboratorId: string) => void;
  onDeduplicateLogs?: () => Promise<{ success: boolean; count?: number }> | { success: boolean; count?: number };
  isReadOnly?: boolean;
}

export default function TrainingLogs({ 
  trainingLogs, 
  onUpdateTrainingStatus, 
  onDeleteTrainingLog, 
  onOpenEnrollment,
  onEditLog,
  initialFilters,
  onClearFilters,
  onViewCollaborator,
  onDeduplicateLogs,
  isReadOnly = false
}: TrainingLogsProps) {
  const [dedupResult, setDedupResult] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEscale, setFilterEscale] = useState('ALL');
  const [filterService, setFilterService] = useState('ALL');
  const [filterConsigne, setFilterConsigne] = useState('ALL');
  const [filterResult, setFilterResult] = useState('EN_COURS_A_TRAITER');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Sync initialFilters when passed from dashboard
  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.resultat) {
        if (Array.isArray(initialFilters.resultat)) {
          if (initialFilters.resultat.includes('En cours') && initialFilters.resultat.includes('Rattrapage')) {
            setFilterResult('EN_COURS_RATTRAPAGE');
          } else if (initialFilters.resultat.includes('Absent') && initialFilters.resultat.includes('Echouée')) {
            setFilterResult('ACTIONS_REQUISES');
          } else {
            setFilterResult('ALL');
          }
        } else {
          setFilterResult(initialFilters.resultat);
        }
      } else {
        setFilterResult('EN_COURS_A_TRAITER');
      }

      if (initialFilters.consigne) {
        setFilterConsigne(initialFilters.consigne);
      } else {
        setFilterConsigne('ALL');
      }

      setSearchTerm('');
      setFilterEscale('ALL');
      setFilterService('ALL');
      setFilterType('ALL');
    }
  }, [initialFilters]);

  // Sorting State
  const [sortField, setSortField] = useState<keyof TrainingLog>('dateInscription');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
  const [historyLog, setHistoryLog] = useState<TrainingLog | null>(null);

  // Filter logic
  const filteredLogs = useMemo(() => {
    return trainingLogs.filter(log => {
      const matchesSearch = 
        log.collaboratorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.moduleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.formateur.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEscale = filterEscale === 'ALL' || log.escale === filterEscale;
      const matchesService = filterService === 'ALL' || log.service === filterService;
      const matchesConsigne = filterConsigne === 'ALL' || (log.consigne || 'N/A') === filterConsigne;
      
      let matchesResult = false;
      if (filterResult === 'ALL') {
        matchesResult = true;
      } else if (filterResult === 'EN_COURS_A_TRAITER') {
        const res = (log.resultat || '').trim().toLowerCase();
        matchesResult = res === 'en cours' || res === 'a traiter' || res === 'à traiter';
      } else if (filterResult === 'EN_COURS_RATTRAPAGE') {
        matchesResult = log.resultat === 'En cours' || log.resultat === 'Rattrapage';
      } else if (filterResult === 'ACTIONS_REQUISES') {
        matchesResult = log.resultat === 'Absent' || log.resultat === 'Echouée' || log.resultat === 'Échouée' || log.resultat === 'Annulée' || (log.consigne || '').trim().toLowerCase() === 'a relancer';
      } else {
        matchesResult = log.resultat === filterResult;
      }

      const matchesType = filterType === 'ALL' || log.type === filterType;
      
      // Handle MAD Ea filter (case non cochée = 1 à réaliser / à comptabiliser dans l'indice)
      const matchesMadEa = !initialFilters?.madEa || (log.resultat === 'En cours' && !log.madEa);

      // Handle Date Period Filter
      let matchesDate = true;
      if (filterStartDate || filterEndDate) {
        const startTs = filterStartDate ? new Date(`${filterStartDate}T00:00:00`).getTime() : 0;
        const endTs = filterEndDate ? new Date(`${filterEndDate}T23:59:59.999`).getTime() : Infinity;

        const debutTime = parseDateToTime(log.dateDebut || log.dateInscription);
        const finTime = parseDateToTime(log.dateFin || log.dateDebut || log.dateInscription);

        const effectiveStart = debutTime || finTime;
        const effectiveEnd = finTime || debutTime;

        if (effectiveStart || effectiveEnd) {
          if (startTs > 0 && effectiveEnd < startTs) matchesDate = false;
          if (endTs !== Infinity && effectiveStart > endTs) matchesDate = false;
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesEscale && matchesService && matchesConsigne && matchesResult && matchesType && matchesMadEa && matchesDate;
    });
  }, [trainingLogs, searchTerm, filterEscale, filterService, filterConsigne, filterResult, filterType, filterStartDate, filterEndDate, initialFilters]);

  // Sort logic
  const sortedLogs = useMemo(() => {
    const sorted = [...filteredLogs];
    sorted.sort((a, b) => {
      if (sortField === 'dateInscription') {
        const dateA = a.dateDebut || a.dateInscription || '';
        const dateB = b.dateDebut || b.dateInscription || '';
        const timeA = parseDateToTime(dateA);
        const timeB = parseDateToTime(dateB);
        if (timeA !== timeB) {
          return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        }
        return 0;
      }

      const valA = String(a[sortField] || '').trim();
      const valB = String(b[sortField] || '').trim();
      
      const comparison = valA.localeCompare(valB, 'fr', { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredLogs, sortField, sortDirection]);

  // Sort toggle handler
  const handleSort = (field: keyof TrainingLog) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };


  // XLSX Export
  const handleExportXLSX = () => {
    const data = sortedLogs.map(log => ({
      'ID': log.id,
      'Collaborateur': log.collaboratorName,
      'Escale': log.escale,
      'Service': log.service,
      'Module': log.moduleName,
      'Formateur': log.formateur,
      'Type': log.type,
      'Cycle': log.cycle,
      'Résultat': log.resultat,
      'Consigne': log.consigne || 'N/A',
      'Date Inscription': formatDateFR(log.dateInscription),
      'Date Validation': log.dateValidation ? formatDateFR(log.dateValidation) : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Suivi Formations');

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

    XLSX.writeFile(workbook, `suivi_formations_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const calculateDuration = (log: TrainingLog) => {
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
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]" id="training-logs-main">
      
      {/* Top filter dashboard - sticky above table */}
      <div className="p-6 border-b border-slate-200 space-y-4 sticky top-[112px] bg-white z-10 shadow-xs rounded-t-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 text-base flex items-center gap-1.5">
              <Layers className="h-4.5 w-4.5 text-blue-600" /> Registre Général des Suivis de Formation
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Visualisez et modifiez toutes les sessions de formation en temps réel. Filtrez par escale, service ou résultat.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {!isReadOnly && (
              <>
                <button
                  onClick={onOpenEnrollment}
                  className="inline-flex items-center gap-1.5 bg-[#0062FF] hover:bg-[#0062FF]/90 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-all shadow-md shadow-[#0062FF]/10 cursor-pointer"
                  id="logs-enroll-btn"
                  title="Nouvelle Inscription"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Nouvelle Inscription
                </button>
                {onDeduplicateLogs && (
                  <button
                    onClick={async () => {
                      setIsCleaning(true);
                      setDedupResult(null);
                      try {
                        const res = await onDeduplicateLogs();
                        if (res && res.count !== undefined) {
                          if (res.count > 0) {
                            setDedupResult(`Nettoyage réussi : ${res.count} enregistrement(s) en double supprimé(s).`);
                          } else {
                            setDedupResult(`Aucun doublon trouvé. Le registre est déjà propre.`);
                          }
                        }
                      } catch (e: any) {
                        setDedupResult(`Erreur lors du nettoyage : ${e?.message || String(e)}`);
                      } finally {
                        setIsCleaning(false);
                      }
                    }}
                    disabled={isCleaning}
                    className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
                    id="deduplicate-logs-btn"
                    title="Détecter et supprimer les saises en double"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {isCleaning ? 'Nettoyage en cours...' : 'Nettoyer les doublons'}
                  </button>
                )}
              </>
            )}
            
            <button
              onClick={handleExportXLSX}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
              id="export-xlsx-btn"
            >
              <Download className="h-3.5 w-3.5" /> Exporter en XLSX
            </button>
          </div>
        </div>

        {dedupResult && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{dedupResult}</span>
            </div>
            <button 
              onClick={() => setDedupResult(null)} 
              className="text-amber-700 hover:text-amber-900 font-bold px-2 py-0.5 rounded-md cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Date Period Filter Bar (sur le même modèle que le filtre période KPI, sans les années préenregistrées) */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs" id="logs-date-filter-bar">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Calendar className="h-4 w-4 text-[#0062FF]" />
              <span>Filtre période :</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">du</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:outline-none focus:border-[#0062FF] shadow-2xs"
                id="logs-start-date-input"
              />
              <span className="text-slate-400 font-medium">au</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:outline-none focus:border-[#0062FF] shadow-2xs"
                id="logs-end-date-input"
              />
            </div>

            {(filterStartDate || filterEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] rounded-lg transition-all cursor-pointer"
                id="logs-clear-date-filter-btn"
                title="Effacer les dates"
              >
                Réinitialiser la période
              </button>
            )}
          </div>

          {(filterStartDate || filterEndDate) && (
            <div className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 flex items-center gap-1">
              <span>{filteredLogs.length} formation(s) dans cette période</span>
            </div>
          )}
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-1" id="filters-panel-grid">
          {/* Search text */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher collab, module, formateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          {/* Escale filter */}
          <div>
            <select
              value={filterEscale}
              onChange={(e) => setFilterEscale(e.target.value)}
              className="w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Escale: Toutes</option>
              {ESCALES.map(esc => (
                <option key={esc} value={esc}>{esc}</option>
              ))}
            </select>
          </div>

          {/* Service filter */}
          <div>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Service: Tous</option>
              {SERVICES.map(srv => (
                <option key={srv} value={srv}>{srv}</option>
              ))}
            </select>
          </div>

          {/* Consigne filter */}
          <div>
            <select
              value={filterConsigne}
              onChange={(e) => setFilterConsigne(e.target.value)}
              className="w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Consigne: Toutes</option>
              {CONSIGNES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Result filter */}
          <div>
            <select
              value={filterResult}
              onChange={(e) => setFilterResult(e.target.value)}
              className="w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="EN_COURS_A_TRAITER">Résultat: En cours / À traiter (Défaut)</option>
              <option value="ALL">Résultat: Tous les résultats</option>
              <option value="EN_COURS_RATTRAPAGE">En cours / Rattrapage</option>
              <option value="ACTIONS_REQUISES">Absent / Échouée / Annulée / A relancer</option>
              {RESULTATS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {initialFilters && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800" id="filter-active-alert">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                Filtrage actif depuis le tableau de bord : <strong>
                  {initialFilters.resultat ? (
                    Array.isArray(initialFilters.resultat) ? (
                      initialFilters.resultat.includes('Absent') 
                        ? 'Actions Requises (Absent / Échouée / Annulée / A relancer)' 
                        : initialFilters.resultat.join(' / ')
                    ) : initialFilters.resultat
                  ) : ''}
                  {initialFilters.consigne ? `Consigne: ${initialFilters.consigne}` : ''}
                  {initialFilters.madEa ? 'Mises à disposition (MAD EA)' : ''}
                </strong>
              </span>
            </div>
            <button
              onClick={() => {
                setFilterStartDate('');
                setFilterEndDate('');
                if (onClearFilters) onClearFilters();
              }}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-[10px] font-bold text-slate-700 cursor-pointer transition-all shrink-0"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Main logs table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
            <tr>
              {/* 1/ Actions */}
              <th className="py-2.5 px-2 w-16 text-center font-bold text-slate-500">
                Actions
              </th>
              {/* 2/ Intérimaire */}
              <th className="py-2.5 px-2 font-bold cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('collaboratorName')}>
                Intérimaire {sortField === 'collaboratorName' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* 3/ Escale/Service */}
              <th className="py-2.5 px-2 font-bold cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('escale')}>
                Escale/Service {sortField === 'escale' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* 4/ Module */}
              <th className="py-2.5 px-2 font-bold cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('moduleName')}>
                Module {sortField === 'moduleName' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* 5/ Formateur */}
              <th className="py-2.5 px-2 font-bold cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('formateur')}>
                Formateur {sortField === 'formateur' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* 6/ Type */}
              <th className="py-2.5 px-2 font-bold cursor-pointer hover:bg-slate-100/50 text-center" onClick={() => handleSort('type')}>
                Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* 7/ Dates (Du / Au) */}
              <th className="py-2.5 px-2 font-bold text-center cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('dateInscription')}>
                Dates {sortField === 'dateInscription' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* 8/ Durée */}
              <th className="py-2.5 px-2 font-bold text-center">
                Durée
              </th>
              {/* 9/ Checkboxes (MAD EA, CTT HBO, CONVOC) */}
              <th className="py-2.5 px-2 font-bold text-center w-40">
                Suivis
              </th>
              {/* 10/ Résultat */}
              <th className="py-2.5 px-2 font-bold text-center cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('resultat')}>
                Résultat {sortField === 'resultat' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {/* 11/ Consigne */}
              <th className="py-2.5 px-2 font-bold text-center cursor-pointer hover:bg-slate-100/50" onClick={() => handleSort('consigne')}>
                Consigne {sortField === 'consigne' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedLogs.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-450 italic bg-slate-50/20">
                  Aucun résultat ne correspond à vos critères de recherche.
                </td>
              </tr>
            ) : (
              sortedLogs.map((log) => {
                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    {/* 1/ Actions */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => !isReadOnly && onEditLog(log)}
                          disabled={isReadOnly}
                          className="text-blue-600 hover:text-blue-800 disabled:text-slate-300 disabled:hover:bg-transparent font-bold p-1 hover:bg-blue-50 rounded-md transition-all inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                          title={isReadOnly ? "Lecture seule" : "Modifier"}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => !isReadOnly && setHistoryLog(log)}
                          disabled={isReadOnly}
                          className="text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:hover:bg-transparent font-bold p-1 hover:bg-slate-100 rounded-md transition-all inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                          title={isReadOnly ? "Lecture seule" : "Historique des modifications"}
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => !isReadOnly && setConfirmDeleteLogId(log.id)}
                          disabled={isReadOnly}
                          className="text-red-600 hover:text-red-700 disabled:text-slate-300 disabled:hover:bg-transparent font-bold p-1 hover:bg-red-50 rounded-md transition-all inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                          title={isReadOnly ? "Lecture seule" : "Supprimer"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                    {/* 2/ Intérimaire */}
                    <td className="py-2 px-2 font-semibold text-slate-900">
                      {(() => {
                        const parts = log.collaboratorName.trim().split(' ');
                        const firstName = parts[0] || '';
                        const lastName = parts.slice(1).join(' ') || '';
                        return (
                          <div className="flex items-center gap-2 max-w-[150px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onViewCollaborator) {
                                  onViewCollaborator(log.collaboratorId);
                                }
                              }}
                              className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 hover:bg-slate-100 rounded-lg shrink-0 cursor-pointer"
                              title="Ouvrir le dossier individuel"
                              id={`view-collab-btn-${log.id}`}
                            >
                              <Users className="h-4 w-4" />
                            </button>
                            <div className="flex flex-col text-left leading-tight min-w-0">
                              <span className="text-slate-900 font-bold text-xs truncate" title={firstName}>
                                {firstName}
                              </span>
                              <span className="text-slate-500 font-semibold text-[10px] uppercase truncate" title={lastName}>
                                {lastName}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* 3/ Escale/Service */}
                    <td className="py-2 px-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
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

                    {/* 4/ Module */}
                    <td className="py-2 px-2 max-w-[180px]">
                      <div className="flex flex-col text-left leading-tight">
                        <span className="font-semibold text-slate-800 text-xs truncate" title={log.moduleName}>
                          {log.moduleName}
                        </span>
                        {(() => {
                          let sessionNum = log.numSession;
                          if (!sessionNum && log.dateDebut) {
                            const d = new Date(log.dateDebut);
                            if (!isNaN(d.getTime())) {
                              const yyyy = d.getFullYear();
                              const mm = String(d.getMonth() + 1).padStart(2, '0');
                              sessionNum = `HBO${yyyy}${mm}01`;
                            }
                          }
                          if (!sessionNum) {
                            sessionNum = `HBO-${log.id.toUpperCase()}`;
                          }
                          return (
                            <span className="text-[10px] font-mono font-bold text-[#0062FF] truncate mt-0.5" title={`Session ${sessionNum}`}>
                              N° {sessionNum}
                            </span>
                          );
                        })()}
                      </div>
                    </td>

                    {/* 5/ Formateur */}
                    <td className="py-2 px-2 text-slate-600 whitespace-nowrap text-left font-semibold text-xs">
                      {log.formateur}
                    </td>

                    {/* 6/ Type */}
                    <td className="py-2 px-2 whitespace-nowrap text-slate-500 text-center text-[10px]">
                      <span className="font-medium text-slate-600">{log.type}</span>
                    </td>

                    {/* 7/ Dates (Du / Au) */}
                    <td className="py-2 px-2 text-center text-slate-500 whitespace-nowrap font-mono text-[10px]">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[9px]">du</span>
                          <span className="font-semibold text-slate-700 bg-slate-50 px-1 py-0.5 rounded border border-slate-200/30">
                            {formatDateFR(log.dateDebut || log.dateInscription)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[9px]">au</span>
                          <span className="font-semibold text-slate-700 bg-slate-50 px-1 py-0.5 rounded border border-slate-200/30">
                            {formatDateFR(log.dateFin || log.dateValidation || log.dateInscription)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 8/ Durée (Horaires 1 & 2 + Total) */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-slate-500 font-mono font-medium">
                          {log.heureDebut1 && log.heureFin1 ? (
                            <span><span className="text-slate-400 font-sans text-[8px] mr-0.5">1:</span>{log.heureDebut1} - {log.heureFin1}</span>
                          ) : (
                            <span><span className="text-slate-400 font-sans text-[8px] mr-0.5">1:</span>08:00 - 16:00</span>
                          )}
                        </span>
                        {log.heureDebut2 && log.heureFin2 && (
                          <span className="text-[9px] text-slate-500 font-mono font-medium">
                            <span className="text-slate-400 font-sans text-[8px] mr-0.5">2:</span>{log.heureDebut2} - {log.heureFin2}
                          </span>
                        )}
                        <span className="font-bold text-slate-700 bg-slate-100 rounded-md px-1.5 py-0.5 border border-slate-200/50 text-[10px] mt-0.5">
                          {calculateDuration(log)} h
                        </span>
                      </div>
                    </td>

                    {/* 9/ Checkboxes (Clickable directly inside row) */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <div className="flex items-center gap-1 justify-center">
                        {/* MAD EA */}
                        <button
                          onClick={() => !isReadOnly && onUpdateTrainingStatus(log.id, { madEa: !log.madEa })}
                          disabled={isReadOnly}
                          className={`h-5 px-1.5 border rounded-md flex items-center justify-center gap-0.5 text-[9px] font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                            log.madEa 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                          title="Toggl MAD EA"
                        >
                          {log.madEa && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          MAD
                        </button>

                        {/* CTT HBO */}
                        <button
                          onClick={() => !isReadOnly && onUpdateTrainingStatus(log.id, { cttHbo: !log.cttHbo })}
                          disabled={isReadOnly}
                          className={`h-5 px-1.5 border rounded-md flex items-center justify-center gap-0.5 text-[9px] font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                            log.cttHbo 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                          title="Toggl CTT HBO"
                        >
                          {log.cttHbo && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          CTT
                        </button>

                        {/* CONVOC */}
                        <button
                          onClick={() => !isReadOnly && onUpdateTrainingStatus(log.id, { convoc: !log.convoc })}
                          disabled={isReadOnly}
                          className={`h-5 px-1 border rounded-md flex items-center justify-center gap-0.5 text-[9px] font-bold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                            log.convoc 
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                          title="Toggle CONVOC"
                        >
                          {log.convoc && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          CONV
                        </button>
                      </div>
                    </td>

                    {/* 10/ Résultat */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <select
                        value={log.resultat}
                        disabled={isReadOnly}
                        onChange={(e) => onUpdateTrainingStatus(log.id, { resultat: e.target.value })}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-xs border disabled:cursor-not-allowed disabled:opacity-75 ${
                          log.resultat === 'Réussite' ? 'bg-[#57AEA6] text-white border-[#57AEA6]' :
                          log.resultat === 'En cours' ? 'bg-[#0062FF] text-white border-[#0062FF]' :
                          log.resultat === 'Rattrapage' ? 'bg-amber-500 text-white border-amber-500' :
                          log.resultat === 'Absent' ? 'bg-rose-600 text-white border-rose-600' :
                          log.resultat === 'Echouée' ? 'bg-rose-600 text-white border-rose-600' :
                          log.resultat === 'Annulée' ? 'bg-slate-400 text-white border-slate-400' :
                          log.resultat === 'A traiter' ? 'bg-yellow-400 text-slate-900 border-yellow-400' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {RESULTATS.map(r => (
                          <option key={r} value={r} className="bg-white text-slate-800 normal-case font-normal">{r}</option>
                        ))}
                      </select>
                    </td>

                    {/* 11/ Consigne */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <select
                        value={log.consigne || 'N/A'}
                        disabled={isReadOnly}
                        onChange={(e) => onUpdateTrainingStatus(log.id, { consigne: e.target.value })}
                        className={`px-2.5 py-1 rounded text-[10px] whitespace-nowrap font-bold uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-xs border disabled:cursor-not-allowed disabled:opacity-75 ${
                          (log.consigne === 'N/A' || log.consigne === 'Ne pas payer' || !log.consigne) ? 'bg-slate-150 text-slate-700 border-slate-300' :
                          log.consigne === 'A payer' ? 'bg-purple-600 text-white border-purple-700' :
                          log.consigne === 'Paye OK' ? 'bg-emerald-600 text-white border-emerald-700' :
                          log.consigne === 'Facturation client' ? 'bg-orange-500 text-white border-orange-600' :
                          log.consigne === 'A relancer' ? 'bg-rose-600 text-white border-rose-700 animate-pulse font-extrabold' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {CONSIGNES.map(c => (
                          <option key={c} value={c} className="bg-white text-slate-800 normal-case font-normal">{c}</option>
                        ))}
                      </select>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmation de suppression */}
      {confirmDeleteLogId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-150 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-full shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirmer la suppression</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Êtes-vous sûr de vouloir supprimer cette formation ? Cette action supprimera définitivement cette ligne.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setConfirmDeleteLogId(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Non
              </button>
              <button
                onClick={() => {
                  onDeleteTrainingLog(confirmDeleteLogId);
                  setConfirmDeleteLogId(null);
                }}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Oui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique des Modifications */}
      {historyLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-150 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Historique des modifications</h3>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    {historyLog.collaboratorName} &bull; <span className="text-blue-600 font-bold">{historyLog.moduleName}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setHistoryLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2">
              {(() => {
                const formatAuthorDisplayName = (author?: string): string => {
                  if (!author) return 'Administrateur';
                  let clean = author.replace(/\s*\([^)]*\)/g, '').trim();
                  if (clean.includes('@')) {
                    clean = clean.split('@')[0].replace(/[._]/g, ' ');
                    clean = clean.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                  }
                  if (/^[A-Z0-9_-]{3,12}$/i.test(clean) && !clean.includes(' ')) {
                    if (clean.toUpperCase() === 'MOE0226') return 'Martin ONILLON MINÉE';
                    return 'Administrateur';
                  }
                  return clean || 'Administrateur';
                };

                const entries = historyLog.history && historyLog.history.length > 0 
                  ? historyLog.history 
                  : [
                      {
                        action: "Création de la formation",
                        date: formatDateFR(historyLog.dateInscription),
                        heure: "00:00:00",
                        author: "Administrateur"
                      }
                    ];
                return entries.map((entry, index) => (
                  <div key={index} className="flex gap-2 text-xs text-slate-650 leading-relaxed border-l-2 border-blue-500 bg-slate-50/50 hover:bg-slate-50 p-2.5 rounded-r-lg transition-colors">
                    <div>
                      <span className="font-extrabold text-slate-800">[{entry.action}]</span>
                      {" "}— fait le <span className="font-semibold text-slate-700">{entry.date}</span> à <span className="font-semibold text-slate-700">{entry.heure}</span> par <span className="font-bold text-blue-600">{formatAuthorDisplayName(entry.author)}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-3 flex justify-end">
              <button
                onClick={() => setHistoryLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
