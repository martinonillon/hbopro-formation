import React, { useState, useRef, useMemo } from 'react';
import { 
  FileText, 
  UserCheck, 
  CreditCard, 
  HeartPulse, 
  Car, 
  FileSpreadsheet, 
  Home, 
  Landmark, 
  ShieldCheck, 
  Globe, 
  Camera, 
  Search, 
  UserPlus, 
  X, 
  Upload, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Check, 
  User, 
  ArrowRight,
  Download,
  FolderGit2,
  FileArchive,
  Layers,
  FileDown,
  Loader2,
  RotateCcw,
  Info
} from 'lucide-react';
import { Collaborator } from '../types';
import { ESCALES, SERVICES, getEscaleStyle } from '../data/modulesData';
import { 
  DEFAULT_EXPORT_CODES, 
  ProcessedRhFile, 
  ProcessingProgress, 
  processFullRhDossier, 
  generateZipArchive, 
  triggerFileDownload,
  buildZipFilename
} from '../utils/rhFolderProcessor';

export interface UploadedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  uploadDate: string;
}

export type UploadedFilesState = Record<string, UploadedFileItem | undefined>;

interface RHFolderGeneratorProps {
  collaborators: Collaborator[];
  onAddCollaborator: (collab: Omit<Collaborator, 'id'>) => void;
  onBackToHome?: () => void;
  isReadOnly?: boolean;
}

interface DropZoneDef {
  zoneKey: string;
  label: string;
  isOptional?: boolean;
}

interface DocCardDef {
  id: string;
  title: string;
  icon: React.ElementType;
  exportCode: string;
  secondaryCode?: string;
  primaryNotice?: string;
  secondaryNotice?: string;
  accentColor: string; // Tailwind color theme
  zones: DropZoneDef[];
}

const DOCUMENT_CARDS: DocCardDef[] = [
  {
    id: 'fiche_renseignement',
    title: 'Fiche de renseignement',
    exportCode: 'ADMHBO',
    icon: FileText,
    accentColor: 'from-orange-500/10 to-amber-500/10 border-orange-200 text-orange-600',
    zones: [
      { zoneKey: 'fiche_renseignement_recto', label: 'Document complet ou recto' },
      { zoneKey: 'fiche_renseignement_verso', label: 'Verso', isOptional: true }
    ]
  },
  {
    id: 'cv',
    title: 'CV',
    exportCode: 'CV',
    icon: UserCheck,
    accentColor: 'from-blue-500/10 to-indigo-500/10 border-blue-200 text-blue-600',
    zones: [
      { zoneKey: 'cv_complet', label: 'Document complet' }
    ]
  },
  {
    id: 'identite',
    title: 'Document d’identité (CNI ou PSPT)',
    exportCode: 'CNI',
    icon: CreditCard,
    accentColor: 'from-sky-500/10 to-blue-500/10 border-sky-200 text-sky-600',
    zones: [
      { zoneKey: 'identite_recto', label: 'Document complet ou recto' },
      { zoneKey: 'identite_verso', label: 'Verso', isOptional: true }
    ]
  },
  {
    id: 'titre_sejour',
    title: 'Titre de séjour',
    exportCode: 'TS',
    icon: CreditCard,
    accentColor: 'from-purple-500/10 to-indigo-500/10 border-purple-200 text-purple-600',
    zones: [
      { zoneKey: 'titre_sejour_recto', label: 'Document complet ou recto' },
      { zoneKey: 'titre_sejour_verso', label: 'Verso', isOptional: true }
    ]
  },
  {
    id: 'carte_vitale',
    title: 'Carte vitale',
    exportCode: 'VITALE',
    icon: HeartPulse,
    accentColor: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-600',
    zones: [
      { zoneKey: 'carte_vitale_complet', label: 'Document complet' }
    ]
  },
  {
    id: 'permis_b',
    title: 'Permis B',
    exportCode: 'PERMISB',
    icon: Car,
    accentColor: 'from-cyan-500/10 to-blue-500/10 border-cyan-200 text-cyan-600',
    zones: [
      { zoneKey: 'permis_b_recto', label: 'Document complet ou recto' },
      { zoneKey: 'permis_b_verso', label: 'Verso', isOptional: true }
    ]
  },
  {
    id: 'carte_grise',
    title: 'Carte grise',
    exportCode: 'CARTEGRISE',
    icon: FileSpreadsheet,
    accentColor: 'from-slate-500/10 to-gray-500/10 border-slate-300 text-slate-700',
    zones: [
      { zoneKey: 'carte_grise_recto', label: 'Document complet ou recto' },
      { zoneKey: 'carte_grise_verso', label: 'Verso ou Attestation d\'assurance', isOptional: true }
    ]
  },
  {
    id: 'justificatif_domicile',
    title: 'Justificatif de domicile',
    exportCode: 'JUSTIFDOM',
    icon: Home,
    accentColor: 'from-amber-500/10 to-yellow-500/10 border-amber-200 text-amber-700',
    zones: [
      { zoneKey: 'justif_domicile_complet', label: 'Document complet' },
      { zoneKey: 'justif_domicile_attestation', label: 'Attestation sur l’honneur', isOptional: true },
      { zoneKey: 'justif_domicile_id_logeur', label: 'ID du logeur', isOptional: true }
    ]
  },
  {
    id: 'rib',
    title: 'RIB',
    exportCode: 'RIB',
    icon: Landmark,
    accentColor: 'from-emerald-500/10 to-green-500/10 border-emerald-200 text-emerald-700',
    zones: [
      { zoneKey: 'rib_complet', label: 'Document complet' }
    ]
  },
  {
    id: 'casier_b3',
    title: 'Casier judiciaire B3',
    exportCode: 'CASIERB3',
    icon: ShieldCheck,
    accentColor: 'from-rose-500/10 to-red-500/10 border-rose-200 text-rose-600',
    zones: [
      { zoneKey: 'casier_b3_complet', label: 'Document complet' }
    ]
  },
  {
    id: 'casier_etranger',
    title: 'Casier judiciaire étranger',
    exportCode: 'CASIERETR',
    icon: Globe,
    accentColor: 'from-teal-500/10 to-cyan-500/10 border-teal-200 text-teal-700',
    zones: [
      { zoneKey: 'casier_etranger_complet', label: 'Document complet' }
    ]
  },
  {
    id: 'photo',
    title: 'Photo',
    exportCode: 'PHOTOPLA',
    secondaryCode: 'PHI',
    icon: Camera,
    primaryNotice: 'Consigne : veuillez juste recadrer la photo avant import.',
    secondaryNotice: '2 photos seront générées (Planet 450x600px et TCA 119x159px).',
    accentColor: 'from-fuchsia-500/10 to-pink-500/10 border-fuchsia-200 text-fuchsia-600',
    zones: [
      { zoneKey: 'photo_portrait', label: 'Photo' }
    ]
  }
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function RHFolderGenerator({
  collaborators,
  onAddCollaborator,
  onBackToHome,
  isReadOnly = false
}: RHFolderGeneratorProps) {
  // Collaborator search & selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);

  // Modal new collaborator state
  const [isNewCollabModalOpen, setIsNewCollabModalOpen] = useState(false);
  const [newCollabData, setNewCollabData] = useState({
    firstName: '',
    lastName: '',
    matricule: '',
    email: '',
    phone: '',
    escale: ESCALES[1] || 'BES',
    service: SERVICES[0] || 'ADMIN'
  });

  // Uploaded files state per zoneKey (Ephemere local state only)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFilesState>({});
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  
  // Custom export codes (fallback to DEFAULT_EXPORT_CODES)
  const [exportCodes] = useState<Record<string, string>>(DEFAULT_EXPORT_CODES);

  // Preview Modal state (supports both UploadedFileItem and ProcessedRhFile)
  const [previewItem, setPreviewItem] = useState<{
    name: string;
    size: number;
    url?: string;
    type?: string;
    isProcessed?: boolean;
    pageCount?: number;
    dimensions?: string;
  } | null>(null);

  // Processing & Generation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [processedResults, setProcessedResults] = useState<ProcessedRhFile[]>([]);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipDownloaded, setZipDownloaded] = useState(false);
  const [downloadedZipName, setDownloadedZipName] = useState<string>('');

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Filter collaborators based on search query
  const filteredCollaborators = useMemo(() => {
    if (!searchQuery.trim()) return collaborators.slice(0, 10);
    const query = searchQuery.toLowerCase().trim();
    return collaborators.filter(collab => {
      const fullName = `${collab.firstName} ${collab.lastName}`.toLowerCase();
      const reverseFullName = `${collab.lastName} ${collab.firstName}`.toLowerCase();
      const matricule = (collab.matricule || '').toLowerCase();
      const email = (collab.email || '').toLowerCase();
      return (
        fullName.includes(query) ||
        reverseFullName.includes(query) ||
        matricule.includes(query) ||
        email.includes(query)
      );
    });
  }, [collaborators, searchQuery]);

  // Clean memory URLs helper
  const cleanAllPreviewUrls = () => {
    (Object.values(uploadedFiles) as (UploadedFileItem | undefined)[]).forEach((item) => {
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    processedResults.forEach((item) => {
      if (item.url) {
        URL.revokeObjectURL(item.url);
      }
    });
  };

  // Full Reset Action (Wipes all in-memory ephemeral files & collaborator selection)
  const handleResetFolder = () => {
    cleanAllPreviewUrls();
    setSelectedCollaborator(null);
    setUploadedFiles({});
    setProcessedResults([]);
    setIsResultsModalOpen(false);
    setIsProcessing(false);
    setProcessingProgress(null);
    setZipDownloaded(false);
    setDownloadedZipName('');
    setSearchQuery('');
    setPreviewItem(null);
  };

  // Handle file addition to a drop zone
  const handleFileDrop = (zoneKey: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    
    let previewUrl: string | undefined = undefined;
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }

    const newItem: UploadedFileItem = {
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl,
      uploadDate: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setUploadedFiles(prev => ({
      ...prev,
      [zoneKey]: newItem
    }));
  };

  const handleRemoveFile = (zoneKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFiles(prev => {
      const next = { ...prev };
      if (next[zoneKey]?.previewUrl) {
        URL.revokeObjectURL(next[zoneKey]!.previewUrl!);
      }
      delete next[zoneKey];
      return next;
    });
  };

  // Count total attached files and completed cards
  const totalUploadedFilesCount = useMemo(() => {
    return Object.values(uploadedFiles).filter(Boolean).length;
  }, [uploadedFiles]);

  const activeCardsCount = useMemo(() => {
    return DOCUMENT_CARDS.filter(card => 
      card.zones.some(zone => !!uploadedFiles[zone.zoneKey])
    ).length;
  }, [uploadedFiles]);

  // Handle creation of new collaborator
  const handleCreateNewCollaboratorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollabData.firstName || !newCollabData.lastName || !newCollabData.matricule) {
      return;
    }

    const newCollabPayload: Omit<Collaborator, 'id'> = {
      firstName: newCollabData.firstName.trim(),
      lastName: newCollabData.lastName.trim().toUpperCase(),
      matricule: newCollabData.matricule.trim().toUpperCase(),
      email: newCollabData.email.trim() || `${newCollabData.firstName.toLowerCase()}.${newCollabData.lastName.toLowerCase()}@hubjob.fr`,
      phone: newCollabData.phone.trim(),
      escale: newCollabData.escale,
      service: newCollabData.service,
      hireDate: new Date().toISOString().split('T')[0]
    };

    onAddCollaborator(newCollabPayload);

    // Auto-select the newly created collaborator
    const tempCollab: Collaborator = {
      ...newCollabPayload,
      id: 'temp_' + Date.now()
    };
    setSelectedCollaborator(tempCollab);

    // Reset and close modal
    setNewCollabData({
      firstName: '',
      lastName: '',
      matricule: '',
      email: '',
      phone: '',
      escale: ESCALES[1] || 'BES',
      service: SERVICES[0] || 'ADMIN'
    });
    setIsNewCollabModalOpen(false);
  };

  // STEP 2 & 3: Process All Files, Auto-generate ZIP and trigger download
  const handleExecuteGeneration = async () => {
    if (!selectedCollaborator || totalUploadedFilesCount === 0) return;

    setIsProcessing(true);
    setIsResultsModalOpen(true);
    setZipDownloaded(false);
    setProcessingProgress({ step: 'Traitement et conversion des fichiers...', percentage: 5 });

    try {
      // 1. Process files (PDF merge, JPG photo resizing, exact naming)
      const results = await processFullRhDossier(
        selectedCollaborator,
        uploadedFiles,
        exportCodes,
        (progress) => setProcessingProgress(progress)
      );

      setProcessedResults(results);

      // 2. Step 3: Automatically generate ZIP and trigger download
      if (results.length > 0) {
        setProcessingProgress({ step: 'Génération de l\'archive ZIP...', percentage: 95 });
        setIsZipping(true);
        const { blob, filename } = await generateZipArchive(selectedCollaborator, results);
        
        // Trigger auto-download
        triggerFileDownload(blob, filename);
        setDownloadedZipName(filename);
        setZipDownloaded(true);
        setIsZipping(false);
        setProcessingProgress({ step: 'Archive ZIP téléchargée avec succès !', percentage: 100 });
      }
    } catch (err) {
      console.error('Error during RH folder processing:', err);
      alert('Une erreur est survenue lors de la génération du dossier RH.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual ZIP Download button fallback
  const handleDownloadAllZipManual = async () => {
    if (!selectedCollaborator || processedResults.length === 0) return;

    setIsZipping(true);
    try {
      const { blob, filename } = await generateZipArchive(selectedCollaborator, processedResults);
      triggerFileDownload(blob, filename);
      setDownloadedZipName(filename);
      setZipDownloaded(true);
    } catch (err) {
      console.error('Error creating ZIP:', err);
      alert('Impossible de générer l\'archive ZIP.');
    } finally {
      setIsZipping(false);
    }
  };

  // Handle batch individual downloads
  const handleDownloadAllIndividual = () => {
    processedResults.forEach((file, index) => {
      setTimeout(() => {
        triggerFileDownload(file.blob, file.filename);
      }, index * 250);
    });
  };

  return (
    <div className="w-full space-y-6 pb-28 animate-fade-in" id="rh-folder-generator-view">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#ff751f] via-[#f4511e] to-[#d84315] rounded-2xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
        {/* Large Watermark Background Icon */}
        <div className="absolute -right-8 -bottom-10 text-white/15 pointer-events-none select-none">
          <FolderGit2 className="w-64 h-64 sm:w-72 sm:h-72 stroke-[1.2]" />
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Générateur de Dossier RH
              </h1>
              {isReadOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-amber-950 border border-amber-300 shadow-xs">
                  Lecture seule
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-white/95 font-medium">
              Standardisez le dossier RH des intérimaires hubjob
            </p>
          </div>

          {/* Quick Counter & Reset shortcut if active */}
          <div className="flex items-center gap-3">
            <div className="bg-black/20 backdrop-blur-md rounded-xl p-3 border border-white/20 flex items-center gap-4 text-xs shrink-0">
              <div>
                <p className="text-white/70 font-semibold uppercase tracking-wider text-[10px]">Fichiers déposés</p>
                <p className="text-lg font-black text-white">{totalUploadedFilesCount} / 19</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <p className="text-white/70 font-semibold uppercase tracking-wider text-[10px]">Dossiers actifs</p>
                <p className="text-lg font-black text-emerald-300">{activeCardsCount} / 12</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <p className="text-white/70 font-semibold uppercase tracking-wider text-[10px]">Intérimaire</p>
                <p className="text-xs font-bold text-white">
                  {selectedCollaborator ? `${selectedCollaborator.lastName}` : 'En attente'}
                </p>
              </div>
            </div>

            {(selectedCollaborator || totalUploadedFilesCount > 0) && (
              <button
                type="button"
                onClick={handleResetFolder}
                className="inline-flex items-center gap-1.5 px-3 py-3 bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-xl text-xs font-bold transition-all backdrop-blur-md cursor-pointer hover:shadow"
                title="Réinitialiser tout le dossier à zéro"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TOP BAR: Collaborator Selector & Add Button */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4" id="interimaire-selection-bar">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search or Selected Badge */}
          <div className="flex-1 relative" ref={searchContainerRef}>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#ff751f]" />
              <span>Sélection de l'intérimaire (NOM, Prénom, Email ou Matricule)</span>
            </label>

            {!selectedCollaborator ? (
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    placeholder="Rechercher par NOM, Prénom, Matricule (ex: 100245) ou Email..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#ff751f] focus:ring-2 focus:ring-[#ff751f]/20 focus:outline-none transition-all"
                    id="input-search-interimaire"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isSearchOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl z-30 max-h-72 overflow-y-auto divide-y divide-slate-100 animate-fade-in">
                    {filteredCollaborators.length > 0 ? (
                      filteredCollaborators.map((collab) => {
                        const escaleStyle = getEscaleStyle(collab.escale);
                        return (
                          <button
                            key={collab.id}
                            type="button"
                            onClick={() => {
                              setSelectedCollaborator(collab);
                              setIsSearchOpen(false);
                              setSearchQuery('');
                            }}
                            className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                                {collab.firstName[0]}{collab.lastName[0]}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">
                                  {collab.lastName} {collab.firstName}
                                </p>
                                <p className="text-[11px] text-slate-500 font-mono">
                                  Matricule : {collab.matricule || 'N/A'} • {collab.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${escaleStyle.bg} ${escaleStyle.text} ${escaleStyle.border}`}>
                                {collab.escale}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {collab.service}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Aucun intérimaire trouvé pour "{searchQuery}".
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Collaborator Card */
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-orange-50/50 border border-orange-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ff751f] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                    {selectedCollaborator.firstName[0]}{selectedCollaborator.lastName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">
                        {selectedCollaborator.lastName} {selectedCollaborator.firstName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs">
                        {selectedCollaborator.matricule || 'Sans matricule'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {selectedCollaborator.email} {selectedCollaborator.phone ? `• ${selectedCollaborator.phone}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${getEscaleStyle(selectedCollaborator.escale).bg} ${getEscaleStyle(selectedCollaborator.escale).text} ${getEscaleStyle(selectedCollaborator.escale).border}`}>
                    Escale : {selectedCollaborator.escale}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                    {selectedCollaborator.service}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCollaborator(null)}
                    className="ml-2 px-3 py-1 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    title="Changer d'intérimaire"
                  >
                    Changer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* "+ Nouveau" Button */}
          <div className="flex items-end shrink-0">
            <button
              type="button"
              onClick={() => setIsNewCollabModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#ff751f] hover:bg-[#e65100] text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer active:scale-95"
              id="btn-new-interimaire"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Nouveau</span>
            </button>
          </div>

        </div>
      </div>

      {/* 12 CARDS GRID (DRAG & DROP) */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>Dépôt des pièces justificatives</span>
            <span className="text-xs font-normal text-slate-500">
              (12 catégories • Glisser-déposer ou cliquer pour importer)
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Les cases laissées vides sont automatiquement ignorées lors de la génération du ZIP.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" id="documents-grid-12">
          {DOCUMENT_CARDS.map((docCard) => {
            const Icon = docCard.icon;
            
            // Calculate how many zones in this card have files
            const uploadedCountInCard = docCard.zones.filter(z => !!uploadedFiles[z.zoneKey]).length;
            const isComplete = uploadedCountInCard === docCard.zones.length;
            const hasAny = uploadedCountInCard > 0;

            return (
              <div
                key={docCard.id}
                id={`card-doc-${docCard.id}`}
                className={`bg-white rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isComplete 
                    ? 'border-emerald-300 ring-1 ring-emerald-200/50' 
                    : hasAny 
                      ? 'border-amber-300 ring-1 ring-amber-200/50' 
                      : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center border shadow-2xs shrink-0 ${docCard.accentColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 leading-snug">
                            {docCard.title}
                          </h3>
                        </div>

                        {docCard.zones.length > 1 && hasAny && (
                          <div className="mt-1">
                            <span className="text-[10px] text-orange-600 font-semibold">
                              • Fusion PDF ({uploadedCountInCard} source{uploadedCountInCard > 1 ? 's' : ''})
                            </span>
                          </div>
                        )}

                        {docCard.primaryNotice && (
                          <p className="text-[11px] font-bold text-pink-600 mt-1 leading-tight">
                            {docCard.primaryNotice}
                          </p>
                        )}

                        {docCard.secondaryNotice && (
                          <p className="text-[10.5px] italic text-slate-500 mt-0.5 leading-tight">
                            {docCard.secondaryNotice}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Badge */}
                    <div className="shrink-0">
                      {isComplete ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                          <Check className="w-3 h-3" />
                          Complet
                        </span>
                      ) : hasAny ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold">
                          {uploadedCountInCard}/{docCard.zones.length}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full text-[10px] font-medium">
                          0/{docCard.zones.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Drop Zones Container */}
                  <div className="space-y-2.5 mt-3">
                    {docCard.zones.map((zone) => {
                      const fileItem = uploadedFiles[zone.zoneKey];
                      const isOver = dragOverZone === zone.zoneKey;
                      const inputId = `file-input-${zone.zoneKey}`;

                      return (
                        <div key={zone.zoneKey} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 px-0.5">
                            <span>
                              {zone.label} {zone.isOptional && <span className="text-slate-400 font-normal">(Optionnel)</span>}
                            </span>
                            {fileItem && (
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {formatFileSize(fileItem.size)}
                              </span>
                            )}
                          </div>

                          {!fileItem ? (
                            /* Empty Drop Zone */
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverZone(zone.zoneKey);
                              }}
                              onDragLeave={() => setDragOverZone(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setDragOverZone(null);
                                handleFileDrop(zone.zoneKey, e.dataTransfer.files);
                              }}
                              onClick={() => {
                                document.getElementById(inputId)?.click();
                              }}
                              className={`border-2 border-dashed rounded-xl p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 group ${
                                isOver
                                  ? 'border-[#ff751f] bg-orange-50/70 scale-[1.01]'
                                  : 'border-slate-250 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-400'
                              }`}
                            >
                              <input
                                type="file"
                                id={inputId}
                                className="hidden"
                                onChange={(e) => {
                                  handleFileDrop(zone.zoneKey, e.target.files);
                                  e.target.value = '';
                                }}
                              />
                              <Upload className={`w-4 h-4 transition-transform group-hover:-translate-y-0.5 ${isOver ? 'text-[#ff751f]' : 'text-slate-400'}`} />
                              <div className="text-[11px] font-medium text-slate-600">
                                <span className="font-bold text-[#ff751f]">Glissez un fichier</span> ou parcourez
                              </div>
                            </div>
                          ) : (
                            /* Uploaded File Chip / Card */
                            <div className="bg-slate-50 border border-slate-250 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs group hover:bg-slate-100/70 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                {fileItem.previewUrl ? (
                                  <img
                                    src={fileItem.previewUrl}
                                    alt={fileItem.name}
                                    className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                                    <FileText className="w-4 h-4 text-[#ff751f]" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate" title={fileItem.name}>
                                    {fileItem.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    Ajouté à {fileItem.uploadDate}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {fileItem.previewUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewItem({
                                      name: fileItem.name,
                                      size: fileItem.size,
                                      url: fileItem.previewUrl,
                                      type: fileItem.type
                                    })}
                                    className="p-1 text-slate-500 hover:text-[#ff751f] hover:bg-white rounded-md transition-colors cursor-pointer"
                                    title="Aperçu"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleRemoveFile(zone.zoneKey, e)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                  title="Supprimer ce fichier"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-4 sm:px-8 z-40 shadow-lg">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-3 text-xs">
            <div className={`w-2.5 h-2.5 rounded-full ${selectedCollaborator ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <div>
              {selectedCollaborator ? (
                <p className="font-bold text-slate-800">
                  Dossier de : <span className="text-[#ff751f]">{selectedCollaborator.lastName} {selectedCollaborator.firstName}</span> ({selectedCollaborator.matricule || 'N/A'}) • Escale : {selectedCollaborator.escale}
                </p>
              ) : (
                <p className="font-medium text-slate-500">
                  ⚠️ Aucun intérimaire sélectionné
                </p>
              )}
              <p className="text-[11px] text-slate-500">
                {totalUploadedFilesCount} fichier(s) déposé(s) sur {activeCardsCount} catégorie(s)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            
            {/* Reset button (visible once files or collab selected) */}
            {(selectedCollaborator || totalUploadedFilesCount > 0) && (
              <button
                type="button"
                onClick={handleResetFolder}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                title="Vider les fichiers et l'intérimaire sélectionné"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#ff751f]" />
                <span>Réinitialiser le dossier</span>
              </button>
            )}

            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Retour Accueil
              </button>
            )}

            {/* Main Generate Button */}
            <button
              type="button"
              disabled={!selectedCollaborator || totalUploadedFilesCount === 0 || isProcessing}
              onClick={handleExecuteGeneration}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer ${
                !selectedCollaborator || totalUploadedFilesCount === 0 || isProcessing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-[#ff751f] to-[#d84315] hover:from-[#f4511e] hover:to-[#bf360c] text-white active:scale-98 shadow-orange-500/20'
              }`}
              id="btn-generate-rh-folder"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Génération & Téléchargement ZIP...</span>
                </>
              ) : (
                <>
                  <FileArchive className="w-4 h-4" />
                  <span>Générer le dossier RH (.ZIP)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* MODAL: Add New Collaborator */}
      {isNewCollabModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#ff751f]" />
                <span>Ajouter un nouvel intérimaire</span>
              </h4>
              <button 
                type="button"
                onClick={() => setIsNewCollabModalOpen(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCollaboratorSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Prénom *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Jean"
                    value={newCollabData.firstName}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#ff751f] focus:outline-none bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Nom *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: DUPONT"
                    value={newCollabData.lastName}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#ff751f] focus:outline-none bg-slate-50/50 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Matricule *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: 100245"
                    value={newCollabData.matricule}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, matricule: e.target.value }))}
                    className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#ff751f] focus:outline-none bg-slate-50/50 font-mono font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Téléphone</label>
                  <input
                    type="tel"
                    placeholder="Ex: 06 12 34 56 78"
                    value={newCollabData.phone}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#ff751f] focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Email professionnel *</label>
                <input
                  required
                  type="email"
                  placeholder="Ex: jean.dupont@hubjob.fr"
                  value={newCollabData.email}
                  onChange={(e) => setNewCollabData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#ff751f] focus:outline-none bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Escale d'affectation</label>
                  <select
                    value={newCollabData.escale}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, escale: e.target.value }))}
                    className="mt-1 block w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-[#ff751f]"
                  >
                    {ESCALES.map(esc => (
                      <option key={esc} value={esc}>{esc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Service rattaché</label>
                  <select
                    value={newCollabData.service}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, service: e.target.value }))}
                    className="mt-1 block w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-[#ff751f]"
                  >
                    {SERVICES.map(srv => (
                      <option key={srv} value={srv}>{srv}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCollabModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ff751f] hover:bg-[#e65100] text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Ajouter et sélectionner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Image / PDF Preview */}
      {previewItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
              <div className="min-w-0 pr-4">
                <h4 className="font-bold text-sm truncate">{previewItem.name}</h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span>{formatFileSize(previewItem.size)}</span>
                  {previewItem.dimensions && <span>• {previewItem.dimensions}</span>}
                  {previewItem.pageCount && <span>• {previewItem.pageCount} page(s)</span>}
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setPreviewItem(null)} 
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 flex-1 flex items-center justify-center bg-slate-100 overflow-auto min-h-[350px]">
              {previewItem.type?.includes('pdf') || previewItem.name.endsWith('.pdf') ? (
                previewItem.url ? (
                  <iframe
                    src={previewItem.url}
                    title={previewItem.name}
                    className="w-full h-[60vh] rounded-lg border border-slate-300 bg-white"
                  />
                ) : (
                  <div className="text-center p-8 text-slate-500">
                    <FileText className="w-16 h-16 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-bold text-slate-700">Document PDF généré</p>
                  </div>
                )
              ) : previewItem.url ? (
                <img 
                  src={previewItem.url} 
                  alt={previewItem.name}
                  className="max-h-[60vh] max-w-full rounded-lg shadow-md object-contain border border-slate-200"
                />
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <FileText className="w-16 h-16 mx-auto mb-2 text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">{previewItem.name}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              {previewItem.url ? (
                <button
                  type="button"
                  onClick={() => triggerFileDownload(previewItem.url ? (new Blob()) : new Blob(), previewItem.name)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: STEP 3 - Generated ZIP & Results Display */}
      {isResultsModalOpen && selectedCollaborator && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#ff751f] via-[#f4511e] to-[#d84315] p-5 text-white shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-orange-100 mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Dossier RH & Archive ZIP générée</span>
                  </div>
                  <h3 className="text-xl font-black">
                    {selectedCollaborator.lastName} {selectedCollaborator.firstName}
                  </h3>
                  <p className="text-xs text-orange-100 mt-0.5">
                    Matricule : <span className="font-mono font-bold">{selectedCollaborator.matricule || 'N/A'}</span> • Escale : {selectedCollaborator.escale}
                  </p>
                </div>

                <button 
                  type="button"
                  onClick={() => setIsResultsModalOpen(false)}
                  className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Progress Indicator */}
              {isProcessing && processingProgress && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-slate-700 font-bold text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-[#ff751f]" />
                    <span>{processingProgress.step}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#ff751f] to-[#d84315] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${processingProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-mono text-slate-400">
                    {processingProgress.percentage}% complété
                  </p>
                </div>
              )}

              {/* If ZIP is ready and downloaded */}
              {!isProcessing && processedResults.length > 0 && (
                <>
                  {/* Success ZIP Download Banner */}
                  {zipDownloaded && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-900">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">
                            Téléchargement automatique déclenché !
                          </p>
                          <p className="text-[11px] text-emerald-700 font-mono font-bold mt-0.5">
                            {downloadedZipName || buildZipFilename(selectedCollaborator.matricule, selectedCollaborator.lastName, selectedCollaborator.firstName)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleDownloadAllZipManual}
                        disabled={isZipping}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Re-télécharger le ZIP</span>
                      </button>
                    </div>
                  )}

                  {/* Summary Bar */}
                  <div className="bg-orange-50/70 border border-orange-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">
                        {processedResults.length} fichier(s) inclus dans l'archive
                      </p>
                      <p className="text-[11px] text-slate-600">
                        Structure ZIP : <code className="font-bold text-[#d84315]">DOSSIER_RH_[MATRICULE]_[NOM]_[PRENOM].zip</code>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadAllZipManual}
                        disabled={isZipping}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ff751f] hover:bg-[#e65100] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        {isZipping ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileArchive className="w-4 h-4" />
                        )}
                        <span>Télécharger ZIP</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadAllIndividual}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        title="Télécharger individuellement chaque fichier"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>Télécharger séparément</span>
                      </button>
                    </div>
                  </div>

                  {/* Generated Files List */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Fichiers générés & fusionnés :
                    </h4>

                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                      {processedResults.map((item) => (
                        <div 
                          key={item.id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              item.type === 'pdf' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-pink-50 text-pink-600 border border-pink-200'
                            }`}>
                              {item.type === 'pdf' ? <FileText className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-mono font-bold text-slate-900 select-all truncate">
                                  {item.filename}
                                </p>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.type === 'pdf' 
                                    ? 'bg-red-100 text-red-800 border border-red-200' 
                                    : 'bg-pink-100 text-pink-800 border border-pink-200'
                                }`}>
                                  {item.exportCode}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                                <span className="font-medium">{item.title}</span>
                                <span>•</span>
                                <span>{formatFileSize(item.size)}</span>
                                {item.pageCount && (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-semibold">{item.pageCount} page(s) PDF fusionnée(s)</span>
                                  </>
                                )}
                                {item.dimensions && (
                                  <>
                                    <span>•</span>
                                    <span className="text-pink-700 font-semibold">{item.dimensions}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => setPreviewItem({
                                name: item.filename,
                                size: item.size,
                                url: item.url,
                                type: item.type === 'pdf' ? 'application/pdf' : 'image/jpeg',
                                isProcessed: true,
                                pageCount: item.pageCount,
                                dimensions: item.dimensions
                              })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              title="Aperçu du document final"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Aperçu</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerFileDownload(item.blob, item.filename)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              title="Télécharger ce fichier"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Télécharger</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* If no files were produced */}
              {!isProcessing && processedResults.length === 0 && (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
                  <p className="text-xs font-bold text-slate-800">Aucun fichier à traiter</p>
                  <p className="text-[11px] text-slate-500">Veuillez déposer des pièces justificatives sur les cartes avant de lancer la génération.</p>
                </div>
              )}

            </div>

            {/* Modal Footer with Reset & Close */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Visible Reset Button */}
              <button
                type="button"
                onClick={handleResetFolder}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-900 border border-orange-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#ff751f]" />
                <span>Réinitialiser le dossier</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  Fichiers 100% éphémères (aucune persistance)
                </span>
                <button
                  type="button"
                  onClick={() => setIsResultsModalOpen(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
