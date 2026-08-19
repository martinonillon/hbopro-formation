import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Search, 
  UserPlus, 
  Calendar, 
  Clock, 
  Check, 
  AlertCircle, 
  Trash2,
  BookOpen,
  MapPin
} from 'lucide-react';
import { Collaborator, TrainingModule, TrainingLog } from '../types';
import { FORMATEURS, ESCALES, SERVICES, getEscaleStyle, RESULTATS, CONSIGNES } from '../data/modulesData';
import { normalizeDateToISO } from '../utils/dateUtils';

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborators: Collaborator[];
  modulesCatalog: TrainingModule[];
  trainingLogs?: TrainingLog[];
  onRegister: (data: {
    collaboratorIds: string[];
    moduleName: string;
    formateur: string;
    type: string;
    cycle: string;
    escale: string;
    service: string;
    idFormateur: string;
    heureDebut1: string;
    heureFin1: string;
    heureDebut2: string;
    heureFin2: string;
    madEa: boolean;
    cttHbo: boolean;
    convoc: boolean;
    dateDebut: string;
    dateFin: string;
    notes?: string;
    resultat?: string;
    consigne?: string;
    lieu?: string;
    numSession?: string;
  }) => void;
  editLog?: TrainingLog | null;
  onUpdateLog?: (logId: string, data: any) => void;
  preselectedCollaboratorId?: string | null;
  initialDate?: string | null;
  initialNumSession?: string | null;
}

export default function EnrollmentModal({
  isOpen,
  onClose,
  collaborators,
  modulesCatalog,
  trainingLogs = [],
  onRegister,
  editLog,
  onUpdateLog,
  preselectedCollaboratorId,
  initialDate,
  initialNumSession
}: EnrollmentModalProps) {
  // Collaborator search & selection
  const [collabSearch, setCollabSearch] = useState('');
  const [selectedCollabs, setSelectedCollabs] = useState<Collaborator[]>([]);
  
  // Module search & selection
  const [moduleSearch, setModuleSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);

  // Form Fields
  const [numSession, setNumSession] = useState('');
  const [escale, setEscale] = useState('BOD');
  const [service, setService] = useState('PISTE');
  const [cycle, setCycle] = useState('INI');
  const [formateur, setFormateur] = useState('Alyzia - Interne');
  const [idFormateur, setIdFormateur] = useState('');
  const [type, setType] = useState('Présentiel');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  
  // Hours
  const [heureDebut1, setHeureDebut1] = useState('');
  const [heureFin1, setHeureFin1] = useState('');
  const [heureDebut2, setHeureDebut2] = useState('');
  const [heureFin2, setHeureFin2] = useState('');

  // Checkboxes
  const [madEa, setMadEa] = useState(false);
  const [cttHbo, setCttHbo] = useState(false);
  const [convoc, setConvoc] = useState(false);

  // Error/validation feedback
  const [errorMessage, setErrorMessage] = useState('');

  // Notes / Commentaires
  const [notes, setNotes] = useState('');

  // Résultat & Consigne
  const [resultat, setResultat] = useState('En cours');
  const [consigne, setConsigne] = useState('N/A');
  const [lieu, setLieu] = useState('');

  // Sync state with editLog & preselectedCollaboratorId
  useEffect(() => {
    if (editLog) {
      // Find all logs belonging to this session
      let sessionLogs: TrainingLog[] = [];
      const numSessionVal = editLog.numSession?.trim();
      if (numSessionVal && trainingLogs && trainingLogs.length > 0) {
        sessionLogs = trainingLogs.filter(l => l.numSession?.trim() === numSessionVal);
      }
      if (sessionLogs.length === 0 && trainingLogs && trainingLogs.length > 0) {
        const dStr = editLog.dateDebut || editLog.dateInscription;
        sessionLogs = trainingLogs.filter(l => 
          (l.dateDebut || l.dateInscription) === dStr &&
          l.moduleName === editLog.moduleName &&
          l.escale === editLog.escale
        );
      }
      if (sessionLogs.length === 0) {
        sessionLogs = [editLog];
      }

      // Collect all collaborators enrolled in this session
      const matchedCollabs: Collaborator[] = [];
      sessionLogs.forEach(sLog => {
        const collab = collaborators.find(c => c.id === sLog.collaboratorId);
        if (collab) {
          if (!matchedCollabs.some(mc => mc.id === collab.id)) {
            matchedCollabs.push(collab);
          }
        } else {
          if (!matchedCollabs.some(mc => mc.id === sLog.collaboratorId)) {
            matchedCollabs.push({
              id: sLog.collaboratorId,
              firstName: sLog.collaboratorName.split(' ').slice(1).join(' ') || '',
              lastName: sLog.collaboratorName.split(' ')[0] || sLog.collaboratorName,
              email: '',
              escale: sLog.escale,
              service: sLog.service,
              hireDate: '',
              avatar: ''
            } as Collaborator);
          }
        }
      });

      setSelectedCollabs(matchedCollabs);
      setNumSession(editLog.numSession || '');
      setEscale(editLog.escale);
      setService(editLog.service);
      setModuleSearch(editLog.moduleName);
      setSelectedModule({
        id: 'temp',
        name: editLog.moduleName,
        formateur: editLog.formateur,
        type: editLog.type,
        cycle: editLog.cycle,
        escale: editLog.escale,
        service: editLog.service,
        visa: editLog.visa,
        resultat: editLog.resultat,
        consigne: editLog.consigne || 'N/A'
      });
      setCycle(editLog.cycle);
      setFormateur(editLog.formateur);
      setIdFormateur(editLog.idFormateur || '');
      setType(editLog.type);
      setDateDebut(normalizeDateToISO(editLog.dateDebut) || '');
      setDateFin(normalizeDateToISO(editLog.dateFin) || '');
      setHeureDebut1(editLog.heureDebut1 || '');
      setHeureFin1(editLog.heureFin1 || '');
      setHeureDebut2(editLog.heureDebut2 || '');
      setHeureFin2(editLog.heureFin2 || '');
      setMadEa(editLog.madEa || false);
      setCttHbo(editLog.cttHbo || false);
      setConvoc(editLog.convoc || false);
      setNotes(editLog.cleanNotes || editLog.notes || '');
      setResultat(editLog.resultat || 'En cours');
      setConsigne(editLog.consigne || 'N/A');
      setLieu(editLog.lieu || '');
    } else {
      // Reset Form on normal open (always start with an empty collaborator selection for session creation)
      setSelectedCollabs([]);
      setEscale('BOD');
      setService('PISTE');

      setCollabSearch('');
      setSelectedModule(null);
      setModuleSearch('');
      setNumSession(initialNumSession || '');
      setCycle('INI');
      setFormateur('Alyzia - Interne');
      setIdFormateur('');
      setType('Présentiel');
      setDateDebut(normalizeDateToISO(initialDate) || '');
      setDateFin(normalizeDateToISO(initialDate) || '');
      setHeureDebut1('');
      setHeureFin1('');
      setHeureDebut2('');
      setHeureFin2('');
      setMadEa(false);
      setCttHbo(false);
      setConvoc(false);
      setNotes('');
      setResultat('En cours');
      setConsigne('N/A');
      setLieu('');
    }
    setErrorMessage('');
  }, [editLog, isOpen, collaborators, preselectedCollaboratorId, initialDate, initialNumSession, trainingLogs]);

  // Filter collaborators based on search text
  const filteredCollabs = useMemo(() => {
    if (!collabSearch.trim()) return [];
    const query = collabSearch.toLowerCase();
    return collaborators.filter(c => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matricule = (c.matricule || '').toLowerCase();
      const escale = (c.escale || '').toLowerCase();
      const service = (c.service || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const email = (c.email || '').toLowerCase();

      return (
        fullName.includes(query) ||
        matricule.includes(query) ||
        escale.includes(query) ||
        service.includes(query) ||
        phone.includes(query) ||
        email.includes(query)
      );
    }).filter(c => !selectedCollabs.some(sc => sc.id === c.id)); // Exclude already selected
  }, [collaborators, collabSearch, selectedCollabs]);

  // Filter modules based on search text
  const filteredModules = useMemo(() => {
    const query = moduleSearch.toLowerCase();
    if (!query) return modulesCatalog.slice(0, 5); // Default list when empty
    return modulesCatalog.filter(m => m.name.toLowerCase().includes(query));
  }, [modulesCatalog, moduleSearch]);

  // Handle adding a collaborator
  const handleAddCollab = (collab: Collaborator) => {
    if (selectedCollabs.length >= 12) {
      setErrorMessage("Vous pouvez inscrire un maximum de 12 intérimaires en même temps.");
      return;
    }
    
    const updated = [...selectedCollabs, collab];
    setSelectedCollabs(updated);
    setCollabSearch('');
    setErrorMessage('');

    // Autofill escale and service from the first selected collaborator
    if (updated.length === 1) {
      if (updated[0].escale) {
        setEscale(updated[0].escale);
        setLieu('Escale de ' + updated[0].escale + ' - Salle de Formation Hubjob');
      }
      if (updated[0].service) setService(updated[0].service);
    }
  };

  // Handle removing a collaborator
  const handleRemoveCollab = (id: string) => {
    const updated = selectedCollabs.filter(c => c.id !== id);
    setSelectedCollabs(updated);
    
    // Update escale & service from new first agent if list is not empty
    if (updated.length > 0) {
      if (updated[0].escale) {
        setEscale(updated[0].escale);
        setLieu('Escale de ' + updated[0].escale + ' - Salle de Formation Hubjob');
      }
      if (updated[0].service) setService(updated[0].service);
    }
  };

  // Select module handler
  const handleSelectModule = (mod: TrainingModule) => {
    setSelectedModule(mod);
    setModuleSearch(mod.name);
    setShowModuleDropdown(false);
    
    // Pre-populate some defaults if the module has them
    if (mod.type) setType(mod.type);
    if (mod.cycle) setCycle(mod.cycle);
    if (mod.formateur) {
      // Handle fallback or exact match
      const matchingFormateur = FORMATEURS.find(f => f.toLowerCase() === mod.formateur.toLowerCase());
      if (matchingFormateur) {
        setFormateur(matchingFormateur);
      } else if (mod.formateur === 'Hubjob - Interne') {
        setFormateur('Alyzia - Interne');
      }
    }
  };

  // Calculate total duration in hours
  const calculatedDuration = useMemo(() => {
    if (!dateDebut || !dateFin) return 0;
    const d1 = new Date(dateDebut);
    const d2 = new Date(dateFin);
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

    const s1 = getSessionHours(heureDebut1, heureFin1);
    const s2 = getSessionHours(heureDebut2, heureFin2);
    const hoursPerDay = (s1 + s2) || 7; // Default to 7 if no times specified
    return hoursPerDay * days;
  }, [dateDebut, dateFin, heureDebut1, heureFin1, heureDebut2, heureFin2]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (selectedCollabs.length === 0) {
      setErrorMessage("Veuillez sélectionner au moins un intérimaire à inscrire.");
      return;
    }

    if (!selectedModule && !moduleSearch.trim()) {
      setErrorMessage("Veuillez sélectionner un module de formation dans le catalogue.");
      return;
    }

    if (!dateDebut || !dateFin) {
      setErrorMessage("Veuillez renseigner les dates de début et de fin de formation.");
      return;
    }

    const payload = {
      moduleName: selectedModule ? selectedModule.name : moduleSearch,
      formateur,
      type,
      cycle,
      escale,
      service,
      idFormateur,
      heureDebut1,
      heureFin1,
      heureDebut2,
      heureFin2,
      madEa,
      cttHbo,
      convoc,
      dateDebut,
      dateFin,
      notes,
      resultat,
      consigne,
      lieu,
      numSession: numSession.trim(),
      collaboratorIds: selectedCollabs.map(c => c.id)
    };

    if (editLog && onUpdateLog) {
      onUpdateLog(editLog.id, payload);
    } else {
      onRegister({
        collaboratorIds: selectedCollabs.map(c => c.id),
        ...payload
      });
    }

    // Reset Form & Close
    setSelectedCollabs([]);
    setCollabSearch('');
    setSelectedModule(null);
    setModuleSearch('');
    setIdFormateur('');
    setDateDebut('');
    setDateFin('');
    setHeureDebut1('');
    setHeureFin1('');
    setHeureDebut2('');
    setHeureFin2('');
    setMadEa(false);
    setCttHbo(false);
    setConvoc(false);
    setNotes('');
    setLieu('');
    setErrorMessage('');
    onClose();
  };

  // Specific list of formateurs requested by the user
  const formateursList = [
    'Aéroport',
    'Alyzia - Interne',
    'Butterfly Training',
    'CAMAS',
    'CDF Externe',
    'EA',
    'Pika Aéro'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in" id="enrollment-modal-overlay">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        id="enrollment-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="bg-[#0062FF]/10 text-[#0062FF] p-2 rounded-lg">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">
                {editLog ? "Modification de Session de Formation" : "Nouvelle Inscription de Formation"}
              </h2>
              <p className="text-xs text-slate-500">
                {editLog ? "Mettez à jour les détails de la formation pour l'ensemble des agents inscrits." : "Inscrivez jusqu'à 12 intérimaires simultanément."}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body - scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION 1: Collaborators search & display */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {editLog ? `1. Agent(s) Concerné(s) (${selectedCollabs.length})` : `1. Sélectionner les Intérimaires (${selectedCollabs.length}/12)`} <span className="text-rose-500">*</span>
            </label>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={collabSearch}
                onChange={(e) => setCollabSearch(e.target.value)}
                placeholder="Rechercher par nom, prénom, matricule, escale, service, téléphone, email..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0062FF]/50 bg-slate-50/50"
              />
              
              {/* Dropdown Suggestions */}
              {filteredCollabs.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto z-40 divide-y divide-slate-100">
                  {filteredCollabs.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleAddCollab(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-slate-900">{c.lastName.toUpperCase()} {c.firstName}</div>
                        {c.matricule && <span className="text-slate-400 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">M: {c.matricule}</span>}
                        {(() => {
                          const style = getEscaleStyle(c.escale);
                          return (
                            <span className={`${style.bg} ${style.text} ${style.border} text-[10px] font-bold px-1.5 py-0.5 rounded border`}>
                              {c.escale}
                            </span>
                          );
                        })()}
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">{c.service}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{c.phone || c.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Collaborators Grid */}
            {selectedCollabs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-150">
                {selectedCollabs.map(c => (
                  <div 
                    key={c.id} 
                    className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between shadow-2xs gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate text-xs">{c.lastName.toUpperCase()} {c.firstName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-semibold text-slate-500">
                        <span className="font-mono text-slate-400">{c.matricule || 'N/A'}</span>
                        <span>•</span>
                        {(() => {
                          const style = getEscaleStyle(c.escale);
                          return (
                            <span className={`${style.text} font-bold`}>{c.escale}</span>
                          );
                        })()}
                        <span>•</span>
                        <span className="text-slate-600">{c.service}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCollab(c.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-md transition-all shrink-0 cursor-pointer"
                      title="Retirer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-medium">
                Aucun intérimaire sélectionné pour l'instant. Utilisez la barre de recherche ci-dessus pour en ajouter.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Left Column Fields */}
            <div className="space-y-4">
              
              {/* N° de session */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>N° de Session</span>
                  <span className="text-[10px] text-slate-400 font-normal font-mono">Format: HBOYYYYMMNN</span>
                </label>
                <input
                  type="text"
                  value={numSession}
                  onChange={(e) => setNumSession(e.target.value)}
                  placeholder="Généré automatiquement (ex: HBO20260701)"
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30"
                />
              </div>

              {/* Lieu / Adresse */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-blue-600" /> Lieu / Adresse
                </label>
                <input
                  type="text"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  placeholder="Ex: Escale BOD - Salle de formation Hubjob"
                  className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Module Search */}
              <div className="space-y-1.5 relative">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Module de Formation <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={moduleSearch}
                    onChange={(e) => {
                      setModuleSearch(e.target.value);
                      setSelectedModule(null);
                      setShowModuleDropdown(true);
                    }}
                    onFocus={() => setShowModuleDropdown(true)}
                    placeholder="Saisir ou rechercher un module réglementaire, SST..."
                    className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  {moduleSearch && (
                    <button
                      type="button"
                      onClick={() => { setModuleSearch(''); setSelectedModule(null); }}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {showModuleDropdown && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-40 divide-y divide-slate-100">
                    {filteredModules.length > 0 ? (
                      filteredModules.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectModule(m)}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-xs transition-colors font-medium text-slate-700 block truncate"
                        >
                          {m.name} <span className="text-[10px] text-slate-400 font-normal">({m.cycle} • {m.type})</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3.5 py-2 text-xs text-slate-400 italic">
                        Aucun module exact trouvé. Saisissez librement pour créer.
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowModuleDropdown(false)}
                      className="w-full text-center bg-slate-50 hover:bg-slate-100 text-slate-500 py-1.5 text-[10px] font-bold"
                    >
                      Fermer la liste
                    </button>
                  </div>
                )}
              </div>

              {/* Cycle & Formateur */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Cycle
                  </label>
                  <select
                    value={cycle}
                    onChange={(e) => setCycle(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="INI">INI (Initial)</option>
                    <option value="PER">PER (Périodique)</option>
                    <option value="MDC">MDC (Maintien de compétences)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Formateur
                  </label>
                  <select
                    value={formateur}
                    onChange={(e) => setFormateur(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {formateursList.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Formateur ID & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    ID du Formateur
                  </label>
                  <input
                    type="text"
                    value={idFormateur}
                    onChange={(e) => setIdFormateur(e.target.value)}
                    placeholder="Ex: FORM-2026-X"
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Type de Formation
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Présentiel">Présentiel</option>
                    <option value="E-learning">E-learning</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Right Column Fields */}
            <div className="space-y-4">
              
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" /> Date de Début <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" /> Date de Fin <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Heures Session 1 */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-150">
                <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" /> Horaires Session 1
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Heure de début 1</label>
                  <input
                    type="time"
                    value={heureDebut1}
                    onChange={(e) => setHeureDebut1(e.target.value)}
                    className="w-full py-1.5 px-2 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Heure de fin 1</label>
                  <input
                    type="time"
                    value={heureFin1}
                    onChange={(e) => setHeureFin1(e.target.value)}
                    className="w-full py-1.5 px-2 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Heures Session 2 */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-150">
                <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" /> Horaires Session 2
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Heure de début 2</label>
                  <input
                    type="time"
                    value={heureDebut2}
                    onChange={(e) => setHeureDebut2(e.target.value)}
                    className="w-full py-1.5 px-2 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Heure de fin 2</label>
                  <input
                    type="time"
                    value={heureFin2}
                    onChange={(e) => setHeureFin2(e.target.value)}
                    className="w-full py-1.5 px-2 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Durée de la formation */}
              <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
                  <div>
                    <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Durée Totale de Formation</span>
                    <span className="text-[10px] text-slate-500">Calcul automatique en heures</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-blue-700">{calculatedDuration} h</span>
                </div>
              </div>

              {/* Three Checkboxes */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Options & Statuts
                </label>
                
                <div className="grid grid-cols-3 gap-2">
                  {/* Checkbox 1: MAD EA */}
                  <label className={`flex items-center justify-between p-2.5 border rounded-xl cursor-pointer transition-all ${
                    madEa ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={madEa}
                        onChange={(e) => setMadEa(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`h-4 w-4 border rounded flex items-center justify-center transition-all ${
                        madEa ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {madEa && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs">MAD EA</span>
                    </div>
                  </label>

                  {/* Checkbox 2: CTT HBO */}
                  <label className={`flex items-center justify-between p-2.5 border rounded-xl cursor-pointer transition-all ${
                    cttHbo ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={cttHbo}
                        onChange={(e) => setCttHbo(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`h-4 w-4 border rounded flex items-center justify-center transition-all ${
                        cttHbo ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {cttHbo && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs">CTT HBO</span>
                    </div>
                  </label>

                  {/* Checkbox 3: CONVOC */}
                  <label className={`flex items-center justify-between p-2.5 border rounded-xl cursor-pointer transition-all ${
                    convoc ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={convoc}
                        onChange={(e) => setConvoc(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`h-4 w-4 border rounded flex items-center justify-center transition-all ${
                        convoc ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {convoc && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs">CONVOC</span>
                    </div>
                  </label>
                </div>

              </div>

            </div>

          </div>

          {/* Notes / Commentaires */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Notes / Commentaires (texte libre)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Saisissez des commentaires ou remarques facultatives concernant cette inscription (ex: niveau, sessions spécifiques, consignes de paye...)"
              className="w-full min-h-[80px] p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-y"
              rows={3}
            />
          </div>

          {/* Résultat & Consigne */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Résultat
              </label>
              <select
                value={resultat}
                onChange={(e) => setResultat(e.target.value)}
                className="w-full py-2.5 px-3 border border-slate-200 bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
              >
                {RESULTATS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Consigne de paye
              </label>
              <select
                value={consigne}
                onChange={(e) => setConsigne(e.target.value)}
                className="w-full py-2.5 px-3 border border-slate-200 bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
              >
                {CONSIGNES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#0062FF] hover:bg-[#0062FF]/90 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-[#0062FF]/10 hover:shadow-[#0062FF]/20 cursor-pointer"
          >
            {editLog ? "Enregistrer les modifications" : `Enregistrer l'inscription (${selectedCollabs.length} agent${selectedCollabs.length > 1 ? 's' : ''})`}
          </button>
        </div>

      </div>
    </div>
  );
}
