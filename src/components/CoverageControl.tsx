import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  Upload, 
  FileSpreadsheet, 
  Play, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  X, 
  MapPin, 
  Plane, 
  RotateCcw,
  Sparkles,
  FileCheck,
  Search,
  Download,
  AlertCircle
} from 'lucide-react';
import { Anomaly } from '../services/coverageControlService';

interface ZoneState {
  contractsFile: File | null;
  planningFile: File | null;
  isVerifying: boolean;
  alert: { type: 'info' | 'warning' | 'success' | 'error'; title: string; message: string } | null;
  warningsList: string[];
  xlsxBase64: string | null;
  results: Anomaly[];
  hasRun: boolean;
}

const DEFAULT_INFO_MESSAGE = `Fichiers contrats : depuis HBO v2 > Extractions > Contrats > date de début/fin > Exporter les contrats (CSV)
Fichiers planning : depuis Planete > Planning > date de début/fin > sélectionner tout le monde > lancer la sélection > menu > impression > planning > tache par client (tous - planning réel - regrouper par salle - trier par nom - excel - cocher toutes les cases)`;

export default function CoverageControl() {
  // Independent states for Province and Orly
  const [provinceState, setProvinceState] = useState<ZoneState>({
    contractsFile: null,
    planningFile: null,
    isVerifying: false,
    alert: {
      type: 'info',
      title: 'Information PROVINCE',
      message: DEFAULT_INFO_MESSAGE
    },
    warningsList: [],
    xlsxBase64: null,
    results: [],
    hasRun: false
  });

  const [orlyState, setOrlyState] = useState<ZoneState>({
    contractsFile: null,
    planningFile: null,
    isVerifying: false,
    alert: {
      type: 'info',
      title: 'Information ORLY',
      message: DEFAULT_INFO_MESSAGE
    },
    warningsList: [],
    xlsxBase64: null,
    results: [],
    hasRun: false
  });

  // Helper to handle file selection
  const handleFileChange = (
    zone: 'province' | 'orly', 
    fileType: 'contractsFile' | 'planningFile', 
    file: File | null
  ) => {
    const setState = zone === 'province' ? setProvinceState : setOrlyState;
    setState(prev => {
      const updated = { ...prev, [fileType]: file };
      let alertMessage = prev.alert;
      
      if (updated.contractsFile && updated.planningFile) {
        alertMessage = {
          type: 'info',
          title: `Prêt à vérifier (${zone.toUpperCase()})`,
          message: 'Les 2 fichiers sont chargés. Vous pouvez cliquer sur "Lancer la vérification".'
        };
      } else if (updated.contractsFile || updated.planningFile) {
        alertMessage = {
          type: 'warning',
          title: 'Fichier manquant',
          message: `Veuillez importer le fichier ${!updated.contractsFile ? 'Contrats' : 'Planning'} pour compléter le dossier.`
        };
      } else {
        alertMessage = {
          type: 'info',
          title: `Information ${zone.toUpperCase()}`,
          message: DEFAULT_INFO_MESSAGE
        };
      }

      return {
        ...updated,
        alert: alertMessage,
        results: [],
        warningsList: [],
        xlsxBase64: null,
        hasRun: false
      };
    });
  };

  // Helper to trigger verification purely on client-side (100% Vercel & static host compatible)
  const handleVerify = async (zone: 'province' | 'orly') => {
    const state = zone === 'province' ? provinceState : orlyState;
    const setState = zone === 'province' ? setProvinceState : setOrlyState;

    if (!state.contractsFile || !state.planningFile) return;

    setState(prev => ({
      ...prev,
      isVerifying: true,
      alert: {
        type: 'info',
        title: `Analyse en cours (${zone.toUpperCase()})`,
        message: `Analyse et vérification de la couverture en cours pour la zone ${zone.toUpperCase()}...`
      }
    }));

    try {
      const contractsArrayBuf = await state.contractsFile.arrayBuffer();
      const planningArrayBuf = await state.planningFile.arrayBuffer();
      
      const { controleCouvertureOrly, controleCouvertureProvince } = await import('../services/coverageControlService');
      const func = zone === 'province' ? controleCouvertureProvince : controleCouvertureOrly;
      const clientResult = func(new Uint8Array(contractsArrayBuf), new Uint8Array(planningArrayBuf));

      const hasAnomalies = clientResult.anomalies && clientResult.anomalies.length > 0;

      setState(prev => ({
        ...prev,
        isVerifying: false,
        warningsList: clientResult.warnings || [],
        xlsxBase64: clientResult.xlsxBase64 || null,
        results: clientResult.anomalies || [],
        hasRun: true,
        alert: {
          type: hasAnomalies ? 'warning' : 'success',
          title: hasAnomalies 
            ? `Contrôle terminé avec des anomalies (${zone.toUpperCase()})`
            : `Toutes les vacations sont couvertes (${zone.toUpperCase()})`,
          message: hasAnomalies
            ? `${clientResult.anomalies.length} vacation(s) non couverte(s) détectée(s). Vous pouvez télécharger le rapport Excel.`
            : `✅ Toutes les vacations sont couvertes. Aucune anomalie de couverture détectée pour la zone ${zone.toUpperCase()}.`
        }
      }));
    } catch (err: any) {
      console.error("Erreur lors du traitement de couverture :", err);
      setState(prev => ({
        ...prev,
        isVerifying: false,
        hasRun: true,
        alert: {
          type: 'error',
          title: 'Erreur lors du traitement',
          message: err?.message || 'Impossible d\'analyser les fichiers fournis.'
        }
      }));
    }
  };

  // Helper to reset a zone
  const handleReset = (zone: 'province' | 'orly') => {
    const setState = zone === 'province' ? setProvinceState : setOrlyState;
    setState({
      contractsFile: null,
      planningFile: null,
      isVerifying: false,
      alert: {
        type: 'info',
        title: `Information ${zone.toUpperCase()}`,
        message: DEFAULT_INFO_MESSAGE
      },
      warningsList: [],
      xlsxBase64: null,
      results: [],
      hasRun: false
    });
  };

  return (
    <div className="space-y-6 animate-fade-in w-full" id="coverage-control-container">
      
      {/* Main Header Banner */}
      <div className="bg-gradient-to-r from-[#082C66] via-[#0D3B82] to-[#0062FF] rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-blue-900/30">
        <div className="relative z-10 space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Contrôle de Couverture
          </h1>
          <p className="text-xs md:text-sm text-blue-100 max-w-3xl leading-relaxed">
            Vérification automatisée de la couverture du planning par un contrat pour HubJob PROVINCE et ORLY
          </p>
        </div>
      </div>

      {/* Distinct Two-Zone Grid: PROVINCE (#57aea6) vs ORLY (#7c8dd9) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        
        {/* ==================== ZONE 1: PROVINCE ==================== */}
        <ZoneCard 
          zoneId="province"
          title="PROVINCE"
          subtitle="Plateforme aéroports de province (BES, BOD, LYS, MPL, MRS, NCE, NTE et TLS)"
          borderColor="border-[#57aea6]/40"
          headerHexColor="#57aea6"
          icon={<Plane className="h-5 w-5 text-white" />}
          state={provinceState}
          onFileChange={(type, file) => handleFileChange('province', type, file)}
          onVerify={() => handleVerify('province')}
          onReset={() => handleReset('province')}
        />

        {/* ==================== ZONE 2: ORLY ==================== */}
        <ZoneCard 
          zoneId="orly"
          title="ORLY"
          subtitle="Plateforme Aéroportuaire d'Orly"
          borderColor="border-[#7c8dd9]/40"
          headerHexColor="#7c8dd9"
          icon={<Plane className="h-5 w-5 text-white" />}
          state={orlyState}
          onFileChange={(type, file) => handleFileChange('orly', type, file)}
          onVerify={() => handleVerify('orly')}
          onReset={() => handleReset('orly')}
        />

      </div>

    </div>
  );
}

// Sub-component for individual Zone Card (Province or Orly)
interface ZoneCardProps {
  zoneId: 'province' | 'orly';
  zoneBadgeText?: string;
  title: string;
  subtitle: string;
  borderColor: string;
  headerHexColor: string;
  badgeBg?: string;
  icon: React.ReactNode;
  state: ZoneState;
  onFileChange: (fileType: 'contractsFile' | 'planningFile', file: File | null) => void;
  onVerify: () => void;
  onReset: () => void;
}

function ZoneCard({
  zoneId,
  zoneBadgeText,
  title,
  subtitle,
  borderColor,
  headerHexColor,
  badgeBg,
  icon,
  state,
  onFileChange,
  onVerify,
  onReset
}: ZoneCardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const canVerify = state.contractsFile !== null && state.planningFile !== null;

  // Filter anomalies based on search
  const filteredResults = state.results.filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.Matricule && item.Matricule.toLowerCase().includes(term)) ||
      (item.Agent && item.Agent.toLowerCase().includes(term)) ||
      (item["Lieu / Client"] && item["Lieu / Client"].toLowerCase().includes(term)) ||
      (item.Motif && item.Motif.toLowerCase().includes(term)) ||
      (item["Date Vacation"] && item["Date Vacation"].toLowerCase().includes(term))
    );
  });

  const handleDownloadXlsx = () => {
    if (!state.xlsxBase64) return;
    const link = document.createElement('a');
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${state.xlsxBase64}`;
    link.download = `Rapport_Non_Couverture_${title}_${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`bg-white rounded-2xl border-2 ${borderColor} shadow-md flex flex-col overflow-hidden w-full relative transition-all`} id={`zone-card-${zoneId}`}>
      
      {/* Top Visual Accent Strip */}
      <div className="h-1.5 w-full" style={{ backgroundColor: headerHexColor }} />

      {/* Zone Header Bar */}
      <div 
        className="p-4 text-white flex items-center justify-between shrink-0 shadow-xs"
        style={{ backgroundColor: headerHexColor }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 text-white shadow-2xs">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              {zoneBadgeText && (
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeBg}`}>
                  {zoneBadgeText}
                </span>
              )}
              <h2 className="text-xl font-black tracking-wide uppercase">{title}</h2>
            </div>
            <p className="text-xs text-white/90 font-medium mt-0.5 leading-snug">{subtitle}</p>
          </div>
        </div>

        {(state.contractsFile || state.planningFile) && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-all border border-white/20 shadow-2xs cursor-pointer shrink-0 ml-2"
            title="Réinitialiser les fichiers de cette zone"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </button>
        )}
      </div>

      <div className="p-5 space-y-5 flex-1 flex flex-col">
        
        {/* Upload Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Upload 1: Fichier Contrats */}
          <FileUploadDropzone 
            id={`${zoneId}-contracts-input`}
            label={`1. Fichier Contrats (${title})`}
            description="Format accepté : .xlsx, .csv"
            file={state.contractsFile}
            onSelectFile={(f) => onFileChange('contractsFile', f)}
            accentColor={zoneId === 'province' ? 'blue' : 'indigo'}
          />

          {/* Upload 2: Fichier Planning */}
          <FileUploadDropzone 
            id={`${zoneId}-planning-input`}
            label={`2. Fichier Planning (${title})`}
            description="Format accepté : .xlsx, .csv"
            file={state.planningFile}
            onSelectFile={(f) => onFileChange('planningFile', f)}
            accentColor={zoneId === 'province' ? 'blue' : 'indigo'}
          />

        </div>

        {/* Action Button: Lancer la vérification */}
        <div className="pt-1">
          <button
            onClick={onVerify}
            disabled={!canVerify || state.isVerifying}
            style={canVerify && !state.isVerifying ? { backgroundColor: headerHexColor } : undefined}
            className={`w-full py-3.5 px-5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-sm ${
              canVerify && !state.isVerifying
                ? 'hover:brightness-95 text-white shadow-md active:scale-[0.99] cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            {state.isVerifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Vérification en cours ({title})...</span>
              </>
            ) : (
              <>
                <Play className={`h-4 w-4 ${canVerify ? 'fill-current text-white' : 'text-slate-400'}`} />
                <span>Lancer la vérification {title}</span>
              </>
            )}
          </button>
        </div>

        {/* Loading Indicator Banner */}
        {state.isVerifying && (
          <div className="p-4 rounded-xl bg-blue-50/90 border-2 border-blue-300 text-blue-900 flex items-center gap-3 animate-pulse">
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
            <div className="space-y-0.5 text-xs">
              <p className="font-bold text-blue-900">Traitement en cours pour la zone {title}</p>
              <p className="text-blue-700">Analyse croisée des fichiers Contrats et Planning en cours, veuillez patienter quelques secondes...</p>
            </div>
          </div>
        )}

        {/* Alert / Main Status Banner */}
        {!state.isVerifying && state.alert && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            state.alert.type === 'success'
              ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-2xs'
              : state.alert.type === 'warning'
              ? 'bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-2xs'
              : state.alert.type === 'error'
              ? 'bg-rose-50 border-2 border-rose-300 text-rose-950 shadow-2xs'
              : 'bg-slate-50 border border-slate-200 text-slate-900'
          }`}>
            <div className="shrink-0 mt-0.5">
              {state.alert.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {state.alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              {state.alert.type === 'error' && <AlertTriangle className="h-5 w-5 text-rose-600" />}
              {state.alert.type === 'info' && <Info className="h-5 w-5 text-blue-600" />}
            </div>
            <div className="space-y-0.5 text-xs">
              <h4 className="font-extrabold tracking-tight text-sm">{state.alert.title}</h4>
              <p className="leading-relaxed font-medium whitespace-pre-line">{state.alert.message}</p>
            </div>
          </div>
        )}

        {/* Detailed Warnings / Messages List */}
        {state.warningsList && state.warningsList.length > 0 && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Avertissements & Informations de contrôle ({title}) :</span>
            </div>
            <ul className="space-y-1 pl-5 list-disc text-slate-600 text-[11px] leading-relaxed">
              {state.warningsList.map((warn, idx) => (
                <li key={idx} className="whitespace-pre-line">{warn}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Success Banner when 0 Anomalies */}
        {state.hasRun && !state.isVerifying && state.results.length === 0 && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-center space-y-2">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-extrabold text-emerald-900 uppercase tracking-wide">
              Toutes les vacations sont couvertes ({title})
            </h3>
            <p className="text-xs text-emerald-700 max-w-md mx-auto">
              Aucune anomalie détectée : toutes les vacations planifiées correspondent bien aux plages de contrats en vigueur.
            </p>
          </div>
        )}

        {/* Results Table Section */}
        <div className="flex-1 flex flex-col pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-slate-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Tableau des anomalies ({title})
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {state.results.length > 0 && (
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrer..."
                    className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${
                state.results.length > 0 
                  ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                  : 'text-emerald-800 bg-emerald-100 border border-emerald-300'
              }`}>
                {state.results.length} anomalie(s)
              </span>
            </div>
          </div>

          {/* Prominent Download Report Button */}
          {state.xlsxBase64 && (
            <div className="mb-3">
              <button
                onClick={handleDownloadXlsx}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] border border-emerald-700"
              >
                <Download className="h-4 w-4" />
                <span>📥 Télécharger le rapport (xlsx) — Zone {title}</span>
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex-1 min-h-[220px] flex flex-col">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Matricule</th>
                    <th className="py-2.5 px-3">Agent</th>
                    <th className="py-2.5 px-3">Date Vacation</th>
                    <th className="py-2.5 px-3">Lieu / Client</th>
                    <th className="py-2.5 px-3">Motif</th>
                    <th className="py-2.5 px-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {state.results.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 px-4 text-center">
                        <div className="space-y-2 max-w-sm mx-auto">
                          <div className="w-10 h-10 bg-slate-200/60 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
                            <FileSpreadsheet className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-600">
                            {state.hasRun ? "Toutes les vacations sont couvertes !" : "Aucune analyse lancée"}
                          </p>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {state.hasRun 
                              ? "Aucune vacation non couverte n'a été trouvée pour cette zone."
                              : "Chargez les deux fichiers et cliquez sur 'Lancer la vérification' pour calculer la conformité."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                        Aucun résultat ne correspond à la recherche "{searchTerm}".
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{item.Matricule}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{item.Agent}</td>
                        <td className="py-2 px-3 text-slate-600">{item["Date Vacation"]}</td>
                        <td className="py-2 px-3 text-slate-600">{item["Lieu / Client"]}</td>
                        <td className="py-2 px-3 text-slate-600">{item.Motif}</td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] uppercase">
                            <AlertTriangle className="h-3 w-3" />
                            {item.Statut}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

// Single Upload Dropzone Component
interface FileUploadDropzoneProps {
  id: string;
  label: string;
  description: string;
  file: File | null;
  onSelectFile: (file: File | null) => void;
  accentColor: 'blue' | 'indigo';
}

function FileUploadDropzone({
  id,
  label,
  description,
  file,
  onSelectFile,
  accentColor
}: FileUploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (isValidFile(droppedFile)) {
        onSelectFile(droppedFile);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelectFile(e.target.files[0]);
    }
  };

  const isValidFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    return ext === 'xlsx' || ext === 'xls' || ext === 'csv';
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-800">
        {label}
      </label>

      <input 
        type="file" 
        id={id}
        ref={fileInputRef}
        onChange={handleChange}
        accept=".xlsx,.xls,.csv" 
        className="hidden" 
      />

      {file ? (
        // Loaded File Display Box
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs group">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-900 truncate">{file.name}</p>
              <p className="text-[10px] text-emerald-600 font-medium">
                {(file.size / 1024).toFixed(1)} KB — Prêt
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors shrink-0 cursor-pointer"
            title="Supprimer ce fichier"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        // Empty Dropzone
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isDragging 
              ? 'border-blue-500 bg-blue-50/60 scale-[1.01]' 
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <div className="w-8 h-8 bg-white shadow-2xs border border-slate-200 text-slate-500 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Upload className="h-4 w-4" />
          </div>
          <p className="text-xs font-bold text-slate-700">
            Parcourir ou glisser-déposer
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}

