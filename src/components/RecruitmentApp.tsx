import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Search, 
  Plus, 
  UserPlus, 
  Calendar, 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  Trash2, 
  Car, 
  Moon, 
  GraduationCap, 
  Mail, 
  FileText, 
  FileSpreadsheet, 
  CreditCard, 
  BookOpen, 
  ShieldCheck, 
  Phone, 
  Briefcase, 
  Building2, 
  Archive,
  RotateCcw,
  Sparkles,
  ChevronRight,
  RotateCw
} from 'lucide-react';
import { 
  Collaborator, 
  RecruitmentRecord, 
  RecruitmentChecklist, 
  IntegrationChecklistValue, 
  RecruitmentStatus 
} from '../types';
import { ESCALES, SERVICES } from '../data/modulesData';
import { DEFAULT_CHECKLIST } from '../data/defaultRecruitments';
import { formatDateFR, formatDateDMY } from '../utils/dateUtils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface RecruitmentAppProps {
  collaborators: Collaborator[];
  recruitments: RecruitmentRecord[];
  onAddCollaborator: (collabData: Omit<Collaborator, 'id'>) => Promise<Collaborator | null> | Collaborator | null;
  onAddRecruitment: (recruitmentData: Omit<RecruitmentRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateRecruitment: (recruitmentId: string, updates: Partial<RecruitmentRecord>) => void;
  onDeleteRecruitment: (recruitmentId: string) => void;
  onUpdateCollaborator?: (collab: Collaborator) => void;
  onViewCollaboratorProfile?: (collabId: string) => void;
  isReadOnly?: boolean;
}

const CHECKLIST_FIELDS: Array<{
  key: keyof RecruitmentChecklist;
  label: string;
  icon: React.ElementType;
}> = [
  { key: 'vehicule', label: 'Véhicule', icon: Car },
  { key: 'horaireDecale', label: 'Horaire décalé', icon: Moon },
  { key: 'controleDossierFormation', label: 'Contrôle dossier formation', icon: GraduationCap },
  { key: 'mailInscription', label: "Mail d'inscription", icon: Mail },
  { key: 'ficheHbo', label: 'Fiche HBO', icon: FileText },
  { key: 'fichePlanete', label: 'Fiche Planète', icon: FileSpreadsheet },
  { key: 'demandeTca', label: 'Demande TCA', icon: CreditCard },
  { key: 'commandeFormation', label: 'Commande formation', icon: BookOpen },
  { key: 'envoiLivretAccueil', label: "Envoi livret d'accueil", icon: ShieldCheck },
  { key: 'miseAuxNormesDossierRh', label: 'Mise aux normes dossier RH', icon: ShieldCheck },
];

export default function RecruitmentApp({
  collaborators,
  recruitments,
  onAddCollaborator,
  onAddRecruitment,
  onUpdateRecruitment,
  onDeleteRecruitment,
  onUpdateCollaborator,
  onViewCollaboratorProfile,
  isReadOnly = false
}: RecruitmentAppProps) {
  // Tabs: 'active' (En cours) or 'archived' (Mise en poste / Annulés)
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Track expanded cards (default is empty = all collapsed)
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  const toggleCardExpansion = (recId: string) => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(recId)) {
        next.delete(recId);
      } else {
        next.add(recId);
      }
      return next;
    });
  };

  // Search in Collaborators to add to Recruitment
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  // New Collaborator Modal State
  const [isNewCollabModalOpen, setIsNewCollabModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newCollabData, setNewCollabData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    escale: ESCALES[0] || 'BOD',
    service: SERVICES[0] || 'PISTE',
    poste: '',
    coefficient: '',
    matricule: ''
  });

  // Modal for delete confirmation
  const [recruitmentToDelete, setRecruitmentToDelete] = useState<RecruitmentRecord | null>(null);

  // States for "Mise en poste" confirmation and collaborator editing workflow
  const [activeTransitionRecruitment, setActiveTransitionRecruitment] = useState<RecruitmentRecord | null>(null);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [showEditCollabModalForTransition, setShowEditCollabModalForTransition] = useState(false);
  const [collabEditFormData, setCollabEditFormData] = useState<Collaborator | null>(null);

  // Triggered when clicking "Mise en poste"
  const handleTriggerMiseEnPoste = (rec: RecruitmentRecord) => {
    if (isReadOnly) return;
    setActiveTransitionRecruitment(rec);
    setShowTransitionModal(true);
  };

  // Option "Oui": prefill collaborator and show edit form modal
  const handleTransitionOptionOui = () => {
    if (!activeTransitionRecruitment) return;
    const collab = collaborators.find(c => c.id === activeTransitionRecruitment.collaboratorId);
    if (collab) {
      setCollabEditFormData({ ...collab });
    } else {
      setCollabEditFormData({
        id: activeTransitionRecruitment.collaboratorId || '',
        firstName: activeTransitionRecruitment.collaboratorName?.split(' ')[0] || '',
        lastName: activeTransitionRecruitment.collaboratorName?.split(' ').slice(1).join(' ') || '',
        email: '',
        phone: '',
        escale: 'BOD',
        service: 'PISTE',
        poste: '',
        coefficient: '',
        matricule: '',
        avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`
      });
    }
    setShowTransitionModal(false);
    setShowEditCollabModalForTransition(true);
  };

  // Option "Non": update recruitment to "mise_en_poste" directly
  const handleTransitionOptionNon = () => {
    if (!activeTransitionRecruitment) return;
    handleStatusChange(activeTransitionRecruitment, 'mise_en_poste');
    setShowTransitionModal(false);
    setActiveTransitionRecruitment(null);
  };

  // Save edit form modal and then update recruitment to "mise_en_poste"
  const handleSaveCollabAndFinalizeTransition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTransitionRecruitment || !collabEditFormData) return;
    
    // Call the parent update function
    if (onUpdateCollaborator) {
      onUpdateCollaborator(collabEditFormData);
    }
    
    // Progress recruitment status to mise_en_poste
    handleStatusChange(activeTransitionRecruitment, 'mise_en_poste');
    
    setShowEditCollabModalForTransition(false);
    setActiveTransitionRecruitment(null);
    setCollabEditFormData(null);
  };

  // Local state for notification / toast banner
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered recruitments
  const activeRecruitments = useMemo(() => {
    return recruitments.filter(r => r.status === 'en_cours');
  }, [recruitments]);

  const archivedRecruitments = useMemo(() => {
    return recruitments.filter(r => r.status === 'mise_en_poste' || r.status === 'annule');
  }, [recruitments]);

  // Collaborator search results
  const matchingCollaborators = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return collaborators
      .filter(c => {
        const full1 = `${c.firstName} ${c.lastName}`.toLowerCase();
        const full2 = `${c.lastName} ${c.firstName}`.toLowerCase();
        const mat = (c.matricule || '').toLowerCase();
        const poste = (c.poste || '').toLowerCase();
        const esc = (c.escale || '').toLowerCase();
        return full1.includes(q) || full2.includes(q) || mat.includes(q) || poste.includes(q) || esc.includes(q);
      })
      .slice(0, 8);
  }, [collaborators, searchQuery]);

  // Handle select an existing collaborator to start recruitment
  const handleSelectCollaboratorForRecruitment = (collab: Collaborator) => {
    setIsSearchDropdownOpen(false);
    setSearchQuery('');

    // Check if collaborator already has an active recruitment
    const existing = recruitments.find(r => r.collaboratorId === collab.id && r.status === 'en_cours');
    if (existing) {
      showToast(`Une fiche de recrutement en cours existe déjà pour ${collab.firstName} ${collab.lastName}.`, 'info');
      setActiveTab('active');
      return;
    }

    const newRecordData: Omit<RecruitmentRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      collaboratorId: collab.id,
      collaboratorName: `${collab.firstName} ${collab.lastName.toUpperCase()}`,
      recruteur: '',
      dateEntretien: '',
      dateIntegrationPrevue: '',
      checklist: { ...DEFAULT_CHECKLIST },
      commentaires: '',
      status: 'en_cours'
    };

    onAddRecruitment(newRecordData);
    setActiveTab('active');
    showToast(`Fiche de recrutement créée pour ${collab.firstName} ${collab.lastName}.`, 'success');
  };

  // Handle create new collaborator + start recruitment
  const handleCreateNewCollaboratorAndRecruit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollabData.firstName.trim() || !newCollabData.lastName.trim()) {
      setFormError('Veuillez renseigner au moins le prénom et le nom.');
      return;
    }
    setFormError(null);

    const createdCollab = await onAddCollaborator({
      firstName: newCollabData.firstName.trim(),
      lastName: newCollabData.lastName.trim().toUpperCase(),
      email: newCollabData.email.trim(),
      phone: newCollabData.phone.trim(),
      escale: newCollabData.escale,
      service: newCollabData.service,
      poste: newCollabData.poste.trim(),
      coefficient: newCollabData.coefficient.trim(),
      matricule: newCollabData.matricule.trim()
    });

    if (createdCollab) {
      const newRecordData: Omit<RecruitmentRecord, 'id' | 'createdAt' | 'updatedAt'> = {
        collaboratorId: createdCollab.id,
        collaboratorName: `${createdCollab.firstName} ${createdCollab.lastName.toUpperCase()}`,
        recruteur: '',
        dateEntretien: '',
        dateIntegrationPrevue: '',
        checklist: { ...DEFAULT_CHECKLIST },
        commentaires: '',
        status: 'en_cours'
      };

      onAddRecruitment(newRecordData);
      setIsNewCollabModalOpen(false);
      setNewCollabData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        escale: ESCALES[0] || 'BOD',
        service: SERVICES[0] || 'PISTE',
        poste: '',
        coefficient: '',
        matricule: ''
      });
      setActiveTab('active');
      showToast(`Intérimaire ${createdCollab.firstName} ${createdCollab.lastName} ajouté et fiche de recrutement ouverte !`, 'success');
    }
  };

  // Helper to change checklist item
  const handleChecklistChange = (recId: string, currentChecklist: RecruitmentChecklist, key: keyof RecruitmentChecklist, val: IntegrationChecklistValue) => {
    if (isReadOnly) return;
    const updated = {
      ...currentChecklist,
      [key]: val
    };
    onUpdateRecruitment(recId, { checklist: updated });
  };

  // Helper to mark all checklist as 'Oui'
  const handleSetAllChecklistOui = (recId: string) => {
    if (isReadOnly) return;
    const allOui: RecruitmentChecklist = {
      vehicule: 'Oui',
      horaireDecale: 'Oui',
      controleDossierFormation: 'Oui',
      mailInscription: 'Oui',
      ficheHbo: 'Oui',
      fichePlanete: 'Oui',
      demandeTca: 'Oui',
      commandeFormation: 'Oui',
      envoiLivretAccueil: 'Oui',
      miseAuxNormesDossierRh: 'Oui'
    };
    onUpdateRecruitment(recId, { checklist: allOui });
    showToast('Toutes les étapes ont été cochées en "Oui".', 'info');
  };

  // Helper to reset all checklist as 'N/A'
  const handleResetAllChecklistNA = (recId: string) => {
    if (isReadOnly) return;
    onUpdateRecruitment(recId, { checklist: { ...DEFAULT_CHECKLIST } });
    showToast('Toutes les étapes ont été réinitialisées en "N/A".', 'info');
  };

  // Helper to change status (Mise en poste, En cours, Annulé) - Direct & Reliable without window.confirm
  const handleStatusChange = (rec: RecruitmentRecord, newStatus: RecruitmentStatus) => {
    if (isReadOnly) return;

    if (newStatus === 'mise_en_poste') {
      onUpdateRecruitment(rec.id, {
        status: 'mise_en_poste',
        archivedAt: new Date().toISOString()
      });
      showToast(`🎉 Recrutement validé ! Dossier archivé dans la fiche de ${rec.collaboratorName || 'l’intérimaire'}.`, 'success');
    } else if (newStatus === 'annule') {
      onUpdateRecruitment(rec.id, {
        status: 'annule',
        archivedAt: new Date().toISOString()
      });
      showToast(`Recrutement annulé et consigné dans la fiche de ${rec.collaboratorName || 'l’intérimaire'}.`, 'warning');
    } else {
      // Re-open to En cours
      onUpdateRecruitment(rec.id, {
        status: 'en_cours',
        archivedAt: undefined
      });
      showToast(`Fiche de recrutement réouverte en statut "En cours".`, 'info');
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-16" id="recruitment-app-container">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs sm:text-sm font-semibold shadow-md transition-all animate-fade-in ${
          toastMessage.type === 'success' ? 'bg-emerald-600 text-white' :
          toastMessage.type === 'warning' ? 'bg-rose-600 text-white' :
          'bg-blue-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Bandeau Titre Principal */}
      <div 
        className="bg-gradient-to-r from-[#061d43] via-[#0d2e6b] to-[#7c3aed] rounded-2xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden"
        id="recruitment-header-banner"
      >
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-xl backdrop-blur-xs flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Recrutement
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30">
                Parcours d'intégration
              </span>
            </div>
            <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed font-normal">
              Pilotez les recrutements actifs, validez chaque étape d'intégration en 10 points et archivez automatiquement les parcours d'accueil dans la Base Intérimaires.
            </p>
          </div>

          {/* Quick Metrics Pills */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-2 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-amber-300 block">En cours</span>
              <span className="text-lg font-black text-white">{activeRecruitments.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-2 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Mise en poste</span>
              <span className="text-lg font-black text-white">
                {recruitments.filter(r => r.status === 'mise_en_poste').length}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-2 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-rose-300 block">Annulés</span>
              <span className="text-lg font-black text-white">
                {recruitments.filter(r => r.status === 'annule').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Barre d'action & Recherche / Création */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Recherche d'un intérimaire existant */}
          <div className="relative flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => setIsSearchDropdownOpen(true)}
                placeholder="Sélectionner un intérimaire existant (Nom, prénom, matricule, escale)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all"
                id="search-collaborator-for-recruitment-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown suggestions */}
            {isSearchDropdownOpen && matchingCollaborators.length > 0 && (
              <div 
                className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto animate-fade-in"
                id="recruitment-search-dropdown"
              >
                <div className="p-2 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Intérimaires trouvés ({matchingCollaborators.length})
                </div>
                {matchingCollaborators.map(c => {
                  const hasActive = recruitments.some(r => r.collaboratorId === c.id && r.status === 'en_cours');
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCollaboratorForRecruitment(c)}
                      className="w-full p-3 text-left hover:bg-purple-50/60 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-purple-700">
                            {c.firstName} {c.lastName.toUpperCase()}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-[10px] font-bold font-mono text-slate-700 rounded">
                            {c.escale}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium truncate">
                            {c.service} {c.poste ? `• ${c.poste}` : ''}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {c.matricule ? `Matricule: ${c.matricule}` : 'Sans matricule'} {c.phone ? `• ${c.phone}` : ''}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {hasActive ? (
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> En cours
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-600 group-hover:bg-purple-700 text-white flex items-center gap-1 shadow-2xs">
                            <Plus className="h-3.5 w-3.5" /> Ouvrir fiche
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {isSearchDropdownOpen && searchQuery.trim() && matchingCollaborators.length === 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-4 text-center text-xs text-slate-500">
                Aucun intérimaire trouvé correspondant à "{searchQuery}". Vous pouvez en créer un nouveau avec le bouton ci-contre.
              </div>
            )}
          </div>

          {/* Bouton + Nouveau Intérimaire & Tab Switcher */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            
            {/* Tab switch : En cours vs Archivés */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'active'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span>En cours ({activeRecruitments.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('archived')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'archived'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Archive className="h-3.5 w-3.5 text-purple-600" />
                <span>Archivés ({archivedRecruitments.length})</span>
              </button>
            </div>

            {/* Bouton + Nouveau */}
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setIsNewCollabModalOpen(true)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 shrink-0"
                id="recruitment-add-new-btn"
              >
                <UserPlus className="h-4 w-4" />
                <span>+ Nouveau</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Liste verticale des cartes de recrutement */}
      <div className="space-y-5" id="recruitment-cards-list">
        
        {/* VUE ACTIFS (EN COURS) */}
        {activeTab === 'active' && (
          <>
            {activeRecruitments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
                <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto border border-purple-100">
                  <UserCheck className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">Aucun recrutement en cours</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Sélectionnez un intérimaire existant dans la barre de recherche ci-dessus ou cliquez sur <strong>"+ Nouveau"</strong> pour démarrer un parcours d'intégration.
                  </p>
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setIsNewCollabModalOpen(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Créer un nouveau recrutement
                  </button>
                )}
              </div>
            ) : (
              activeRecruitments.map(rec => {
                const collab = collaborators.find(c => c.id === rec.collaboratorId);
                const displayName = collab ? `${collab.firstName} ${collab.lastName.toUpperCase()}` : (rec.collaboratorName || 'Collaborateur');
                const escale = collab?.escale || 'BOD';
                const service = collab?.service || 'PISTE';
                const poste = collab?.poste || 'Non renseigné';
                const phone = collab?.phone;
                const email = collab?.email;
                const matricule = collab?.matricule;

                // Count Oui, Non, N/A
                const checkValues = Object.values(rec.checklist);
                const countOui = checkValues.filter(v => v === 'Oui').length;
                const countTotal = CHECKLIST_FIELDS.length;
                const percentDone = Math.round((countOui / countTotal) * 100);
                const isExpanded = expandedCardIds.has(rec.id);

                return (
                  <div 
                    key={rec.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all hover:border-purple-300"
                    id={`recruitment-card-${rec.id}`}
                  >
                    {/* Bandeau noir d'information de l'agent (Cliquable pour afficher / masquer les détails) */}
                    <div 
                      onClick={() => toggleCardExpansion(rec.id)}
                      className="bg-slate-900 hover:bg-slate-850 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 cursor-pointer select-none transition-colors"
                      title={isExpanded ? "Cliquer pour masquer les détails" : "Cliquer pour afficher les détails du recrutement"}
                    >
                      
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Statut : Rond et Icône du statut en cours */}
                        <div 
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-xs transition-transform ${
                            rec.status === 'mise_en_poste' 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                              : rec.status === 'annule'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          }`}
                          title={
                            rec.status === 'mise_en_poste' ? 'Statut : Mise en poste' :
                            rec.status === 'annule' ? 'Statut : Annulé' :
                            'Statut : En cours'
                          }
                        >
                          {rec.status === 'mise_en_poste' ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : rec.status === 'annule' ? (
                            <XCircle className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>

                        {/* Identité & Métier */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-black text-white tracking-tight truncate">
                              {displayName}
                            </h3>
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-md font-mono font-bold text-xs">
                              {escale}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md font-semibold text-xs">
                              {service}
                            </span>
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-md font-semibold text-xs">
                              {poste}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                            {matricule && <span>Matricule: <strong className="text-slate-200 font-mono">{matricule}</strong></span>}
                            {phone && (
                              <span className="flex items-center gap-1 text-slate-300">
                                <Phone className="h-3 w-3 text-emerald-400" /> {phone}
                              </span>
                            )}
                            {email && (
                              <span className="flex items-center gap-1 text-slate-300">
                                <Mail className="h-3 w-3 text-blue-400" /> {email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Progression, Actions & Chevron de déploiement */}
                      <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
                        <div className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-xl flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 font-bold block uppercase leading-tight">Conformité</span>
                            <span className="text-[11px] font-black text-emerald-400 font-mono leading-tight">{countOui}/{countTotal} ({percentDone}%)</span>
                          </div>
                          <div className="w-8 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${percentDone}%` }} />
                          </div>
                        </div>

                        {onViewCollaboratorProfile && collab && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewCollaboratorProfile(collab.id);
                            }}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
                            title="Voir la fiche complète dans la Base Intérimaires"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        )}

                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRecruitmentToDelete(rec);
                            }}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white rounded-xl border border-rose-500/30 transition-colors cursor-pointer"
                            title="Supprimer cette fiche de recrutement"
                            id={`recruitment-delete-btn-${rec.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                        {/* Chevron Indicateur Déploiement */}
                        <div className="p-2 bg-slate-800 text-slate-300 rounded-xl border border-slate-700">
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-purple-400' : 'text-slate-400'}`} />
                        </div>
                      </div>
                    </div>

                    {/* Corps de la carte (Déployé uniquement si isExpanded est true) */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-4 border-t border-slate-100 bg-white">
                        
                        {/* B. Informations du Recrutement (Recruteur, Date Entretien, Date Intégration) */}
                        <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                              Recruteur
                            </label>
                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={rec.recruteur}
                              onChange={(e) => onUpdateRecruitment(rec.id, { recruteur: e.target.value })}
                              placeholder="Nom du chargé de recrutement..."
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:border-[#0062FF] focus:outline-hidden disabled:bg-slate-100"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-purple-600" /> Date de l'entretien
                            </label>
                            <input
                              type="date"
                              disabled={isReadOnly}
                              value={rec.dateEntretien || ''}
                              onChange={(e) => onUpdateRecruitment(rec.id, { dateEntretien: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:border-[#0062FF] focus:outline-hidden disabled:bg-slate-100"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase tracking-wider flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-emerald-600" /> Date d'intégration prévue
                            </label>
                            <input
                              type="date"
                              disabled={isReadOnly}
                              value={rec.dateIntegrationPrevue || ''}
                              onChange={(e) => onUpdateRecruitment(rec.id, { dateIntegrationPrevue: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:border-[#0062FF] focus:outline-hidden disabled:bg-slate-100"
                            />
                          </div>
                        </div>

                        {/* C. Checklist d'intégration (4 colonnes par ligne, sans sous-titres, compact) */}
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                              Checklist d'intégration & Conformité ({CHECKLIST_FIELDS.length} critères)
                            </h4>

                            {!isReadOnly && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleSetAllChecklistOui(rec.id)}
                                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                                  title="Cocher toutes les étapes en 'Oui'"
                                >
                                  <Check className="h-3 w-3" /> Tout cocher Oui
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResetAllChecklistNA(rec.id)}
                                  className="text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                                  title="Réinitialiser toutes les étapes en 'N/A'"
                                >
                                  <RotateCw className="h-3 w-3" /> Tout en N/A
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Grille 4 par ligne */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            {CHECKLIST_FIELDS.map(field => {
                              const Icon = field.icon;
                              const currentVal: IntegrationChecklistValue = rec.checklist[field.key] || 'N/A';

                              return (
                                <div 
                                  key={field.key}
                                  className={`p-2 rounded-lg border transition-all flex flex-col justify-between gap-1.5 ${
                                    currentVal === 'Oui' ? 'bg-emerald-50/50 border-emerald-200' :
                                    currentVal === 'Non' ? 'bg-rose-50/50 border-rose-200' :
                                    'bg-slate-50/80 border-slate-200/80 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div className={`p-1 rounded shrink-0 ${
                                      currentVal === 'Oui' ? 'bg-emerald-100 text-emerald-700' :
                                      currentVal === 'Non' ? 'bg-rose-100 text-rose-700' :
                                      'bg-slate-200 text-slate-600'
                                    }`}>
                                      <Icon className="h-3 w-3" />
                                    </div>
                                    <div className="font-bold text-[11px] text-slate-900 truncate" title={field.label}>
                                      {field.label}
                                    </div>
                                  </div>

                                  {/* 3-Choice Buttons */}
                                  <div className="grid grid-cols-3 gap-1 bg-white p-0.5 rounded border border-slate-200">
                                    <button
                                      type="button"
                                      disabled={isReadOnly}
                                      onClick={() => handleChecklistChange(rec.id, rec.checklist, field.key, 'Oui')}
                                      className={`py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
                                        currentVal === 'Oui'
                                          ? 'bg-emerald-600 text-white shadow-2xs'
                                          : 'text-slate-600 hover:bg-slate-100'
                                      }`}
                                    >
                                      <Check className="h-2.5 w-2.5" /> Oui
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isReadOnly}
                                      onClick={() => handleChecklistChange(rec.id, rec.checklist, field.key, 'Non')}
                                      className={`py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
                                        currentVal === 'Non'
                                          ? 'bg-rose-600 text-white shadow-2xs'
                                          : 'text-slate-600 hover:bg-slate-100'
                                      }`}
                                    >
                                      <X className="h-2.5 w-2.5" /> Non
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isReadOnly}
                                      onClick={() => handleChecklistChange(rec.id, rec.checklist, field.key, 'N/A')}
                                      className={`py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center justify-center ${
                                        currentVal === 'N/A'
                                          ? 'bg-slate-700 text-white shadow-2xs'
                                          : 'text-slate-500 hover:bg-slate-100'
                                      }`}
                                    >
                                      N/A
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* D. Zone de Commentaires & Notes d'entretien */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">
                            Commentaires & Compte-rendu d'entretien
                          </label>
                          <textarea
                            disabled={isReadOnly}
                            rows={2}
                            value={rec.commentaires}
                            onChange={(e) => onUpdateRecruitment(rec.id, { commentaires: e.target.value })}
                            placeholder="Saisissez ici vos observations, points d'attention, aptitudes ou pièces en attente pour ce candidat..."
                            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all disabled:bg-slate-100"
                          />
                        </div>

                        {/* E. Boutons de Statut / Action en fin de carte */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                          <div className="text-[11px] text-slate-400 italic">
                            Changement de statut instantané avec archivage automatique.
                          </div>

                          {!isReadOnly && (
                            <div className="flex items-center gap-2 flex-wrap">
                              
                              {/* 1. Bouton Coche Verte ("Mise en poste") */}
                              <button
                                type="button"
                                onClick={() => handleTriggerMiseEnPoste(rec)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 ${
                                  rec.status === 'mise_en_poste'
                                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 ring-offset-1'
                                    : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300'
                                }`}
                                title="Valider la mise en poste et archiver"
                                id={`recruitment-btn-validate-${rec.id}`}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Mise en poste</span>
                              </button>

                              {/* 2. Bouton Horloge Orange ("En cours") */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(rec, 'en_cours')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 ${
                                  rec.status === 'en_cours'
                                    ? 'bg-amber-500 text-white ring-2 ring-amber-300 ring-offset-1'
                                    : 'bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white border border-amber-300'
                                }`}
                                title="Maintenir ou remettre en cours"
                                id={`recruitment-btn-pending-${rec.id}`}
                              >
                                <Clock className="h-4 w-4" />
                                <span>En cours</span>
                              </button>

                              {/* 3. Bouton Croix Rouge ("Annulé") */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(rec, 'annule')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 ${
                                  rec.status === 'annule'
                                    ? 'bg-rose-600 text-white ring-2 ring-rose-400 ring-offset-1'
                                    : 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-300'
                                }`}
                                title="Annuler le recrutement et archiver"
                                id={`recruitment-btn-cancel-${rec.id}`}
                              >
                                <XCircle className="h-4 w-4" />
                                <span>Annuler</span>
                              </button>

                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {/* VUE ARCHIVES (MIS EN POSTE / ANNULÉS) */}
        {activeTab === 'archived' && (
          <>
            {archivedRecruitments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 text-xs sm:text-sm space-y-2">
                <Archive className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="font-bold text-slate-700">Aucun recrutement archivé pour l'instant.</p>
                <p className="text-slate-400 text-xs">
                  Lorsque vous validerez une "Mise en poste" ou marquerez un recrutement comme "Annulé", il apparaîtra ici et sera consultable dans la fiche de l'intérimaire.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center justify-between">
                  <span>
                    Ces dossiers sont archivés et synchronisés dans la section <strong>"3. Parcours d'Accueil & Suivi d'Intégration"</strong> de la Base Intérimaires.
                  </span>
                  <span className="font-bold">{archivedRecruitments.length} dossier(s)</span>
                </div>

                {archivedRecruitments.map(rec => {
                  const collab = collaborators.find(c => c.id === rec.collaboratorId);
                  const isMiseEnPoste = rec.status === 'mise_en_poste';
                  const isExpanded = expandedCardIds.has(rec.id);

                  return (
                    <div 
                      key={rec.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-purple-300"
                    >
                      {/* Bandeau noir / sombre pour archives */}
                      <div 
                        onClick={() => toggleCardExpansion(rec.id)}
                        className="bg-slate-900 hover:bg-slate-850 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                        title={isExpanded ? "Cliquer pour masquer les détails" : "Cliquer pour afficher les détails"}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-xs ${
                            isMiseEnPoste 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          }`}>
                            {isMiseEnPoste ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-white text-base">
                                {collab ? `${collab.firstName} ${collab.lastName.toUpperCase()}` : (rec.collaboratorName || 'Collaborateur')}
                              </h4>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isMiseEnPoste ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                              }`}>
                                {isMiseEnPoste ? 'Mise en poste validée' : 'Recrutement Annulé'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {collab?.escale} • {collab?.service} {collab?.poste ? `• ${collab.poste}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                          {!isReadOnly && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(rec, 'en_cours');
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                title="Réouvrir le recrutement en statut actif 'En cours'"
                              >
                                <RotateCcw className="h-3 w-3" /> Réouvrir
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRecruitmentToDelete(rec);
                                }}
                                className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer définitivement ce dossier"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}

                          <div className="p-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-purple-400' : 'text-slate-400'}`} />
                          </div>
                        </div>
                      </div>

                      {/* Détail Archives déployé */}
                      {isExpanded && (
                        <div className="p-4 sm:p-5 space-y-4 bg-white border-t border-slate-100">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Recruteur</span>
                              <span className="font-semibold text-slate-800">{rec.recruteur || 'Non renseigné'}</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Date entretien</span>
                              <span className="font-semibold text-slate-800">{formatDateDMY(rec.dateEntretien)}</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Intégration</span>
                              <span className="font-semibold text-slate-800">{formatDateDMY(rec.dateIntegrationPrevue)}</span>
                            </div>
                          </div>

                          {/* Résumé Checklist (4 colonnes) */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-600 block uppercase">Conformité Checklist ({CHECKLIST_FIELDS.length} critères)</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                              {CHECKLIST_FIELDS.map(f => {
                                const val = rec.checklist[f.key] || 'N/A';
                                return (
                                  <div key={f.key} className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                                    <span className="text-slate-700 text-[11px] truncate">{f.label}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      val === 'Oui' ? 'bg-emerald-100 text-emerald-800' :
                                      val === 'Non' ? 'bg-rose-100 text-rose-800' :
                                      'bg-slate-200 text-slate-700'
                                    }`}>
                                      {val}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {rec.commentaires && (
                            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl italic border border-slate-200/60">
                              « {rec.commentaires} »
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>

      {/* MODAL: Nouveau Collaborateur / Intérimaire */}
      {isNewCollabModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 pt-8 sm:pt-12 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Nouvel Intérimaire & Recrutement</h3>
                  <p className="text-xs text-slate-500">Ajout à la base intérimaires et ouverture directe du parcours</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewCollabModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateNewCollaboratorAndRecruit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Prénom <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCollabData.firstName}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="ex: Alexandre"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0062FF] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nom <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCollabData.lastName}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="ex: DUPONT"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0062FF] focus:outline-hidden uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Matricule Anael
                  </label>
                  <input
                    type="text"
                    value={newCollabData.matricule}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, matricule: e.target.value }))}
                    placeholder="ex: 123456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0062FF] focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    value={newCollabData.phone}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="ex: 06 12 34 56 78"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0062FF] focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={newCollabData.email}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="ex: prenom.nom@email.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0062FF] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Escale
                  </label>
                  <select
                    value={newCollabData.escale}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, escale: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:border-[#0062FF] focus:outline-hidden"
                  >
                    {ESCALES.map(esc => (
                      <option key={esc} value={esc}>{esc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Service
                  </label>
                  <select
                    value={newCollabData.service}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, service: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:border-[#0062FF] focus:outline-hidden"
                  >
                    {SERVICES.map(srv => (
                      <option key={srv} value={srv}>{srv}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Poste / Métier
                  </label>
                  <input
                    type="text"
                    value={newCollabData.poste}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, poste: e.target.value }))}
                    placeholder="ex: Agent de piste / Bagagiste"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0062FF] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Coefficient
                  </label>
                  <input
                    type="text"
                    value={newCollabData.coefficient}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, coefficient: e.target.value }))}
                    placeholder="ex: 180"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:border-[#0062FF] focus:outline-hidden font-mono"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCollabModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="h-4 w-4" />
                  Créer et Lancer le Recrutement
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL: Confirmation de Suppression d'une fiche de recrutement */}
      {recruitmentToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 pt-12 sm:pt-16 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Supprimer la fiche de recrutement</h3>
                <p className="text-xs text-slate-500">Action irréversible</p>
              </div>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement la fiche de recrutement pour <strong className="text-slate-900">{recruitmentToDelete.collaboratorName || 'ce collaborateur'}</strong> ? Cette fiche sera supprimée de HubStation et de la fiche de l'intérimaire.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecruitmentToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (recruitmentToDelete) {
                    onDeleteRecruitment(recruitmentToDelete.id);
                    setRecruitmentToDelete(null);
                    showToast('Fiche de recrutement supprimée définitivement.', 'info');
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                id="confirm-delete-recruitment-btn"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. CONFIRMATION POPUP FOR "MISE EN POSTE" */}
      {showTransitionModal && activeTransitionRecruitment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="transition-confirm-modal">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Validation de la mise en poste</h3>
                <p className="text-xs text-slate-500">Intérimaire : {activeTransitionRecruitment.collaboratorName}</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-600 leading-relaxed font-semibold">
              Souhaitez-vous mettre à jour la fiche intérimaire avec de nouvelles données ? (Matricule, poste, coefficient...)
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowTransitionModal(false);
                  setActiveTransitionRecruitment(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-center"
              >
                Annuler
              </button>
              
              <button
                type="button"
                onClick={handleTransitionOptionNon}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
                id="transition-option-non-btn"
              >
                Non, valider directement
              </button>

              <button
                type="button"
                onClick={handleTransitionOptionOui}
                className="px-4 py-2 bg-[#0062FF] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer text-center"
                id="transition-option-oui-btn"
              >
                Oui, mettre à jour la fiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. UPDATE COLLABORATOR MODAL FOR TRANSITION */}
      {showEditCollabModalForTransition && activeTransitionRecruitment && collabEditFormData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="transition-edit-collab-modal">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-3 bg-blue-50 text-[#0062FF] rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Mettre à jour la fiche de l'intérimaire</h3>
                <p className="text-xs text-slate-500">Modifications enregistrées dans la Base intérimaires lors de l'archivage.</p>
              </div>
            </div>

            <form onSubmit={handleSaveCollabAndFinalizeTransition} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Nom */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">Nom</label>
                  <input
                    type="text"
                    required
                    value={collabEditFormData.lastName}
                    onChange={(e) => setCollabEditFormData(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all"
                  />
                </div>

                {/* Prénom */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">Prénom</label>
                  <input
                    type="text"
                    required
                    value={collabEditFormData.firstName}
                    onChange={(e) => setCollabEditFormData(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all"
                  />
                </div>

                {/* Matricule ANAEL */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">Matricule ANAEL</label>
                  <input
                    type="text"
                    value={collabEditFormData.matricule || ''}
                    onChange={(e) => setCollabEditFormData(prev => prev ? { ...prev, matricule: e.target.value } : null)}
                    placeholder="Ex: 504382"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all"
                  />
                </div>

                {/* E-mail */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">E-mail</label>
                  <input
                    type="email"
                    value={collabEditFormData.email || ''}
                    onChange={(e) => setCollabEditFormData(prev => prev ? { ...prev, email: e.target.value } : null)}
                    placeholder="Ex: email@adresse.fr"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all"
                  />
                </div>

                {/* Téléphone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">Téléphone</label>
                  <input
                    type="text"
                    value={collabEditFormData.phone || ''}
                    onChange={(e) => setCollabEditFormData(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    placeholder="Ex: 06 12 34 56 78"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all"
                  />
                </div>

                {/* Escale */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">Escale</label>
                  <select
                    value={collabEditFormData.escale}
                    onChange={(e) => setCollabEditFormData(prev => prev ? { ...prev, escale: e.target.value } : null)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all"
                  >
                    {ESCALES.map(esc => (
                      <option key={esc} value={esc}>{esc}</option>
                    ))}
                  </select>
                </div>

                {/* Service */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">Service</label>
                  <select
                    value={collabEditFormData.service}
                    onChange={(e) => setCollabEditFormData(prev => prev ? { ...prev, service: e.target.value } : null)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all"
                  >
                    {SERVICES.map(srv => (
                      <option key={srv} value={srv}>{srv}</option>
                    ))}
                  </select>
                </div>

                {/* Poste */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">Poste (Métier)</label>
                  <input
                    type="text"
                    value={collabEditFormData.poste || ''}
                    onChange={(e) => setCollabEditFormData(prev => prev ? { ...prev, poste: e.target.value } : null)}
                    placeholder="Ex: Agent de Piste"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all"
                  />
                </div>

                {/* Coefficient */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">Coefficient</label>
                  <input
                    type="text"
                    value={collabEditFormData.coefficient || ''}
                    onChange={(e) => setCollabEditFormData(prev => prev ? { ...prev, coefficient: e.target.value } : null)}
                    placeholder="Ex: 175"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#0062FF] focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditCollabModalForTransition(false);
                    setShowTransitionModal(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditCollabModalForTransition(false);
                    setActiveTransitionRecruitment(null);
                    setCollabEditFormData(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  id="transition-edit-save-btn"
                >
                  <Check className="h-4 w-4" />
                  Enregistrer et Finaliser la mise en poste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
