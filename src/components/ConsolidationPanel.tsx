import React, { useState, useRef } from 'react';
import { 
  Layers, 
  UploadCloud, 
  AlertCircle,
  AlertTriangle,
  Users,
  CalendarDays,
  FileText,
  Database,
  PlusCircle,
  RefreshCw,
  Download,
  CheckCircle2,
  ShieldCheck,
  FileSpreadsheet,
  Trash2,
  Table,
  FileCheck,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TrainingModule, Collaborator, TrainingLog } from '../types';
import { normalizeDateToISO } from '../utils/dateUtils';

interface ConsolidationPanelProps {
  onImportCSV: (
    csvText: string, 
    type: 'modules' | 'agents' | 'history', 
    mode: 'append' | 'replace'
  ) => { success: boolean; message: string; count?: number };
  modulesCatalog?: TrainingModule[];
  collaborators?: Collaborator[];
  trainingLogs?: TrainingLog[];
}

type ImportType = 'modules' | 'agents' | 'history';
type ImportMode = 'append' | 'replace';

interface UploadedFileInfo {
  name: string;
  size: number;
  isExcel: boolean;
}

export default function ConsolidationPanel({ 
  onImportCSV,
  modulesCatalog = [],
  collaborators = [],
  trainingLogs = []
}: ConsolidationPanelProps) {
  const [importType, setImportType] = useState<ImportType>('modules');
  const [importMode, setImportMode] = useState<ImportMode>('append');
  const [csvInput, setCsvInput] = useState('');
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [isConfirmReplaceOpen, setIsConfirmReplaceOpen] = useState(false);
  const [hasDownloadedBackup, setHasDownloadedBackup] = useState(false);

  // Excel & File Upload States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(1); // 0-based: 1 = Row 2 (Ligne 2 du fichier type)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [detectedRowCount, setDetectedRowCount] = useState<number>(0);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper to format/clean cell value for CSV
  const cleanCell = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
      const yyyy = val.getUTCFullYear();
      const mm = String(val.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(val.getUTCDate()).padStart(2, '0');
      let str = `${yyyy}-${mm}-${dd}`;
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }
    
    let str = String(val).trim();
    if (str) {
      const iso = normalizeDateToISO(str);
      if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        str = iso;
      }
    }

    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Core parser function: reads a sheet from workbook and outputs CSV text
  const parseSheetToCsv = (wb: XLSX.WorkBook, sheetName: string, hRowIndex: number) => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) {
      setCsvInput('');
      setDetectedRowCount(0);
      return;
    }

    // Convert sheet to json 2D array with raw values and date parsing
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });

    if (rawRows.length <= hRowIndex) {
      setCsvInput('');
      setDetectedRowCount(0);
      return;
    }

    // Extract header row
    const headerRow = rawRows[hRowIndex] || [];
    const csvLines: string[] = [];

    // Format Header line
    const headerStr = headerRow.map(c => cleanCell(c)).join(',');
    csvLines.push(headerStr);

    let dataCount = 0;
    // Format Data lines starting after header row
    for (let i = hRowIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.every(cell => cell === '' || cell === undefined || cell === null)) {
        continue; // Skip empty rows
      }
      const rowStr = row.map(c => cleanCell(c)).join(',');
      csvLines.push(rowStr);
      dataCount++;
    }

    const generatedCsv = csvLines.join('\n');
    setCsvInput(generatedCsv);
    setDetectedRowCount(dataCount);
  };

  // Handle file drop or selection
  const processSelectedFile = async (file: File) => {
    setImportResult(null);
    const fileName = file.name;
    const lowerName = fileName.toLowerCase();
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');

    if (isExcel) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

        setUploadedFile({ name: fileName, size: file.size, isExcel: true });
        setWorkbook(wb);
        setAvailableSheets(wb.SheetNames);

        // Auto-detect current year sheet (e.g., 2026, 2025)
        const currentYearStr = new Date().getFullYear().toString();
        const prevYearStr = (new Date().getFullYear() - 1).toString();

        let targetSheet = wb.SheetNames.find(s => s.trim() === currentYearStr);
        if (!targetSheet) {
          targetSheet = wb.SheetNames.find(s => s.trim() === prevYearStr);
        }
        if (!targetSheet) {
          targetSheet = wb.SheetNames[0];
        }

        setSelectedSheet(targetSheet);

        // Determine default header row (Row 2 = index 1 by default as per specification)
        let defaultHRow = 1; // Row 2 (Ligne 2 du fichier type)
        const sheet = wb.Sheets[targetSheet];
        if (sheet) {
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          // If Row 2 (index 1) is completely empty, fallback to Row 1 (index 0)
          if (!rawRows[1] || rawRows[1].every(c => c === '' || c === undefined)) {
            if (rawRows[0] && rawRows[0].some(c => c !== '' && c !== undefined)) {
              defaultHRow = 0;
            }
          }
        }

        setHeaderRowIndex(defaultHRow);
        parseSheetToCsv(wb, targetSheet, defaultHRow);
      } catch (err: any) {
        setImportResult({ success: false, message: `Erreur d'analyse du fichier Excel : ${err.message}` });
      }
    } else {
      // CSV or Text file
      try {
        const text = await file.text();
        setUploadedFile({ name: fileName, size: file.size, isExcel: false });
        setWorkbook(null);
        setAvailableSheets([]);
        setSelectedSheet('');
        setCsvInput(text);
        const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
        setDetectedRowCount(Math.max(0, lines.length - 1));
      } catch (err: any) {
        setImportResult({ success: false, message: `Erreur de lecture du fichier : ${err.message}` });
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSheetSelect = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      parseSheetToCsv(workbook, sheetName, headerRowIndex);
    }
  };

  const handleHeaderRowSelect = (hIdx: number) => {
    setHeaderRowIndex(hIdx);
    if (workbook && selectedSheet) {
      parseSheetToCsv(workbook, selectedSheet, hIdx);
    }
  };

  const handleResetFile = () => {
    setUploadedFile(null);
    setWorkbook(null);
    setAvailableSheets([]);
    setSelectedSheet('');
    setCsvInput('');
    setDetectedRowCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger import check
  const handleImportClick = () => {
    if (!csvInput.trim()) {
      setImportResult({ success: false, message: 'Le champ de saisie est vide.' });
      return;
    }

    if (importMode === 'replace') {
      setHasDownloadedBackup(false);
      setIsConfirmReplaceOpen(true);
    } else {
      executeImport('append');
    }
  };

  const executeImport = (modeToUse: ImportMode) => {
    const result = onImportCSV(csvInput, importType, modeToUse);
    setImportResult(result);
    if (result.success) {
      setCsvInput('');
      setUploadedFile(null);
      setWorkbook(null);
      setDetectedRowCount(0);
    }
    setIsConfirmReplaceOpen(false);
  };

  // Helper function to export 100% of current dataset to CSV backup
  const handleDownloadBackup = () => {
    let csvContent = '';
    let fileName = '';

    const escapeCell = (val: any) => {
      if (val === undefined || val === null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    if (importType === 'modules') {
      const headers = ['MODULE', 'CATEGORIE', 'FORMATEUR', 'TYPE', 'CODE', 'CYCLE', 'ESCALE', 'SERVICE', 'VISA', 'RESULTAT', 'CONSIGNE'];
      const rows = (modulesCatalog || []).map(m => [
        m.name || '',
        m.category || '',
        m.formateur || '',
        m.type || '',
        m.code || '',
        m.cycle || '',
        m.escale || '',
        m.service || '',
        m.visa || '',
        m.resultat || '',
        m.consigne || ''
      ].map(escapeCell).join(','));

      csvContent = [headers.join(','), ...rows].join('\n');
      fileName = `sauvegarde_catalogue_modules_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (importType === 'agents') {
      const headers = ['MATRICULE', 'NOM', 'PRENOM', 'ESCALE', 'SERVICE', 'TELEPHONE', 'MAIL'];
      const rows = (collaborators || []).map(c => [
        c.matricule || '',
        c.lastName || '',
        c.firstName || '',
        c.escale || '',
        c.service || '',
        c.phone || '',
        c.email || ''
      ].map(escapeCell).join(','));

      csvContent = [headers.join(','), ...rows].join('\n');
      fileName = `sauvegarde_base_agents_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (importType === 'history') {
      const headers = [
        'NOM', 'PRENOM', 'MODULE', 'FORMATEUR', 'TYPE', 'CYCLE', 'ESCALE', 'SERVICE', 
        'VISA', 'RESULTAT', 'CONSIGNE', 'DATE_DEBUT', 'DATE_FIN', 'DATE_INSCRIPTION', 
        'DATE_VALIDATION', 'NOTES', 'ID_FORMATEUR', 'LIEU', 'MAD_EA', 'CTT_HBO', 'CONVOC', 
        'HEURE_DEBUT_1', 'HEURE_FIN_1', 'HEURE_DEBUT_2', 'HEURE_FIN_2'
      ];
      const rows = (trainingLogs || []).map(log => {
        const collab = (collaborators || []).find(c => c.id === log.collaboratorId);
        let nom = collab?.lastName || '';
        let prenom = collab?.firstName || '';
        if (!nom && !prenom) {
          const parts = (log.collaboratorName || '').split(' ');
          if (parts.length > 1) {
            prenom = parts[0];
            nom = parts.slice(1).join(' ');
          } else {
            nom = log.collaboratorName || '';
          }
        }

        return [
          nom,
          prenom,
          log.moduleName || '',
          log.formateur || '',
          log.type || '',
          log.cycle || '',
          log.escale || '',
          log.service || '',
          log.visa || '',
          log.resultat || '',
          log.consigne || '',
          log.dateDebut || '',
          log.dateFin || '',
          log.dateInscription || '',
          log.dateValidation || '',
          log.notes || log.cleanNotes || '',
          log.idFormateur || '',
          log.lieu || '',
          log.madEa ? 'oui' : 'non',
          log.cttHbo ? 'oui' : 'non',
          log.convoc ? 'oui' : 'non',
          log.heureDebut1 || '',
          log.heureFin1 || '',
          log.heureDebut2 || '',
          log.heureFin2 || ''
        ].map(escapeCell).join(',');
      });

      csvContent = [headers.join(','), ...rows].join('\n');
      fileName = `sauvegarde_historique_suivi_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setHasDownloadedBackup(true);
  };

  // Placeholders and guides depending on selected import type
  const getImportDetails = () => {
    switch (importType) {
      case 'agents':
        return {
          title: "Base de données complète des agents",
          desc: "Importez la liste complète de vos agents Hubjob depuis votre fichier Excel (.xlsx / .xls) ou CSV.",
          headers: "MATRICULE,NOM,PRENOM,ESCALE,SERVICE,TELEPHONE,MAIL",
          placeholder: `MATRICULE,NOM,PRENOM,ESCALE,SERVICE,TELEPHONE,MAIL
10482,DUPONT,Thomas,BOD,PISTE,0612345678,t.dupont@hubjob.fr
10483,MARTIN,Sarah,TLS,PASSAGE,0798765432,s.martin@hubjob.fr
10484,BERNARD,Julien,LYS,TRAFIC,0601020304,j.bernard@hubjob.fr`,
        };
      case 'history':
        return {
          title: "Registre Historique & Suivi de Formation",
          desc: "Déposez votre fichier Excel pour distribuer automatiquement les données dans le Suivi Général, la Paye, la Facturation et le Dossier individuel intérimaire.",
          headers: "NOM, PRENOM, ESCALE, SERVICE, MODULE, CYCLE, FORMATEUR, ID, TYPE, DATE D, DATE F, D1, F1, D2, F2, MAD EA, CTT HBO, CONVOC, EMRG, ATTEST, RESULTAT, CONSIGNE, DATE PAYE, COMMENTAIRE, N° FACT, MONTANT, VAL° GED, VISA",
          placeholder: `NOM,PRENOM,ESCALE,SERVICE,MODULE,CYCLE,FORMATEUR,ID,TYPE,DATE D,DATE F,D1,F1,D2,F2,MAD EA,CTT HBO,CONVOC,EMRG,ATTEST,RESULTAT,CONSIGNE,DATE PAYE,COMMENTAIRE,N° FACT,MONTANT,VAL° GED,VISA
DUPONT,Thomas,BOD,PISTE,REGLEMENTAIRE - SST - INITIAL,INI,Hubjob - Interne,ID-4235,Présentiel,2026-05-10,2026-05-12,08:00,12:00,13:00,16:00,True,False,True,True,True,Réussite,Paye OK,2026-05-15,Heures validées,FAC-2026-001,450,2026-05-14,Validée
MARTIN,Sarah,TLS,PASSAGE,QSE - GESTION DES CONFLITS,PER,EA,ID-9284,Présentiel,2026-07-12,2026-07-14,09:00,12:00,13:00,17:00,False,True,False,True,True,En cours,A payer,,,FAC-2026-002,380,,En attente`,
        };
      case 'modules':
      default:
        return {
          title: "Catalogue de Formation",
          desc: "Importez ou mettez à jour la liste des formations (SST, Altea, Marchandises Dangereuses, CACES, etc.) via fichier Excel ou CSV.",
          headers: "MODULE,CATEGORIE,FORMATEUR,TYPE,CODE",
          placeholder: `MODULE,CATEGORIE,FORMATEUR,TYPE,CODE
REGLEMENTAIRE - SST - INITIAL,Réglementaire,Hubjob - Interne,Présentiel,SST-INI
QSE - GESTION DES CONFLITS,QSE,EA,Présentiel,QSE-CONF
DIVERS - GESTION DU STRESS,Divers,CAMAS,Présentiel,DIV-STR`,
        };
    }
  };

  const details = getImportDetails();

  return (
    <div className="space-y-6 animate-fade-in" id="consolidation-panel-container">
      
      {/* Selection Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap gap-2 items-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mr-2">Sélectionnez le type d'import :</span>
        <button
          onClick={() => { setImportType('modules'); setImportResult(null); }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            importType === 'modules'
              ? 'bg-[#0062FF] text-white shadow-xs shadow-blue-600/10'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          id="import-type-modules-btn"
        >
          <Layers className="h-3.5 w-3.5" /> Catalogue Formations
        </button>
        <button
          onClick={() => { setImportType('agents'); setImportResult(null); }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            importType === 'agents'
              ? 'bg-[#0062FF] text-white shadow-xs shadow-blue-600/10'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          id="import-type-agents-btn"
        >
          <Users className="h-3.5 w-3.5" /> Base Agents (Matricules, etc.)
        </button>
        <button
          onClick={() => { setImportType('history'); setImportResult(null); }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            importType === 'history'
              ? 'bg-[#0062FF] text-white shadow-xs shadow-blue-600/10'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          id="import-type-history-btn"
        >
          <CalendarDays className="h-3.5 w-3.5" /> Suivi Historique (2025/2026)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Excel / CSV Dropzone & Processing */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#0062FF] font-bold">
              <UploadCloud className="h-5 w-5" />
              <h4 className="text-sm font-bold text-slate-900">Importer: {details.title}</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {details.desc}
            </p>

            <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
              <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Colonnes clés attendues :</span>
              <code className="text-[10px] text-blue-700 font-mono select-all bg-white px-2 py-1 rounded border border-slate-200/60 block truncate">
                {details.headers}
              </code>
            </div>

            {/* Hidden native file input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileInputChange} 
              accept=".xlsx,.xls,.csv,.txt" 
              className="hidden" 
              id="excel-file-hidden-input"
            />

            {/* Drag and Drop Zone or Loaded File Card */}
            {!uploadedFile ? (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging 
                    ? 'border-[#0062FF] bg-blue-50/80 scale-[1.01]' 
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 hover:border-blue-400'
                }`}
                id="excel-drag-drop-zone"
              >
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl shadow-xs">
                  <FileSpreadsheet className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800">
                    Déposez votre fichier Excel <span className="text-emerald-600 font-mono">(.xlsx, .xls)</span> ou <span className="text-blue-600 font-mono">.csv</span> ici
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Analyse directe sans conversion préalable • Support multifeuilles
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-white border border-slate-200 text-[#0062FF] hover:bg-blue-50 text-xs font-bold rounded-xl shadow-2xs transition-all pointer-events-none"
                >
                  Parcourir les fichiers
                </button>
              </div>
            ) : (
              /* Active File Info & Sheet Selector Banner */
              <div className="bg-emerald-50/60 border border-emerald-200/90 rounded-2xl p-4 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 shadow-xs">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 truncate">{uploadedFile.name}</span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                          {formatFileSize(uploadedFile.size)}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 mt-0.5">
                        <FileCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Fichier prêt • <strong className="text-emerald-950">{detectedRowCount}</strong> lignes de données détectées</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetFile}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Changer de fichier"
                    id="reset-uploaded-file-btn"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Excel Specific Config Controls (Sheet & Header row) */}
                {uploadedFile.isExcel && availableSheets.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    
                    {/* Sheet Selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider flex items-center justify-between">
                        <span>Feuille ciblée :</span>
                        {selectedSheet.includes('2026') && (
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded border border-blue-200">Année 2026</span>
                        )}
                      </label>
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetSelect(e.target.value)}
                        className="w-full bg-white border border-emerald-300 text-slate-900 font-bold text-xs rounded-xl p-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        id="excel-sheet-selector"
                      >
                        {availableSheets.map((s) => (
                          <option key={s} value={s}>
                            Feuille : {s} {s.trim() === new Date().getFullYear().toString() ? ' (Année en cours)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Header Row Index Selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider block">
                        Ligne d'en-tête :
                      </label>
                      <select
                        value={headerRowIndex}
                        onChange={(e) => handleHeaderRowSelect(Number(e.target.value))}
                        className="w-full bg-white border border-emerald-300 text-slate-900 font-bold text-xs rounded-xl p-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        id="excel-header-row-selector"
                      >
                        <option value={1}>Ligne 2 (Fichier type - Recommandé)</option>
                        <option value={0}>Ligne 1 (En-tête standard)</option>
                        <option value={2}>Ligne 3</option>
                      </select>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* Mode selection radio buttons */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
              <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block">
                Mode d'importation :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label 
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    importMode === 'append'
                      ? 'bg-blue-50/80 border-[#0062FF] text-blue-950 font-semibold ring-1 ring-blue-500/30'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                  }`}
                  id="radio-mode-append-label"
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="mt-0.5 text-[#0062FF] focus:ring-[#0062FF]"
                    id="radio-mode-append"
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1">
                      <PlusCircle className="h-3.5 w-3.5 text-[#0062FF]" />
                      Ajouter des données
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Fusionne les nouvelles données sans rien supprimer.
                    </div>
                  </div>
                </label>

                <label 
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    importMode === 'replace'
                      ? 'bg-amber-50/80 border-amber-500 text-amber-950 font-semibold ring-1 ring-amber-500/30'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                  }`}
                  id="radio-mode-replace-label"
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    id="radio-mode-replace"
                  />
                  <div>
                    <div className="font-bold text-amber-900 flex items-center gap-1">
                      <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                      Remplacer les données
                    </div>
                    <div className="text-[10px] text-amber-700 font-normal mt-0.5">
                      Réinitialise la base puis remplace par le fichier importé.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Content Preview & Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                  <Table className="h-3.5 w-3.5 text-[#0062FF]" />
                  Aperçu des données extraites (CSV) :
                </span>
                {detectedRowCount > 0 && (
                  <span className="text-[10px] font-mono font-bold text-[#0062FF] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {detectedRowCount} lignes chargées
                  </span>
                )}
              </div>
              <textarea
                value={csvInput}
                onChange={(e) => {
                  setCsvInput(e.target.value);
                  const lines = e.target.value.trim().split('\n').filter(l => l.trim().length > 0);
                  setDetectedRowCount(Math.max(0, lines.length - 1));
                }}
                placeholder={details.placeholder}
                className="w-full h-[160px] p-3 border border-slate-200 rounded-xl text-[11px] font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                id="csv-import-textarea"
              />
            </div>

            {importResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                importResult.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{importResult.success ? 'Importation réussie !' : 'Erreur d\'importation'}</p>
                  <p className="text-[11px] mt-0.5">{importResult.message}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <span className="text-[10px] text-slate-400 italic">Format de transmission : CSV encodé UTF-8</span>
            <button
              onClick={handleImportClick}
              className="w-full sm:w-auto bg-[#0062FF] hover:bg-[#0052D4] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
              id="csv-import-submit-btn"
            >
              <span>Exécuter l'importation</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Explaining XLSX/XLS direct import & mode of operation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-[#0062FF] font-bold mb-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">Guide d'import direct Excel (.xlsx / .xls)</h4>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              L’application analyse vos fichiers Excel de suivi de formation en temps réel sans nécessiter de conversion CSV manuelle préalable :
            </p>

            <div className="space-y-3 text-xs">
              
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-1">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  1. Analyse directe du format XLSX / XLS
                </div>
                <p className="text-emerald-900/80 text-[11px] leading-relaxed">
                  Déposez directement votre fichier Excel source. L'analyse est effectuée instantanément en mémoire locale sécurisée.
                </p>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-1">
                <div className="font-bold text-blue-950 flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-[#0062FF]" />
                  2. Ciblage automatique de la feuille (ex: 2026)
                </div>
                <p className="text-blue-900/80 text-[11px] leading-relaxed">
                  Le système repère automatiquement la feuille correspondant à l'année en cours (ex: <strong>2026</strong>). Vous pouvez à tout moment basculer sur une autre feuille depuis le menu déroulant.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Table className="h-4 w-4 text-indigo-600" />
                  3. Détection de l'en-tête (Ligne 2 du fichier type)
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  La ligne d'en-tête est ciblée sur la <strong>ligne 2</strong> du fichier type par défaut. Vous pouvez ajuster ce réglage si vos colonnes débutent sur la ligne 1 ou 3.
                </p>
              </div>

              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 space-y-1">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                  4. Fusion (Ajouter) ou Réinitialisation (Remplacer)
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Choisissez entre la fusion douce des nouvelles données et le remplacement complet du registre avec possibilité de télécharger une sauvegarde CSV intégrale préalable.
                </p>
              </div>

            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 italic">
              Module d'intégration Excel & CSV Hubjob v2.4
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Moteur XLSX Actif
            </span>
          </div>
        </div>

      </div>

      {/* Confirmation Modal when Remplacer is selected */}
      {isConfirmReplaceOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Confirmation de remplacement</h3>
                <p className="text-xs text-amber-700 font-semibold">Avertissement de réinitialisation</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-950 leading-relaxed font-medium">
              Attention, cette action va effacer l'ensemble des données précédentes. Souhaitez-vous continuer ?
            </div>

            {/* Backup Download Recommendation Box */}
            <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-5 w-5 text-[#0062FF] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-blue-950">Sauvegarde de sécurité (100% des données)</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Avant d'effacer la base actuelle, téléchargez une copie intégrale au format CSV pour pouvoir la restaurer à tout moment en cas d'erreur.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadBackup}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  hasDownloadedBackup
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-500'
                    : 'bg-white text-[#0062FF] border border-[#0062FF]/40 hover:bg-blue-100/50'
                }`}
                id="download-backup-modal-btn"
              >
                {hasDownloadedBackup ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Sauvegarde CSV téléchargée (100% des données)
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-[#0062FF]" />
                    Télécharger le CSV actuel comme sauvegarde
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsConfirmReplaceOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                id="cancel-replace-btn"
              >
                Annuler
              </button>
              <button
                onClick={() => executeImport('replace')}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-all shadow-xs cursor-pointer"
                id="confirm-replace-btn"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
