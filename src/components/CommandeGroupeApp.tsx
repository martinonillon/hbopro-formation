import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  X, 
  ArrowLeft, 
  Check, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Calendar, 
  Briefcase, 
  BookOpen, 
  Info,
  Building,
  GraduationCap,
  Sparkles,
  Layers,
  ArrowRight,
  FileText,
  User,
  ListChecks,
  AlertTriangle,
  RotateCcw,
  Mail,
  ShieldCheck,
  FileSpreadsheet,
  CreditCard,
  Car,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Smile,
  UserCheck,
  Ghost,
  ThumbsUp,
  ThumbsDown,
  AlertCircle
} from 'lucide-react';
import { GroupOrderCommand, Collaborator, GroupOrderCandidate } from '../types';
import { supabase } from '../lib/supabase';

interface CommandeGroupeAppProps {
  commandes: GroupOrderCommand[];
  collaborators: Collaborator[];
  onAddCommande: (cmd: Omit<GroupOrderCommand, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateCommande: (id: string, updates: Partial<GroupOrderCommand>) => void;
  onDeleteCommande: (id: string) => void;
  isReadOnly?: boolean;
  onOpenModeOp?: () => void;
}

// -------------------------------------------------------------
// HELPER COMPONENTS & CONSTANTS FOR CANDIDATES SECTION
// -------------------------------------------------------------
const CANDIDATE_INTEGRATION_FIELDS = [
  { key: 'mailInscription', label: "Mail d'inscription", icon: Mail },
  { key: 'receptionDossier', label: 'Réception du dossier et mise aux normes', icon: ShieldCheck },
  { key: 'envoiLivretAccueil', label: "Envoi du livret d'accueil ITM", icon: ShieldCheck },
  { key: 'ficheHbo', label: 'Création fiche HBO', icon: FileText },
  { key: 'fichePlanete', label: 'Création fiche Planet', icon: FileSpreadsheet },
  { key: 'controleDossierFormation', label: 'Contrôle dossier formation', icon: GraduationCap },
  { key: 'commandeFormation', label: 'Commande formation', icon: BookOpen },
  { key: 'demandeTca', label: 'Demande de TCA', icon: CreditCard },
  { key: 'demandeParking', label: 'Demande de parking', icon: Car },
  { key: 'commandeDotation', label: 'Commande dotation', icon: Briefcase },
  { key: 'receptionTca', label: 'Réception TCA', icon: CreditCard },
];

function BooleanToggle({
  value,
  onChange,
  disabled,
  labels = { yes: "Oui", no: "Non" }
}: {
  value: boolean | undefined;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  labels?: { yes: string; no: string };
}) {
  return (
    <div className="grid grid-cols-2 gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-3xs max-w-[120px] shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={`py-1 px-2.5 text-[10px] font-black rounded-md transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
          value === true
            ? 'bg-emerald-600 text-white shadow-2xs'
            : 'text-slate-650 hover:bg-slate-100 bg-slate-50/50'
        }`}
      >
        {labels.yes}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={`py-1 px-2.5 text-[10px] font-black rounded-md transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
          value === false
            ? 'bg-rose-600 text-white shadow-2xs'
            : 'text-slate-655 hover:bg-slate-100 bg-slate-50/50'
        }`}
      >
        {labels.no}
      </button>
    </div>
  );
}

function ThreeWayToggle({
  value,
  onChange,
  disabled
}: {
  value: string | undefined;
  onChange: (val: 'oui' | 'non' | 'na') => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-3xs max-w-[180px] shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('oui')}
        className={`py-1 px-2 text-[10px] font-black rounded-md transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
          value === 'oui'
            ? 'bg-emerald-600 text-white shadow-2xs'
            : 'text-slate-650 hover:bg-slate-100 bg-slate-50/50'
        }`}
      >
        Oui
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('non')}
        className={`py-1 px-2 text-[10px] font-black rounded-md transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
          value === 'non'
            ? 'bg-rose-600 text-white shadow-2xs'
            : 'text-slate-650 hover:bg-slate-100 bg-slate-50/50'
        }`}
      >
        Non
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('na')}
        className={`py-1 px-2 text-[10px] font-black rounded-md transition-all cursor-pointer flex items-center justify-center ${
          value === 'na' || !value
            ? 'bg-slate-700 text-white shadow-2xs'
            : 'text-slate-500 hover:bg-slate-100 bg-slate-50/50'
        }`}
      >
        N/A
      </button>
    </div>
  );
}

// 8 Escales specified with unique Airport Name and Color branding
const ESCALES_DATA = [
  { code: 'BES', name: 'Brest Bretagne', colorClass: 'border-red-200 hover:border-red-300', accentBg: 'bg-red-50 text-red-700', badgeColor: 'bg-red-100 text-red-800', lightBorder: 'border-red-100' },
  { code: 'BOD', name: 'Bordeaux Mérignac', colorClass: 'border-yellow-200 hover:border-yellow-300', accentBg: 'bg-yellow-50 text-yellow-800', badgeColor: 'bg-yellow-100 text-yellow-900', lightBorder: 'border-yellow-100' },
  { code: 'LYS', name: 'Lyon St Exupéry', colorClass: 'border-purple-200 hover:border-purple-300', accentBg: 'bg-purple-50 text-purple-700', badgeColor: 'bg-purple-100 text-purple-800', lightBorder: 'border-purple-100' },
  { code: 'MPL', name: 'Montpellier Méditerranée', colorClass: 'border-amber-200 hover:border-amber-300', accentBg: 'bg-amber-50 text-amber-800', badgeColor: 'bg-amber-100 text-amber-900', lightBorder: 'border-amber-100' },
  { code: 'MRS', name: 'Marseille Provence', colorClass: 'border-emerald-200 hover:border-emerald-300', accentBg: 'bg-emerald-50 text-emerald-800', badgeColor: 'bg-emerald-100 text-emerald-900', lightBorder: 'border-emerald-100' },
  { code: 'NCE', name: 'Nice Côte d\'Azur', colorClass: 'border-sky-200 hover:border-sky-300', accentBg: 'bg-sky-50 text-sky-700', badgeColor: 'bg-sky-100 text-sky-800', lightBorder: 'border-sky-100' },
  { code: 'NTE', name: 'Nantes Atlantique', colorClass: 'border-teal-200 hover:border-teal-300', accentBg: 'bg-teal-50 text-teal-700', badgeColor: 'bg-teal-100 text-teal-800', lightBorder: 'border-teal-100' },
  { code: 'TLS', name: 'Toulouse Blagnac', colorClass: 'border-pink-200 hover:border-pink-300', accentBg: 'bg-pink-50 text-pink-700', badgeColor: 'bg-pink-100 text-pink-800', lightBorder: 'border-pink-100' },
];

export default function CommandeGroupeApp({
  commandes,
  collaborators,
  onAddCommande,
  onUpdateCommande,
  onDeleteCommande,
  isReadOnly = false,
  onOpenModeOp
}: CommandeGroupeAppProps) {
  
  // 3-View navigation state
  const [viewState, setViewState] = useState<{
    view: 'accueil' | 'escale' | 'commande';
    selectedEscaleCode?: string;
    selectedCommandeId?: string;
  }>({ view: 'accueil' });

  // Persistence of search input & filters for uninterrupted navigation back & forth
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommande, setEditingCommande] = useState<GroupOrderCommand | null>(null);

  // Tab State for Vue 3 Detail Card
  const [activeDetailTab, setActiveDetailTab] = useState<'admin' | 'recrutement' | 'candidat' | 'suivi' | 'organisme'>('admin');

  // Tab State for Vue 2 Escale Card list (Active vs Archived)
  const [escaleSubTab, setEscaleSubTab] = useState<'actives' | 'archivees'>('actives');

  // New checklist and InfoCall state managers
  const [checklist, setChecklist] = useState<any[]>([]);
  const [infocall, setInfocall] = useState<any | null>(null);
  const [infocallDates, setInfocallDates] = useState<any[]>([]);
  const [commentaireValidation, setCommentaireValidation] = useState('');
  const [commentaireMiseEnPlace, setCommentaireMiseEnPlace] = useState('');
  const [isInfoCallModalOpen, setIsInfoCallModalOpen] = useState(false);
  const [infoCallLieu, setInfoCallLieu] = useState('');
  const [infoCallTempDates, setInfoCallTempDates] = useState<{ date: string; heure: string }[]>([]);

  // State-based custom confirmation modal configuration
  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    actionText: string;
    actionColor: string;
    onConfirm: () => void;
  } | null>(null);

  // -------------------------------------------------------------
  // STATES & EFFECTS FOR CANDIDATE MANAGEMENT (RECRUTEMENT TAB)
  // -------------------------------------------------------------
  const [candidates, setCandidates] = useState<GroupOrderCandidate[]>([]);
  const [candidatesSearch, setCandidatesSearch] = useState('');
  const [candidatesStatusFilter, setCandidatesStatusFilter] = useState<'all' | 'en_cours' | 'convoque' | 'retenu' | 'non_retenu' | 'noshow'>('all');
  const [preResultFilter, setPreResultFilter] = useState<'all' | '++' | '+' | '+-' | '-' | '--'>('all');
  const [expandedCandidateIds, setExpandedCandidateIds] = useState<Set<string>>(new Set());
  const [isNewCandidateModalOpen, setIsNewCandidateModalOpen] = useState(false);
  const [newCandidateForm, setNewCandidateForm] = useState({ nom: '', prenom: '', telephone: '', email: '' });
  const [editingCandidate, setEditingCandidate] = useState<GroupOrderCandidate | null>(null);
  const [editCandidateForm, setEditCandidateForm] = useState({ nom: '', prenom: '', telephone: '', email: '' });
  const [candidateDbStatus, setCandidateDbStatus] = useState<'online' | 'local_fallback'>('online');

  const loadCandidates = async (commandeId: string) => {
    const localKey = `local_candidats_cmd_${commandeId}`;
    const localDataRaw = localStorage.getItem(localKey);
    let initialLocalCandidates: GroupOrderCandidate[] = [];
    if (localDataRaw) {
      try {
        initialLocalCandidates = JSON.parse(localDataRaw);
      } catch (e) {
        console.warn("Error parsing local candidates:", e);
      }
    }

    try {
      const { data, error } = await supabase
        .from('commandes_groupe_candidats')
        .select('*')
        .eq('commande_id', commandeId)
        .order('enregistre_le', { ascending: false });

      if (error) {
        console.warn("Supabase candidates load failed, falling back to local storage:", error.message);
        setCandidateDbStatus('local_fallback');
        setCandidates(initialLocalCandidates);
      } else {
        setCandidateDbStatus('online');
        setCandidates(data || []);
        localStorage.setItem(localKey, JSON.stringify(data || []));
      }
    } catch (err) {
      console.warn("Catch loading candidates:", err);
      setCandidateDbStatus('local_fallback');
      setCandidates(initialLocalCandidates);
    }
  };

  React.useEffect(() => {
    if (viewState.view === 'commande' && viewState.selectedCommandeId) {
      loadCandidates(viewState.selectedCommandeId);
    }
  }, [viewState.view, viewState.selectedCommandeId]);

  const handleAddCandidate = async () => {
    if (!selectedCommandeObj || !viewState.selectedCommandeId) return;
    if (!newCandidateForm.nom.trim() || !newCandidateForm.prenom.trim()) {
      alert("Le nom et le prénom sont obligatoires.");
      return;
    }

    const uuidv4 = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const candidateId = uuidv4();

    const newCandidate: GroupOrderCandidate = {
      id: candidateId,
      commande_id: viewState.selectedCommandeId,
      nom: newCandidateForm.nom.trim(),
      prenom: newCandidateForm.prenom.trim(),
      telephone: newCandidateForm.telephone.trim() || null,
      email: newCandidateForm.email.trim() || null,
      escale: selectedCommandeObj.escale,
      service: selectedCommandeObj.service,
      poste: selectedCommandeObj.poste,
      enregistre_le: new Date().toISOString(),
      statut: 'en_cours',
      
      // Default Section 1
      recruteur_prequal: '',
      date_prequal: '',
      date_convocation: '',
      inscrit_ft: false,
      identifiant_ft: '',
      niveau_anglais: '',
      casier_judiciaire_vierge: false,
      permis_b_vehicule: 'na',
      horaires_decales: false,
      port_de_charge: 'na',
      compte_rendu_echange: '',
      points_alerte_prequal: '',

      // Default Section 2
      recruteur_entretien: '',
      date_entretien: '',
      confirmation_qualification: false,
      disponibilite_formation: 'na',
      disponibilite_saison: 'na',
      compte_rendu_entretien: '',
      points_alerte_entretien: '',
      pre_resultat: '',
      resultat: '',

      // Default Section 3 (Checklist Intégration)
      integration_checklist: {
        mailInscription: { value: 'N/A', qui: '', date: '' },
        receptionDossier: { value: 'N/A', qui: '', date: '' },
        envoiLivretAccueil: { value: 'N/A', qui: '', date: '' },
        ficheHbo: { value: 'N/A', qui: '', date: '' },
        fichePlanete: { value: 'N/A', qui: '', date: '' },
        controleDossierFormation: { value: 'N/A', qui: '', date: '' },
        commandeFormation: { value: 'N/A', qui: '', date: '' },
        demandeTca: { value: 'N/A', qui: '', date: '' },
        demandeParking: { value: 'N/A', qui: '', date: '' },
        commandeDotation: { value: 'N/A', qui: '', date: '' },
        receptionTca: { value: 'N/A', qui: '', date: '' }
      },
      commentaires: ''
    };

    const updatedCandidates = [newCandidate, ...candidates];
    setCandidates(updatedCandidates);
    localStorage.setItem(`local_candidats_cmd_${viewState.selectedCommandeId}`, JSON.stringify(updatedCandidates));

    try {
      const { error } = await supabase
        .from('commandes_groupe_candidats')
        .insert({
          id: candidateId,
          commande_id: viewState.selectedCommandeId,
          nom: newCandidate.nom,
          prenom: newCandidate.prenom,
          telephone: newCandidate.telephone,
          email: newCandidate.email,
          escale: newCandidate.escale,
          service: newCandidate.service,
          poste: newCandidate.poste,
          statut: newCandidate.statut,
          recruteur_prequal: newCandidate.recruteur_prequal,
          date_prequal: newCandidate.date_prequal || null,
          date_convocation: newCandidate.date_convocation || null,
          inscrit_ft: newCandidate.inscrit_ft,
          identifiant_ft: newCandidate.identifiant_ft,
          niveau_anglais: newCandidate.niveau_anglais,
          casier_judiciaire_vierge: newCandidate.casier_judiciaire_vierge,
          permis_b_vehicule: newCandidate.permis_b_vehicule,
          horaires_decales: newCandidate.horaires_decales,
          port_de_charge: newCandidate.port_de_charge,
          compte_rendu_echange: newCandidate.compte_rendu_echange,
          points_alerte_prequal: newCandidate.points_alerte_prequal,
          recruteur_entretien: newCandidate.recruteur_entretien,
          date_entretien: newCandidate.date_entretien || null,
          confirmation_qualification: newCandidate.confirmation_qualification,
          disponibilite_formation: newCandidate.disponibilite_formation,
          disponibilite_saison: newCandidate.disponibilite_saison,
          compte_rendu_entretien: newCandidate.compte_rendu_entretien,
          points_alerte_entretien: newCandidate.points_alerte_entretien,
          pre_resultat: newCandidate.pre_resultat,
          resultat: newCandidate.resultat,
          integration_checklist: newCandidate.integration_checklist,
          commentaires: newCandidate.commentaires
        });

      if (error) {
        console.warn("Error inserting candidate to Supabase, local mode active:", error.message);
        setCandidateDbStatus('local_fallback');
      } else {
        setCandidateDbStatus('online');
      }
    } catch (err) {
      console.warn("Catch inserting candidate:", err);
      setCandidateDbStatus('local_fallback');
    }

    setIsNewCandidateModalOpen(false);
    setNewCandidateForm({ nom: '', prenom: '', telephone: '', email: '' });
  };

  const handleUpdateCandidate = async (candidateId: string, updates: Partial<GroupOrderCandidate>) => {
    if (!viewState.selectedCommandeId) return;

    const updated = candidates.map(c => {
      if (c.id === candidateId) {
        const merged = { ...c, ...updates };
        if (updates.resultat !== undefined) {
          if (updates.resultat === 'retenu') merged.statut = 'retenu';
          else if (updates.resultat === 'non_retenu') merged.statut = 'non_retenu';
          else if (updates.resultat === 'noshow') merged.statut = 'noshow';
        }
        return merged;
      }
      return c;
    });

    setCandidates(updated);
    localStorage.setItem(`local_candidats_cmd_${viewState.selectedCommandeId}`, JSON.stringify(updated));

    try {
      const dbCandidate = updated.find(c => c.id === candidateId);
      if (dbCandidate) {
        const { error } = await supabase
          .from('commandes_groupe_candidats')
          .update({
            nom: dbCandidate.nom,
            prenom: dbCandidate.prenom,
            telephone: dbCandidate.telephone,
            email: dbCandidate.email,
            statut: dbCandidate.statut,
            recruteur_prequal: dbCandidate.recruteur_prequal,
            date_prequal: dbCandidate.date_prequal || null,
            date_convocation: dbCandidate.date_convocation || null,
            inscrit_ft: dbCandidate.inscrit_ft,
            identifiant_ft: dbCandidate.identifiant_ft,
            niveau_anglais: dbCandidate.niveau_anglais,
            casier_judiciaire_vierge: dbCandidate.casier_judiciaire_vierge,
            permis_b_vehicule: dbCandidate.permis_b_vehicule,
            horaires_decales: dbCandidate.horaires_decales,
            port_de_charge: dbCandidate.port_de_charge,
            compte_rendu_echange: dbCandidate.compte_rendu_echange,
            points_alerte_prequal: dbCandidate.points_alerte_prequal,
            recruteur_entretien: dbCandidate.recruteur_entretien,
            date_entretien: dbCandidate.date_entretien || null,
            confirmation_qualification: dbCandidate.confirmation_qualification,
            disponibilite_formation: dbCandidate.disponibilite_formation,
            disponibilite_saison: dbCandidate.disponibilite_saison,
            compte_rendu_entretien: dbCandidate.compte_rendu_entretien,
            points_alerte_entretien: dbCandidate.points_alerte_entretien,
            pre_resultat: dbCandidate.pre_resultat,
            resultat: dbCandidate.resultat,
            integration_checklist: dbCandidate.integration_checklist,
            commentaires: dbCandidate.commentaires,
            updated_at: new Date().toISOString()
          })
          .eq('id', candidateId);

        if (error) {
          console.warn("Supabase candidate update failed, saved locally:", error.message);
          setCandidateDbStatus('local_fallback');
        } else {
          setCandidateDbStatus('online');
        }
      }
    } catch (err) {
      console.warn("Catch updating candidate:", err);
      setCandidateDbStatus('local_fallback');
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!viewState.selectedCommandeId) return;

    setCustomConfirm({
      title: "Supprimer le candidat",
      message: "Êtes-vous sûr de vouloir supprimer définitivement ce candidat de cette commande de groupe ? Cette action est irréversible.",
      actionText: "Oui, supprimer",
      actionColor: "bg-red-600 hover:bg-red-700",
      onConfirm: async () => {
        const updated = candidates.filter(c => c.id !== candidateId);
        setCandidates(updated);
        localStorage.setItem(`local_candidats_cmd_${viewState.selectedCommandeId}`, JSON.stringify(updated));

        try {
          const { error } = await supabase
            .from('commandes_groupe_candidats')
            .delete()
            .eq('id', candidateId);

          if (error) {
            console.warn("Supabase candidate deletion failed, removed locally:", error.message);
            setCandidateDbStatus('local_fallback');
          } else {
            setCandidateDbStatus('online');
          }
        } catch (err) {
          console.warn("Catch deleting candidate:", err);
          setCandidateDbStatus('local_fallback');
        }
      }
    });
  };

  const renderCandidateChecklistItem = (
    field: { key: string; label: string; icon: React.ElementType },
    candidate: GroupOrderCandidate
  ) => {
    const Icon = field.icon;
    const rawValue = candidate.integration_checklist?.[field.key];
    
    const currentVal = typeof rawValue === 'object' && rawValue !== null ? rawValue.value : (rawValue || 'N/A');
    const currentQui = typeof rawValue === 'object' && rawValue !== null ? (rawValue.qui || '') : '';
    const currentValDate = typeof rawValue === 'object' && rawValue !== null ? (rawValue.date || '') : '';

    const handleValueChange = (val: 'Oui' | 'Non' | 'N/A') => {
      if (isReadOnly) return;
      const updatedChecklist = {
        ...(candidate.integration_checklist || {}),
        [field.key]: {
          value: val,
          qui: currentQui || '',
          date: currentValDate || ''
        }
      };
      handleUpdateCandidate(candidate.id, { integration_checklist: updatedChecklist });
    };

    const handleQuiChange = (q: string) => {
      if (isReadOnly) return;
      const updatedChecklist = {
        ...(candidate.integration_checklist || {}),
        [field.key]: {
          value: currentVal || 'N/A',
          qui: q,
          date: currentValDate || ''
        }
      };
      handleUpdateCandidate(candidate.id, { integration_checklist: updatedChecklist });
    };

    const handleDateChange = (d: string) => {
      if (isReadOnly) return;
      const updatedChecklist = {
        ...(candidate.integration_checklist || {}),
        [field.key]: {
          value: currentVal || 'N/A',
          qui: currentQui || '',
          date: d
        }
      };
      handleUpdateCandidate(candidate.id, { integration_checklist: updatedChecklist });
    };

    return (
      <div 
        key={field.key}
        className={`p-3 rounded-xl border transition-all flex items-stretch gap-3 ${
          currentVal === 'Oui' ? 'bg-emerald-50/40 border-emerald-200 shadow-3xs' :
          currentVal === 'Non' ? 'bg-rose-50/40 border-rose-200 shadow-3xs' :
          'bg-slate-50/60 border-slate-200/85 text-slate-700'
        }`}
      >
        <div className="flex-[2] flex flex-col justify-between gap-2.5 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1.5 rounded-lg shrink-0 ${
                currentVal === 'Oui' ? 'bg-emerald-100 text-emerald-700' :
                currentVal === 'Non' ? 'bg-rose-100 text-rose-700' :
                'bg-slate-200 text-slate-600'
              }`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="font-extrabold text-[11px] text-slate-900 leading-snug break-words" title={field.label}>
                {field.label}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-3xs">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => handleValueChange('Oui')}
              className={`py-1 text-[10px] font-black rounded-md transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
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
              onClick={() => handleValueChange('Non')}
              className={`py-1 text-[10px] font-black rounded-md transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
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
              onClick={() => handleValueChange('N/A')}
              className={`py-1 text-[10px] font-black rounded-md transition-all cursor-pointer flex items-center justify-center ${
                currentVal === 'N/A'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              N/A
            </button>
          </div>
        </div>

        <div className="w-[1px] bg-slate-200/80 shrink-0 self-stretch" />

        <div className="flex-1 flex flex-col justify-between gap-1.5 min-w-[100px]">
          <div className="space-y-0.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Qui ?</label>
            <input
              type="text"
              disabled={isReadOnly}
              value={currentQui}
              onChange={(e) => handleQuiChange(e.target.value)}
              placeholder="ex: Jean"
              className="w-full px-2 py-0.5 bg-white border border-slate-300 rounded-md text-[10px] font-semibold text-slate-800 focus:border-[#0062FF] focus:outline-hidden disabled:bg-slate-100"
            />
          </div>

          <div className="space-y-0.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Date</label>
            <input
              type="date"
              disabled={isReadOnly}
              value={currentValDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded-md text-[9px] font-semibold text-slate-800 focus:border-[#0062FF] focus:outline-hidden disabled:bg-slate-100"
            />
          </div>
        </div>
      </div>
    );
  };

  const toggleCandidateExpansion = (id: string) => {
    setExpandedCandidateIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      if (candidatesStatusFilter !== 'all') {
        if (c.statut !== candidatesStatusFilter) return false;
      }

      if (candidatesStatusFilter === 'retenu' && preResultFilter !== 'all') {
        if (c.pre_resultat !== preResultFilter) return false;
      }

      if (candidatesSearch.trim()) {
        const query = candidatesSearch.toLowerCase();
        const nom = (c.nom || '').toLowerCase();
        const prenom = (c.prenom || '').toLowerCase();
        const tel = (c.telephone || '').toLowerCase();
        const mail = (c.email || '').toLowerCase();
        
        return nom.includes(query) || prenom.includes(query) || tel.includes(query) || mail.includes(query);
      }

      return true;
    });
  }, [candidates, candidatesSearch, candidatesStatusFilter, preResultFilter]);

  const handleEditInfoCall = () => {
    setInfoCallLieu(infocall?.lieu || '');
    setInfoCallTempDates(infocallDates.length > 0 
      ? infocallDates.map(d => ({ date: d.date, heure: d.heure.substring(0, 5) })) 
      : [{ date: '', heure: '' }]
    );
    setIsInfoCallModalOpen(true);
  };

  const handleDeleteInfoCall = async () => {
    if (!viewState.selectedCommandeId) return;
    try {
      if (infocall?.id) {
        await supabase.from('commandes_groupe_infocall_dates').delete().eq('infocall_id', infocall.id);
        await supabase.from('commandes_groupe_infocall').delete().eq('id', infocall.id);
      }
    } catch (err) {
      console.warn("Error deleting InfoCall:", err);
    }
    setInfocall(null);
    setInfocallDates([]);
    localStorage.removeItem(`infocall_cmd_${viewState.selectedCommandeId}`);
    localStorage.removeItem(`infocall_dates_cmd_${viewState.selectedCommandeId}`);
    
    // Reset the reservation checklist item to 'non'
    handleUpdateChecklistItem('reservation_infocall', { statut: 'non' });
  };

  // Function to load all sub-tables (addons) for selected command
  const loadCommandeAddons = async (commandeId: string) => {
    // Load commentaries from current command
    const currentCmd = commandes.find(c => c.id === commandeId);
    if (currentCmd) {
      setCommentaireValidation(currentCmd.commentaire_validation || '');
      setCommentaireMiseEnPlace(currentCmd.commentaire_mise_en_place || '');
    }

    const localChecklistKey = `checklist_cmd_${commandeId}`;
    const localInfocallKey = `infocall_cmd_${commandeId}`;
    const localInfocallDatesKey = `infocall_dates_cmd_${commandeId}`;

    const savedChecklist = localStorage.getItem(localChecklistKey);
    const savedInfocall = localStorage.getItem(localInfocallKey);
    const savedInfocallDates = localStorage.getItem(localInfocallDatesKey);

    let initialChecklist: any[] = [];
    if (savedChecklist) {
      try {
        initialChecklist = JSON.parse(savedChecklist);
      } catch (_) {}
    }

    const defaultKeys = [
      { key: 'envoi_recap_client', section: 'validation', label: "Envoi du récap commande au client" },
      { key: 'validation_referentiel', section: 'validation', label: "Validation du référentiel formation" },
      { key: 'contact_of', section: 'validation', label: "Prise de contact OF" },
      { key: 'contact_france_travail', section: 'validation', label: "Prise de contact France Travail" },
      { key: 'diffusion_buddy', section: 'validation', label: "Diffusion annonce Buddy" },
      
      { key: 'reservation_infocall', section: 'mise_en_place', label: "Réservation salle/date InfoCall" },
      { key: 'convoque_client', section: 'mise_en_place', label: "Convoquer le client à l'InfoCall" },
      { key: 'prequal_candidats', section: 'mise_en_place', label: "Pré-qual des candidats" },
      { key: 'envoi_convocations', section: 'mise_en_place', label: "Envoi des convocations" },
      { key: 'reservation_deplacement', section: 'mise_en_place', label: "Réservation déplacement pro" },
      { key: 'presentation_ppt', section: 'mise_en_place', label: "Présentation PPT à jour" },
    ];

    const mergedChecklist = defaultKeys.map(def => {
      const existing = initialChecklist.find(item => item.item_key === def.key);
      return {
        id: existing?.id || `chk-${Math.random().toString(36).substr(2, 9)}`,
        commande_id: commandeId,
        section: def.section,
        item_key: def.key,
        label: def.label,
        statut: existing?.statut || 'na',
        nom: existing?.nom || '',
        date: existing?.date || '',
      };
    });

    setChecklist(mergedChecklist);

    if (savedInfocall) {
      try {
        setInfocall(JSON.parse(savedInfocall));
      } catch (_) {}
    } else {
      setInfocall(null);
    }

    if (savedInfocallDates) {
      try {
        setInfocallDates(JSON.parse(savedInfocallDates));
      } catch (_) {}
    } else {
      setInfocallDates([]);
    }

    // Try fetching from Supabase asynchronously
    try {
      const { data: dbChecklist, error: errChecklist } = await supabase
        .from('commandes_groupe_checklist')
        .select('*')
        .eq('commande_id', commandeId);

      if (!errChecklist && dbChecklist && dbChecklist.length > 0) {
        const finalChecklist = defaultKeys.map(def => {
          const dbItem = dbChecklist.find(item => item.item_key === def.key);
          return {
            id: dbItem?.id || `chk-${Math.random().toString(36).substr(2, 9)}`,
            commande_id: commandeId,
            section: def.section,
            item_key: def.key,
            label: def.label,
            statut: dbItem?.statut || 'na',
            nom: dbItem?.nom || '',
            date: dbItem?.date || '',
          };
        });
        setChecklist(finalChecklist);
        localStorage.setItem(localChecklistKey, JSON.stringify(finalChecklist));
      } else if (!errChecklist) {
        const checklistToInsert = mergedChecklist.map(item => ({
          commande_id: item.commande_id,
          section: item.section,
          item_key: item.item_key,
          statut: item.statut,
          nom: item.nom || null,
          date: item.date || null
        }));
        await supabase.from('commandes_groupe_checklist').insert(checklistToInsert);
      }

      const { data: dbInfocall, error: errInfocall } = await supabase
        .from('commandes_groupe_infocall')
        .select('*')
        .eq('commande_id', commandeId)
        .maybeSingle();

      if (!errInfocall && dbInfocall) {
        setInfocall(dbInfocall);
        localStorage.setItem(localInfocallKey, JSON.stringify(dbInfocall));

        const { data: dbDates, error: errDates } = await supabase
          .from('commandes_groupe_infocall_dates')
          .select('*')
          .eq('infocall_id', dbInfocall.id);

        if (!errDates && dbDates) {
          setInfocallDates(dbDates);
          localStorage.setItem(localInfocallDatesKey, JSON.stringify(dbDates));
        }
      }
    } catch (err) {
      console.warn("Error syncing sub-tables from Supabase:", err);
    }
  };

  React.useEffect(() => {
    if (viewState.view === 'commande' && viewState.selectedCommandeId) {
      loadCommandeAddons(viewState.selectedCommandeId);
    }
  }, [viewState.view, viewState.selectedCommandeId]);

  const handleUpdateChecklistItem = async (itemKey: string, updates: { statut?: string; nom?: string; date?: string }) => {
    if (isReadOnly) return;

    const updated = checklist.map(item => {
      if (item.item_key === itemKey) {
        const newItem = { ...item, ...updates };
        if (itemKey === 'reservation_infocall' && updates.statut === 'oui' && item.statut !== 'oui') {
          setInfoCallLieu(infocall?.lieu || '');
          setInfoCallTempDates(infocallDates.length > 0 ? infocallDates.map(d => ({ date: d.date, heure: d.heure.substring(0, 5) })) : [{ date: '', heure: '' }]);
          setIsInfoCallModalOpen(true);
        }
        return newItem;
      }
      return item;
    });

    setChecklist(updated);
    
    if (viewState.selectedCommandeId) {
      localStorage.setItem(`checklist_cmd_${viewState.selectedCommandeId}`, JSON.stringify(updated));
      
      try {
        const dbItem = updated.find(item => item.item_key === itemKey);
        if (dbItem) {
          const payload = {
            commande_id: dbItem.commande_id,
            section: dbItem.section,
            item_key: dbItem.item_key,
            statut: dbItem.statut,
            nom: dbItem.nom || null,
            date: dbItem.date || null,
            updated_at: new Date().toISOString()
          };
          await supabase
            .from('commandes_groupe_checklist')
            .upsert(payload, { onConflict: 'commande_id,item_key' });
        }
      } catch (err) {
        console.warn("Error upserting checklist item to Supabase:", err);
      }
    }
  };

  const handleSaveCommentary = (section: 'validation' | 'mise_en_place', text: string) => {
    if (isReadOnly || !viewState.selectedCommandeId) return;
    if (section === 'validation') {
      onUpdateCommande(viewState.selectedCommandeId, { commentaire_validation: text });
    } else {
      onUpdateCommande(viewState.selectedCommandeId, { commentaire_mise_en_place: text });
    }
  };

  const handleSaveInfoCall = async () => {
    if (!viewState.selectedCommandeId) return;

    const validDates = infoCallTempDates.filter(d => d.date && d.heure);
    if (validDates.length === 0) {
      alert("Veuillez renseigner au moins un créneau complet (date et heure).");
      return;
    }

    try {
      let infocallId = infocall?.id;
      if (!infocallId) {
        const { data: newCall, error: errCall } = await supabase
          .from('commandes_groupe_infocall')
          .insert({
            commande_id: viewState.selectedCommandeId,
            lieu: infoCallLieu
          })
          .select()
          .single();
        
        if (!errCall && newCall) {
          infocallId = newCall.id;
          setInfocall(newCall);
          localStorage.setItem(`infocall_cmd_${viewState.selectedCommandeId}`, JSON.stringify(newCall));
        }
      } else {
        const { error: errCall } = await supabase
          .from('commandes_groupe_infocall')
          .update({ lieu: infoCallLieu })
          .eq('id', infocallId);
        
        if (!errCall) {
          const updatedCall = { ...infocall, lieu: infoCallLieu };
          setInfocall(updatedCall);
          localStorage.setItem(`infocall_cmd_${viewState.selectedCommandeId}`, JSON.stringify(updatedCall));
        }
      }

      if (infocallId) {
        await supabase
          .from('commandes_groupe_infocall_dates')
          .delete()
          .eq('infocall_id', infocallId);

        const datesToInsert = validDates.map(item => ({
          infocall_id: infocallId,
          date: item.date,
          heure: item.heure + ':00'
        }));

        const { data: insertedDates, error: errInsDates } = await supabase
          .from('commandes_groupe_infocall_dates')
          .insert(datesToInsert)
          .select();

        if (!errInsDates && insertedDates) {
          setInfocallDates(insertedDates);
          localStorage.setItem(`infocall_dates_cmd_${viewState.selectedCommandeId}`, JSON.stringify(insertedDates));
        }
      }
    } catch (err) {
      console.warn("Error saving InfoCall to Supabase:", err);
    }

    const backupInfocall = {
      id: infocall?.id || `inf-${Math.random().toString(36).substr(2, 9)}`,
      commande_id: viewState.selectedCommandeId,
      lieu: infoCallLieu,
    };
    setInfocall(backupInfocall);
    localStorage.setItem(`infocall_cmd_${viewState.selectedCommandeId}`, JSON.stringify(backupInfocall));

    const backupDates = validDates.map((d, idx) => ({
      id: `date-${idx}-${Date.now()}`,
      infocall_id: backupInfocall.id,
      date: d.date,
      heure: d.heure,
    }));
    setInfocallDates(backupDates);
    localStorage.setItem(`infocall_dates_cmd_${viewState.selectedCommandeId}`, JSON.stringify(backupDates));

    setIsInfoCallModalOpen(false);
  };

  // Form input states
  const [formEscale, setFormEscale] = useState('TLS');
  const [formClient, setFormClient] = useState('');
  const [formService, setFormService] = useState('');
  const [formPoste, setFormPoste] = useState('');
  const [formNombreAgents, setFormNombreAgents] = useState(5);
  const [formNombreSessions, setFormNombreSessions] = useState(1);
  const [formOrganisme, setFormOrganisme] = useState('');
  const [formPoei, setFormPoei] = useState(false);
  const [formDateMAD, setFormDateMAD] = useState('');

  // 1. Dynamic Extraction of Services from Collaborators list (base intérimaires)
  const servicesList = useMemo(() => {
    const extracted = Array.from(new Set(collaborators.map(c => c.service).filter(Boolean))).sort();
    if (extracted.length === 0) {
      return ['PASSAGE', 'PISTE', 'TRAFIC', 'NETTOYAGE', 'SÛRETÉ', 'CARGO'];
    }
    return extracted;
  }, [collaborators]);

  // Ensure default service is set when services list loads
  React.useEffect(() => {
    if (servicesList.length > 0 && !formService) {
      setFormService(servicesList[0]);
    }
  }, [servicesList, formService]);

  // 2. Global KPIs (Bandeau Accueil)
  const globalKPIs = useMemo(() => {
    let enCours = 0;
    let termine = 0;
    let annule = 0;

    commandes.forEach(c => {
      if (c.statut === 'en_cours') enCours++;
      else if (c.statut === 'termine') termine++;
      else if (c.statut === 'annule') annule++;
    });

    return { enCours, termine, annule, total: commandes.length };
  }, [commandes]);

  // 3. Escale Counts (for the 8 escale cards)
  const escaleCounts = useMemo(() => {
    const counts: Record<string, { enCours: number; termine: number; annule: number }> = {};
    ESCALES_DATA.forEach(e => {
      counts[e.code] = { enCours: 0, termine: 0, annule: 0 };
    });

    commandes.forEach(c => {
      if (counts[c.escale]) {
        if (c.statut === 'en_cours') counts[c.escale].enCours++;
        else if (c.statut === 'termine') counts[c.escale].termine++;
        else if (c.statut === 'annule') counts[c.escale].annule++;
      }
    });

    return counts;
  }, [commandes]);

  // Helper to resolve Airport details
  const getEscaleInfo = (code: string) => {
    return ESCALES_DATA.find(e => e.code === code) || { code, name: 'Aéroport', colorClass: 'border-slate-200', accentBg: 'bg-slate-50 text-slate-700', badgeColor: 'bg-slate-100 text-slate-800', lightBorder: 'border-slate-100' };
  };

  // Helper to reliably generate unique sequential reference
  const generateReference = (escaleCode: string): string => {
    const year = new Date().getFullYear();
    // Filter existing commands for this escale in current year
    const sameEscaleAndYear = commandes.filter(cmd => {
      if (cmd.escale !== escaleCode) return false;
      const cmdYear = cmd.created_at ? new Date(cmd.created_at).getFullYear() : year;
      return cmdYear === year;
    });

    const sessionNo = String(sameEscaleAndYear.length + 1).padStart(3, '0');
    return `HBO-${escaleCode}-GRP-${year}/${sessionNo}`;
  };

  // Filter commands for Vue 2 (specific selected escale + search query input + active/archived tab)
  const filteredEscaleCommandes = useMemo(() => {
    if (!viewState.selectedEscaleCode) return [];
    
    return commandes.filter(c => {
      // Must be the selected escale
      if (c.escale !== viewState.selectedEscaleCode) return false;

      // Filter by active/archived tab
      if (escaleSubTab === 'actives') {
        if (c.statut !== 'en_cours') return false;
      } else {
        if (c.statut !== 'termine' && c.statut !== 'annule') return false;
      }

      // Handle search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const refMatch = c.reference.toLowerCase().includes(query);
        const clientMatch = c.client.toLowerCase().includes(query);
        const serviceMatch = c.service.toLowerCase().includes(query);
        const posteMatch = c.poste.toLowerCase().includes(query);
        return refMatch || clientMatch || serviceMatch || posteMatch;
      }

      return true;
    });
  }, [commandes, viewState.selectedEscaleCode, searchQuery, escaleSubTab]);

  // Selected command for Vue 3 Detail
  const selectedCommandeObj = useMemo(() => {
    if (!viewState.selectedCommandeId) return null;
    return commandes.find(c => c.id === viewState.selectedCommandeId) || null;
  }, [commandes, viewState.selectedCommandeId]);

  // Create or Update Form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (editingCommande) {
      // Modify
      onUpdateCommande(editingCommande.id, {
        escale: formEscale,
        client: formClient,
        service: formService,
        poste: formPoste,
        nombre_agents: Number(formNombreAgents),
        nombre_sessions: Number(formNombreSessions),
        organisme_formation: formOrganisme || undefined,
        poei: formPoei,
        date_mise_a_disposition: formDateMAD || undefined,
      });
    } else {
      // Create
      const calculatedRef = generateReference(formEscale);
      onAddCommande({
        reference: calculatedRef,
        escale: formEscale,
        client: formClient,
        service: formService,
        poste: formPoste,
        nombre_agents: Number(formNombreAgents),
        nombre_sessions: Number(formNombreSessions),
        organisme_formation: formOrganisme || undefined,
        poei: formPoei,
        date_mise_a_disposition: formDateMAD || undefined,
        statut: 'en_cours'
      });
    }

    setIsModalOpen(false);
    setEditingCommande(null);
  };

  // Trigger Pre-filled Edit Modal
  const handleOpenEdit = (cmd: GroupOrderCommand) => {
    setEditingCommande(cmd);
    setFormEscale(cmd.escale);
    setFormClient(cmd.client);
    setFormService(cmd.service);
    setFormPoste(cmd.poste);
    setFormNombreAgents(cmd.nombre_agents);
    setFormNombreSessions(cmd.nombre_sessions);
    setFormOrganisme(cmd.organisme_formation || '');
    setFormPoei(cmd.poei);
    setFormDateMAD(cmd.date_mise_a_disposition || '');
    setIsModalOpen(true);
  };

  const renderChecklistCard = (item: any) => {
    const currentVal = item.statut; // 'oui', 'non', 'na'
    const currentQui = item.nom || '';
    const currentValDate = item.date || '';
    
    // Resolve Icon based on item_key
    let IconComponent = CheckCircle;
    if (item.item_key === 'envoi_recap_client') IconComponent = FileText;
    else if (item.item_key === 'validation_referentiel') IconComponent = BookOpen;
    else if (item.item_key === 'contact_of') IconComponent = Building;
    else if (item.item_key === 'contact_france_travail') IconComponent = Users;
    else if (item.item_key === 'diffusion_buddy') IconComponent = Sparkles;
    else if (item.item_key === 'reservation_infocall') IconComponent = Calendar;
    else if (item.item_key === 'convoque_client') IconComponent = Users;
    else if (item.item_key === 'prequal_candidats') IconComponent = Search;
    else if (item.item_key === 'envoi_convocations') IconComponent = FileText;
    else if (item.item_key === 'reservation_deplacement') IconComponent = ArrowRight;
    else if (item.item_key === 'presentation_ppt') IconComponent = Layers;

    return (
      <div 
        key={item.item_key}
        className={`p-3 rounded-xl border transition-all flex items-stretch gap-3 ${
          currentVal === 'oui' ? 'bg-emerald-50/40 border-emerald-200 shadow-3xs' :
          currentVal === 'non' ? 'bg-rose-50/40 border-rose-200 shadow-3xs' :
          'bg-slate-50/60 border-slate-200/85 text-slate-750'
        }`}
      >
        {/* Left section: 2/3 width */}
        <div className="flex-[2] flex flex-col justify-between gap-2.5 min-w-0">
          {/* Top left: Icon & Label */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`p-1.5 rounded-lg shrink-0 ${
                currentVal === 'oui' ? 'bg-emerald-100 text-emerald-700' :
                currentVal === 'non' ? 'bg-rose-100 text-rose-700' :
                'bg-slate-200 text-slate-600'
              }`}>
                <IconComponent className="h-3.5 w-3.5" />
              </div>
              <div className="font-extrabold text-[11px] text-slate-900 leading-snug break-words" title={item.label}>
                {item.label}
              </div>
            </div>
          </div>

          {/* Bottom left: 3 buttons */}
          <div className="grid grid-cols-3 gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-3xs">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => handleUpdateChecklistItem(item.item_key, { statut: 'oui' })}
              className={`py-1 text-[10px] font-black rounded-md transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
                currentVal === 'oui'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Check className="h-2.5 w-2.5" /> Oui
            </button>

            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => handleUpdateChecklistItem(item.item_key, { statut: 'non' })}
              className={`py-1 text-[10px] font-black rounded-md transition-all cursor-pointer flex items-center justify-center gap-0.5 ${
                currentVal === 'non'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <X className="h-2.5 w-2.5" /> Non
            </button>

            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => handleUpdateChecklistItem(item.item_key, { statut: 'na' })}
              className={`py-1 text-[10px] font-black rounded-md transition-all cursor-pointer flex items-center justify-center ${
                currentVal === 'na'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              N/A
            </button>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="w-[1px] bg-slate-200/80 shrink-0 self-stretch" />

        {/* Right section: inputs */}
        <div className="flex-1 flex flex-col justify-between gap-1.5 min-w-[100px]">
          {/* Line 1: Qui? */}
          <div className="space-y-0.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Qui ?</label>
            <input
              type="text"
              disabled={isReadOnly}
              value={currentQui}
              onChange={(e) => handleUpdateChecklistItem(item.item_key, { nom: e.target.value })}
              placeholder="ex: Jean"
              className="w-full px-2 py-0.5 bg-white border border-slate-300 rounded-md text-[10px] font-semibold text-slate-800 focus:border-[#0062FF] focus:outline-hidden disabled:bg-slate-100"
            />
          </div>

          {/* Line 2: Date */}
          <div className="space-y-0.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Date</label>
            <input
              type="date"
              disabled={isReadOnly}
              value={currentValDate}
              onChange={(e) => handleUpdateChecklistItem(item.item_key, { date: e.target.value })}
              className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded-md text-[9px] font-semibold text-slate-800 focus:border-[#0062FF] focus:outline-hidden disabled:bg-slate-100"
            />
          </div>
        </div>
      </div>
    );
  };

  // Trigger fresh creation modal
  const handleOpenCreate = () => {
    setEditingCommande(null);
    setFormEscale(viewState.selectedEscaleCode || 'TLS');
    setFormClient('');
    if (servicesList.length > 0) {
      setFormService(servicesList[0]);
    }
    setFormPoste('');
    setFormNombreAgents(5);
    setFormNombreSessions(1);
    setFormOrganisme('');
    setFormPoei(false);
    setFormDateMAD('');
    setIsModalOpen(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6" id="group-orders-app">
      
      {/* ========================================================================= */}
      {/* VUE 1 : ACCUEIL / LISTE DES ESCALES */}
      {/* ========================================================================= */}
      {viewState.view === 'accueil' && (
        <div className="space-y-6 animate-fade-in" id="vue-1-accueil">
          
          {/* Header Bandeau closely styled like RecruitmentApp.tsx */}
          <div 
            className="bg-gradient-to-r from-[#061d43] via-[#0d2e6b] to-[#fbbf24] rounded-2xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden"
            id="grouporder-header-banner"
          >
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
            
            <div className="relative z-10 space-y-4">
              {/* Top Line: Title & Mode Op button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-xl backdrop-blur-xs flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      Commande de groupe
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30">
                      Suivi des sessions
                    </span>
                  </div>
                </div>

                {onOpenModeOp && (
                  <button
                    type="button"
                    onClick={onOpenModeOp}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold border border-white/20 hover:border-white/30 backdrop-blur-xs transition-all shadow-sm cursor-pointer self-start sm:self-auto shrink-0"
                    id="grouporder-mode-op-btn"
                  >
                    <Info className="w-3.5 h-3.5 text-white" />
                    <span>Mode Op</span>
                  </button>
                )}
              </div>

              {/* Bottom Line: Description & Quick Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center">
                <div className="lg:col-span-7">
                  <p className="text-xs sm:text-sm text-amber-150/90 leading-relaxed font-normal">
                    Suivi global et pilotage des recrutements groupés par escale, coordination administrative et planification logistique des formations.
                  </p>
                </div>
                <div className="lg:col-span-5 flex justify-start lg:justify-end">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-2 rounded-xl text-center min-w-[80px]">
                      <span className="text-[10px] uppercase font-bold text-amber-300 block">En cours</span>
                      <span className="text-lg font-black text-white">{globalKPIs.enCours}</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-2 rounded-xl text-center min-w-[80px]">
                      <span className="text-[10px] uppercase font-bold text-emerald-300 block">Terminé</span>
                      <span className="text-lg font-black text-white">{globalKPIs.termine}</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3.5 py-2 rounded-xl text-center min-w-[80px]">
                      <span className="text-[10px] uppercase font-bold text-rose-300 block">Annulés</span>
                      <span className="text-lg font-black text-white">{globalKPIs.annule}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Creation action row without Search bar */}
          {!isReadOnly && (
            <div className="flex justify-end bg-white p-4 rounded-xl border border-slate-200/80 shadow-3xs">
              <button
                onClick={handleOpenCreate}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Nouvelle commande
              </button>
            </div>
          )}

          {/* Grid of the 8 Escales (4 columns per row, 2 rows) */}
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Escales d'exploitation (8 stations)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" id="escale-grid-container">
              {ESCALES_DATA.map(esc => {
                const count = escaleCounts[esc.code] || { enCours: 0, termine: 0, annule: 0 };
                return (
                  <div
                    key={esc.code}
                    onClick={() => setViewState({ view: 'escale', selectedEscaleCode: esc.code })}
                    className={`bg-white p-5 rounded-xl border border-slate-200 hover:scale-[1.01] hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between h-40 relative overflow-hidden`}
                    style={{ borderTop: `4px solid var(--color-brand)` }}
                  >
                    {/* Top Accent Line based on user's defined color */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${
                      esc.code === 'BES' ? 'bg-red-500' :
                      esc.code === 'BOD' ? 'bg-yellow-400' :
                      esc.code === 'LYS' ? 'bg-purple-500' :
                      esc.code === 'MPL' ? 'bg-orange-500' :
                      esc.code === 'MRS' ? 'bg-emerald-600' :
                      esc.code === 'NCE' ? 'bg-sky-400' :
                      esc.code === 'NTE' ? 'bg-teal-500' : 'bg-pink-400'
                    }`} />

                    {/* Code IATA */}
                    <div className="flex items-center justify-between">
                      <span className={`text-base font-black tracking-tight ${esc.accentBg} px-2.5 py-1 rounded-lg border ${esc.lightBorder}`}>
                        {esc.code}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                    </div>

                    {/* Name of airport */}
                    <div className="mt-2">
                      <h3 className="text-sm font-bold text-slate-800 truncate leading-tight" title={esc.name}>
                        {esc.name}
                      </h3>
                    </div>

                    {/* 3 KPI counts on a single row inside 3 cells */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100 mt-3 text-center">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">En cours</span>
                        <span className="text-xs font-black text-amber-600">{count.enCours}</span>
                      </div>
                      <div className="flex flex-col border-x border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Terminé</span>
                        <span className="text-xs font-black text-emerald-600">{count.termine}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Annulé</span>
                        <span className="text-xs font-black text-slate-500">{count.annule}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 2 : COMMANDES D'UNE ESCALE */}
      {/* ========================================================================= */}
      {viewState.view === 'escale' && viewState.selectedEscaleCode && (() => {
        const escale = getEscaleInfo(viewState.selectedEscaleCode);
        return (
          <div className="space-y-6 animate-fade-in" id="vue-2-escale">
            
            {/* Navigation Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewState({ view: 'accueil' })}
                  className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-200/60"
                  title="Retour à l'accueil"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl font-black text-sm border ${escale.accentBg} ${escale.lightBorder}`}>
                    {escale.code}
                  </span>
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">{escale.name}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Commandes de groupe programmées</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isReadOnly && (
                  <button
                    onClick={handleOpenCreate}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    Nouvelle commande
                  </button>
                )}
              </div>
            </div>

            {/* Active / Archived Filters */}
            <div className="flex border-b border-slate-200/80 gap-1">
              <button
                type="button"
                onClick={() => setEscaleSubTab('actives')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  escaleSubTab === 'actives'
                    ? 'border-amber-500 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Commandes actives ({commandes.filter(c => c.escale === viewState.selectedEscaleCode && c.statut === 'en_cours').length})
              </button>
              <button
                type="button"
                onClick={() => setEscaleSubTab('archivees')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  escaleSubTab === 'archivees'
                    ? 'border-amber-500 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Archives ({commandes.filter(c => c.escale === viewState.selectedEscaleCode && (c.statut === 'termine' || c.statut === 'annule')).length})
              </button>
            </div>

            {/* Grid of the commands (4 columns per row) */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Commandes de l'escale ({filteredEscaleCommandes.length})</h3>
              {filteredEscaleCommandes.length === 0 ? (
                <div className="bg-white p-16 rounded-xl border border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Aucune commande pour l'escale {escale.code}</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Créez la première commande de groupe pour démarrer l'intégration d'un nouveau groupe d'intérimaires.
                  </p>
                  {!isReadOnly && !searchQuery && (
                    <button
                      onClick={handleOpenCreate}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      Créer une commande
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="command-grid-container">
                  {filteredEscaleCommandes.map(cmd => {
                    const cmdEscale = getEscaleInfo(cmd.escale);
                    return (
                      <div
                        key={cmd.id}
                        onClick={() => setViewState({ view: 'commande', selectedEscaleCode: escale.code, selectedCommandeId: cmd.id })}
                        className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-400 hover:scale-[1.01] hover:shadow-md transition-all duration-150 cursor-pointer relative group flex flex-col justify-between min-h-[160px]"
                      >
                        {/* Header card info */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 max-w-[50%]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-sm border ${cmdEscale.accentBg} ${cmdEscale.lightBorder}`}>
                                {cmdEscale.code}
                              </span>
                              {cmd.poei && (
                                <span className="text-[9px] font-black text-purple-700 bg-purple-50 border border-purple-200/60 px-1.5 py-0.5 rounded-sm uppercase">
                                  POEI
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-black text-slate-900 truncate mt-1" title={cmd.client}>
                              {cmd.client}
                            </h4>
                          </div>
                          
                          {/* Suffix session no in the top right */}
                          <span className="bg-slate-100 text-slate-700 text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-md border border-slate-200 truncate max-w-[50%]" title={cmd.reference}>
                            {cmd.reference}
                          </span>
                        </div>

                        {/* Mid content */}
                        <div className="my-4 space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{cmd.poste}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[10px]">
                            <span className="uppercase text-slate-400 font-bold bg-slate-50 px-1 py-0.5 rounded border border-slate-200/60">{cmd.service}</span>
                            <span>•</span>
                            <span>{cmd.nombre_agents} postes à pourvoir</span>
                          </div>
                        </div>

                        {/* Footer info: Organisme de formation */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span className="truncate text-slate-400 max-w-[130px]" title={cmd.organisme_formation || 'Non spécifié'}>
                            {cmd.organisme_formation || 'Pas d\'organisme'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider ${
                            cmd.statut === 'en_cours' ? 'bg-amber-50 text-amber-700 border border-amber-200/40' :
                            cmd.statut === 'termine' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/40' :
                            'bg-slate-100 text-slate-600 border border-slate-200/40'
                          }`}>
                            {cmd.statut === 'en_cours' ? 'En cours' : cmd.statut === 'termine' ? 'Terminé' : 'Annulé'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* VUE 3 : DÉTAIL D'UNE COMMANDE */}
      {/* ========================================================================= */}
      {viewState.view === 'commande' && selectedCommandeObj && (() => {
        const cmd = selectedCommandeObj;
        return (
          <div className="space-y-6 animate-fade-in" id="vue-3-commande-detail">
            
            {/* Header / Reminder navigation */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewState({ view: 'escale', selectedEscaleCode: cmd.escale })}
                  className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-200/60"
                  title="Retour aux commandes"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                      {cmd.reference}
                    </span>
                    {cmd.poei && (
                      <span className="text-[9px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-1.5 rounded uppercase">
                        POEI
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-black text-slate-900 mt-1">
                    {cmd.client} — {cmd.poste}
                  </h2>
                </div>
              </div>

              {/* Status Indicator */}
              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  cmd.statut === 'en_cours' ? 'bg-amber-100 text-amber-800' :
                  cmd.statut === 'termine' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  Statut : {cmd.statut === 'en_cours' ? 'En cours' : cmd.statut === 'termine' ? 'Terminé' : 'Annulé'}
                </span>
              </div>
            </div>

            {/* TAB-NAVIGATION + RIGHT SIDE ACTIONS BAR (On the same row, locked to the right) */}
            <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* 5 Tabs on the left */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveDetailTab('admin')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeDetailTab === 'admin'
                      ? 'bg-amber-500 text-slate-950 shadow-3xs'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Administratif</span>
                </button>
                <button
                  onClick={() => setActiveDetailTab('recrutement')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeDetailTab === 'recrutement'
                      ? 'bg-amber-500 text-slate-950 shadow-3xs'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Recrutement</span>
                </button>
                <button
                  onClick={() => setActiveDetailTab('candidat')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeDetailTab === 'candidat'
                      ? 'bg-amber-500 text-slate-950 shadow-3xs'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Candidat</span>
                </button>
                <button
                  onClick={() => setActiveDetailTab('suivi')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeDetailTab === 'suivi'
                      ? 'bg-amber-500 text-slate-950 shadow-3xs'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>Suivi</span>
                </button>
                <button
                  onClick={() => setActiveDetailTab('organisme')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeDetailTab === 'organisme'
                      ? 'bg-amber-500 text-slate-950 shadow-3xs'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Organisme de formation</span>
                </button>
              </div>

              {/* 4 Actions Icons on the right */}
              <div className="flex items-center gap-2 self-end md:self-auto border-t md:border-t-0 pt-2 md:pt-0 shrink-0">
                
                {/* Modifier (Orange) */}
                {!isReadOnly && (
                  <button
                    onClick={() => handleOpenEdit(cmd)}
                    className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 rounded-lg border border-orange-200/40 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="Modifier la commande"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                )}

                {/* Clôturer (Vert) */}
                {!isReadOnly && cmd.statut === 'en_cours' && (
                  <button
                    onClick={() => {
                      setCustomConfirm({
                        title: "Clôturer la commande",
                        message: "Êtes-vous sûr de vouloir clôturer ce dossier de commande de groupe ? Son statut passera définitivement à 'Terminé'.",
                        actionText: "Oui, clôturer",
                        actionColor: "bg-emerald-600 hover:bg-emerald-700",
                        onConfirm: () => {
                          onUpdateCommande(cmd.id, { statut: 'termine' });
                        }
                      });
                    }}
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded-lg border border-emerald-200/40 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="Clôturer (passer à terminé)"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Clôturer</span>
                  </button>
                )}

                {/* Annuler (Rouge) */}
                {!isReadOnly && cmd.statut === 'en_cours' && (
                  <button
                    onClick={() => {
                      setCustomConfirm({
                        title: "Annuler la commande",
                        message: "Voulez-vous annuler et archiver cette commande de groupe ? Son statut passera définitivement à 'Annulé'.",
                        actionText: "Oui, annuler",
                        actionColor: "bg-rose-600 hover:bg-rose-700",
                        onConfirm: () => {
                          onUpdateCommande(cmd.id, { statut: 'annule' });
                        }
                      });
                    }}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg border border-rose-200/40 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="Annuler (conserver en archive)"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Annuler</span>
                  </button>
                )}

                {/* Réouvrir (Bleu/Indigo) */}
                {!isReadOnly && (cmd.statut === 'termine' || cmd.statut === 'annule') && (
                  <button
                    onClick={() => {
                      setCustomConfirm({
                        title: "Réouvrir la commande",
                        message: "Voulez-vous réouvrir cette commande de groupe ? Son statut repassera à 'En cours'.",
                        actionText: "Oui, réouvrir",
                        actionColor: "bg-blue-600 hover:bg-blue-700",
                        onConfirm: () => {
                          onUpdateCommande(cmd.id, { statut: 'en_cours' });
                        }
                      });
                    }}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded-lg border border-blue-200/40 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="Réouvrir la commande"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Réouvrir</span>
                  </button>
                )}

                {/* Supprimer (Noir) */}
                {!isReadOnly && (
                  <button
                    onClick={() => {
                      setCustomConfirm({
                        title: "Supprimer la commande",
                        message: "Êtes-vous sûr ? Cette action est irréversible et supprimera définitivement toutes les données de cette session.",
                        actionText: "Oui, supprimer",
                        actionColor: "bg-slate-900 hover:bg-black",
                        onConfirm: () => {
                          // Delete related data first
                          supabase.from('commandes_groupe_checklist').delete().eq('commande_id', cmd.id).then(() => {});
                          supabase.from('commandes_groupe_infocall').delete().eq('commande_id', cmd.id).then(() => {});
                          
                          // Clean up localStorage
                          localStorage.removeItem(`checklist_cmd_${cmd.id}`);
                          localStorage.removeItem(`infocall_cmd_${cmd.id}`);
                          localStorage.removeItem(`infocall_dates_cmd_${cmd.id}`);

                          onDeleteCommande(cmd.id);
                          setViewState({ view: 'escale', selectedEscaleCode: cmd.escale });
                        }
                      });
                    }}
                    className="p-2 bg-slate-900 hover:bg-black text-white rounded-lg transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="Supprimer définitivement"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer</span>
                  </button>
                )}

              </div>
            </div>

            {/* TAB CONTENTS (Minimal placeholders / structural layout for layout validation) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm min-h-[300px]">
              
              {activeDetailTab === 'admin' && (
                <div className="space-y-6 animate-fade-in text-xs">
                  
                  {/* Section 2.1 — Encart récapitulatif compact */}
                  <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/60 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs mb-2">
                    <div className="min-w-[120px]">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Client</span>
                      <span className="font-extrabold text-slate-800">{cmd.client}</span>
                    </div>
                    <div className="min-w-[100px]">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Date de commande</span>
                      <span className="font-bold text-slate-700">
                        {cmd.created_at ? new Date(cmd.created_at).toLocaleDateString('fr-FR') : 'Non spécifiée'}
                      </span>
                    </div>
                    <div className="min-w-[120px]">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Mise à disposition</span>
                      <span className="font-bold text-slate-700">{cmd.date_mise_a_disposition || 'Non spécifiée'}</span>
                    </div>
                    <div className="min-w-[100px]">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Service</span>
                      <span className="font-bold text-slate-700">{cmd.service}</span>
                    </div>
                    <div className="min-w-[120px]">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Poste</span>
                      <span className="font-bold text-slate-700">{cmd.poste}</span>
                    </div>
                    <div className="min-w-[70px]">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Quantité</span>
                      <span className="font-extrabold text-slate-800">{cmd.nombre_agents} agent(s)</span>
                    </div>
                    <div className="min-w-[140px]">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Organisme de formation</span>
                      <span className="font-bold text-slate-700">{cmd.organisme_formation || 'Non spécifié'}</span>
                    </div>
                    <div className="min-w-[60px]">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">POEI</span>
                      <span className={`font-black uppercase text-[10px] ${cmd.poei ? 'text-purple-700 bg-purple-50 px-1.5 py-0.5 border border-purple-200 rounded' : 'text-slate-500'}`}>
                        {cmd.poei ? 'Oui' : 'Non'}
                      </span>
                    </div>

                    {/* InfoCall info */}
                    {infocall && (
                      <div className="w-full mt-1 pt-2 border-t border-slate-200/50 flex flex-wrap items-center justify-between gap-2 bg-amber-50/40 p-2.5 rounded-lg border border-amber-200/30 animate-fade-in">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="w-2 h-2 rounded-full bg-amber-500 block animate-pulse" />
                            <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">InfoCall planifié :</span>
                          </div>
                          <div className="shrink-0">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider font-black">Lieu :</span>
                            <span className="font-bold text-slate-800 ml-1">{infocall.lieu || 'Non spécifié'}</span>
                          </div>
                          {infocallDates && infocallDates.length > 0 && (
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider font-black">Créneau(x) :</span>
                              <span className="font-bold text-slate-800 ml-1 truncate" title={infocallDates.map(d => `${new Date(d.date).toLocaleDateString('fr-FR')} à ${d.heure.substring(0, 5)}`).join(' | ')}>
                                {infocallDates.map(d => `${new Date(d.date).toLocaleDateString('fr-FR')} à ${d.heure.substring(0, 5)}`).join(' | ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Stylo (Edit) et Poubelle (Delete) buttons for InfoCall info */}
                        <div className="flex items-center gap-1.5 shrink-0 border-l border-amber-200/60 pl-2">
                          <button
                            type="button"
                            onClick={handleEditInfoCall}
                            className="p-1.5 text-amber-700 hover:text-amber-800 hover:bg-amber-100/50 rounded-lg transition-all cursor-pointer"
                            title="Modifier les détails de l'InfoCall"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomConfirm({
                                title: "Supprimer l'InfoCall",
                                message: "Êtes-vous sûr de vouloir supprimer définitivement toutes les informations de planification de cet InfoCall ? Cette action réinitialisera également l'état de validation correspondant.",
                                actionText: "Supprimer",
                                actionColor: "bg-rose-600 hover:bg-rose-700",
                                onConfirm: handleDeleteInfoCall
                              });
                            }}
                            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Supprimer les détails de l'InfoCall"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section 2.2 & 2.3 — Checklists Section validation + Mise en place avec séparateur */}
                  <div className="flex flex-col lg:flex-row gap-8 pt-2 items-stretch">
                    
                    {/* Section 1: Validation de la commande */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">Validation de la commande</h3>
                      </div>
                      
                      <div className="space-y-3">
                        {checklist
                          .filter(item => item.section === 'validation')
                          .map(item => renderChecklistCard(item))}
                      </div>
                      
                      {/* Commentaire libre section 1 */}
                      <div className="space-y-1.5 pt-2">
                        <label className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider block">Commentaires validation</label>
                        <textarea
                          value={commentaireValidation}
                          onChange={(e) => {
                            setCommentaireValidation(e.target.value);
                            handleSaveCommentary('validation', e.target.value);
                          }}
                          placeholder="Ajouter des notes, précisons ou consignes concernant la validation de la commande..."
                          className="w-full min-h-[90px] p-3 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100/75 focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 rounded-xl outline-none transition-all resize-y"
                        />
                      </div>
                    </div>

                    {/* Vrai séparateur visuel vertical pour les grands écrans */}
                    <div className="hidden lg:block w-[1px] bg-slate-200 self-stretch shrink-0" />
                    {/* Vrai séparateur visuel horizontal pour mobile */}
                    <div className="block lg:hidden h-[1px] bg-slate-200 my-2 shrink-0" />

                    {/* Section 2: Mise en place */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">Mise en place logistique</h3>
                      </div>
                      
                      <div className="space-y-3">
                        {checklist
                          .filter(item => item.section === 'mise_en_place')
                          .map(item => renderChecklistCard(item))}
                      </div>
                      
                      {/* Commentaire libre section 2 */}
                      <div className="space-y-1.5 pt-2">
                        <label className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider block">Commentaires mise en place</label>
                        <textarea
                          value={commentaireMiseEnPlace}
                          onChange={(e) => {
                            setCommentaireMiseEnPlace(e.target.value);
                            handleSaveCommentary('mise_en_place', e.target.value);
                          }}
                          placeholder="Ajouter des notes, détails ou consignes concernant la logistique et mise en place..."
                          className="w-full min-h-[90px] p-3 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100/75 focus:bg-white border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 rounded-xl outline-none transition-all resize-y"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {activeDetailTab === 'recrutement' && (
                <div className="space-y-4 animate-fade-in text-xs">
                  {/* Top Candidate Bar: Search, Status Filters, Action Button */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-200/60">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                      {/* Search bar */}
                      <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Rechercher (nom, prénom, tél, email)..."
                          value={candidatesSearch}
                          onChange={(e) => setCandidatesSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none font-semibold text-slate-800 transition-all text-xs shadow-3xs"
                        />
                        {candidatesSearch && (
                          <button
                            type="button"
                            onClick={() => setCandidatesSearch('')}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Status Filter Buttons */}
                      <div className="flex flex-wrap items-center gap-1 bg-slate-200/55 p-0.5 rounded-lg border border-slate-200">
                        {(['all', 'en_cours', 'convoque', 'retenu', 'non_retenu', 'noshow'] as const).map((stat) => {
                          const label = stat === 'all' ? 'Tous' :
                                        stat === 'en_cours' ? 'En cours' :
                                        stat === 'convoque' ? 'Convoqué' :
                                        stat === 'retenu' ? 'Retenu' :
                                        stat === 'non_retenu' ? 'Non retenu' : 'Noshow';
                          const active = candidatesStatusFilter === stat;
                          return (
                            <button
                              key={stat}
                              type="button"
                              onClick={() => setCandidatesStatusFilter(stat)}
                              className={`px-2 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                                active
                                  ? 'bg-slate-800 text-white shadow-2xs'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Sub-filter by evaluation score for Retenu */}
                      {candidatesStatusFilter === 'retenu' && (
                        <div className="flex items-center gap-1.5 animate-fade-in pl-2 border-l border-slate-200">
                          <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider shrink-0">Score :</span>
                          <div className="flex items-center gap-0.5 bg-slate-200/55 p-0.5 rounded-lg border border-slate-200">
                            {(['all', '++', '+', '+-', '-', '--'] as const).map((score) => {
                              const active = preResultFilter === score;
                              return (
                                <button
                                  key={score}
                                  type="button"
                                  onClick={() => setPreResultFilter(score)}
                                  className={`px-1.5 py-0.5 text-[9px] font-black rounded-md transition-all cursor-pointer ${
                                    active
                                      ? 'bg-[#0062FF] text-white shadow-2xs'
                                      : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {score === 'all' ? 'Tous' : score}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => setIsNewCandidateModalOpen(true)}
                          className="px-3.5 py-1.5 bg-[#0062FF] hover:bg-blue-700 text-white font-black rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> Nouveau
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Candidates List Render */}
                  {filteredCandidates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 bg-slate-50 rounded-2xl border border-slate-150 border-dashed text-center">
                      <div className="p-3 bg-slate-200/50 rounded-full text-slate-400 mb-2.5">
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-800 mb-1">Aucun candidat trouvé</h4>
                      <p className="text-[11px] text-slate-500 max-w-xs leading-normal">
                        {candidatesSearch || candidatesStatusFilter !== 'all'
                          ? "Aucun candidat ne correspond à vos filtres de recherche pour cette commande."
                          : "Commencez par ajouter un candidat en entretien de recrutement pour cette commande."}
                      </p>
                      {(!candidatesSearch && candidatesStatusFilter === 'all' && !isReadOnly) && (
                        <button
                          type="button"
                          onClick={() => setIsNewCandidateModalOpen(true)}
                          className="mt-3.5 text-xs font-black text-[#0062FF] hover:underline cursor-pointer"
                        >
                          + Ajouter le premier candidat
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredCandidates.map((c) => {
                        const isExpanded = expandedCandidateIds.has(c.id);
                        
                        // Statut branding colors
                        const statusColor = c.statut === 'en_cours' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            c.statut === 'convoque' ? 'bg-amber-50 text-amber-700 border-amber-200/80' :
                                            c.statut === 'retenu' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            c.statut === 'non_retenu' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                            'bg-purple-50 text-purple-700 border-purple-200';
                        
                        const statusLabel = c.statut === 'en_cours' ? 'En cours' :
                                            c.statut === 'convoque' ? 'Convoqué' :
                                            c.statut === 'retenu' ? 'Retenu' :
                                            c.statut === 'non_retenu' ? 'Non retenu' : 'Noshow';

                        return (
                          <div
                            key={c.id}
                            className={`rounded-2xl border bg-white transition-all overflow-hidden ${
                              isExpanded 
                                ? 'border-slate-300 shadow-md shadow-slate-100/50 ring-1 ring-slate-100' 
                                : 'border-slate-200 hover:border-slate-300 shadow-xs'
                            }`}
                          >
                            {/* Card Header */}
                            <div className="p-3.5 flex items-center justify-between gap-3 bg-slate-50/20">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="p-2 bg-slate-100 border border-slate-200/80 rounded-xl shrink-0">
                                  <User className="w-4 h-4 text-slate-500" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-black text-slate-900 text-sm leading-tight flex flex-wrap items-center gap-2">
                                    <span>{c.nom.toUpperCase()} {c.prenom}</span>
                                    {c.pre_resultat && (
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider shrink-0 ${
                                        c.pre_resultat === '++' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        c.pre_resultat === '+' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                        c.pre_resultat === '+-' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        c.pre_resultat === '-' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                        'bg-rose-100 text-rose-800 border-rose-300'
                                      }`} title={`Évaluation : ${c.pre_resultat}`}>
                                        {c.pre_resultat === '++' && <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse shrink-0" />}
                                        {c.pre_resultat === '+' && <ThumbsUp className="w-2.5 h-2.5 text-teal-600 shrink-0" />}
                                        {c.pre_resultat === '+-' && <AlertCircle className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
                                        {c.pre_resultat === '-' && <ThumbsDown className="w-2.5 h-2.5 text-rose-500 shrink-0" />}
                                        {c.pre_resultat === '--' && <AlertCircle className="w-2.5 h-2.5 text-rose-700 shrink-0" />}
                                        Eval {c.pre_resultat}
                                      </span>
                                    )}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-slate-450">
                                    {c.telephone && <span className="truncate">📞 {c.telephone}</span>}
                                    {c.telephone && c.email && <span>•</span>}
                                    {c.email && <span className="truncate">✉️ {c.email}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Badge de Statut */}
                                <span className={`px-2.5 py-1 border text-[10px] font-black uppercase tracking-wider rounded-lg ${statusColor}`}>
                                  {statusLabel}
                                </span>

                                {/* Boutons Action */}
                                <button
                                  type="button"
                                  onClick={() => toggleCandidateExpansion(c.id)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                  title={isExpanded ? "Replier la fiche" : "Déployer la fiche"}
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                {!isReadOnly && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCandidate(c);
                                        setEditCandidateForm({
                                          nom: c.nom,
                                          prenom: c.prenom,
                                          telephone: c.telephone || '',
                                          email: c.email || ''
                                        });
                                      }}
                                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                      title="Modifier le nom, prénom, téléphone ou email..."
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCandidate(c.id)}
                                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                      title="Supprimer ce candidat"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Expanded Operational Content */}
                            {isExpanded && (
                              <div className="p-4 border-t border-slate-150/80 bg-white space-y-6 animate-fade-in text-[11px] font-semibold text-slate-700">
                                
                                {/* 3-Section layout block */}
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                                  
                                  {/* Section 1 : Pré-qualification téléphonique */}
                                  <div className="bg-slate-50/45 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                                      <span className="w-5 h-5 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">1</span>
                                      <h5 className="font-black uppercase tracking-wider text-slate-800 text-[10px]">Pré-qualification téléphonique</h5>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                      {/* Recruteur & Dates */}
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Recruteur préqual</label>
                                        <input
                                          type="text"
                                          disabled={isReadOnly}
                                          value={c.recruteur_prequal || ''}
                                          onChange={(e) => handleUpdateCandidate(c.id, { recruteur_prequal: e.target.value })}
                                          placeholder="Nom du recruteur..."
                                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Date pré-qual</label>
                                        <input
                                          type="date"
                                          disabled={isReadOnly}
                                          value={c.date_prequal || ''}
                                          onChange={(e) => handleUpdateCandidate(c.id, { date_prequal: e.target.value })}
                                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Date convocation entretien</label>
                                        <input
                                          type="date"
                                          disabled={isReadOnly}
                                          value={c.date_convocation || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            handleUpdateCandidate(c.id, { 
                                              date_convocation: val,
                                              // Auto-pass to 'convoque' status if convocation date is assigned
                                              ...(val && c.statut === 'en_cours' ? { statut: 'convoque' } : {})
                                            });
                                          }}
                                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Niveau d'anglais</label>
                                        <select
                                          disabled={isReadOnly}
                                          value={c.niveau_anglais || ''}
                                          onChange={(e) => handleUpdateCandidate(c.id, { niveau_anglais: e.target.value })}
                                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none"
                                        >
                                          <option value="">Non évalué</option>
                                          <option value="A1">A1 - Débutant</option>
                                          <option value="A2">A2 - Élémentaire</option>
                                          <option value="B1">B1 - Intermédiaire</option>
                                          <option value="B2">B2 - Intermédiaire Supérieur</option>
                                          <option value="C1">C1 - Avancé</option>
                                          <option value="C2">C2 - Maîtrise</option>
                                        </select>
                                      </div>
                                    </div>

                                    {/* Toggle Questions Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                                      <div className="space-y-1.5 flex flex-col justify-between">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Inscrit France Travail ?</label>
                                        <BooleanToggle
                                          value={c.inscrit_ft}
                                          onChange={(val) => handleUpdateCandidate(c.id, { inscrit_ft: val })}
                                          disabled={isReadOnly}
                                        />
                                      </div>

                                      {c.inscrit_ft && (
                                        <div className="space-y-1 animate-fade-in">
                                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Numéro d'identifiant FT</label>
                                          <input
                                            type="text"
                                            disabled={isReadOnly}
                                            value={c.identifiant_ft || ''}
                                            onChange={(e) => handleUpdateCandidate(c.id, { identifiant_ft: e.target.value })}
                                            placeholder="Identifiant..."
                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none"
                                          />
                                        </div>
                                      )}

                                      <div className="space-y-1.5 flex flex-col justify-between">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Casier judiciaire vierge ?</label>
                                        <BooleanToggle
                                          value={c.casier_judiciaire_vierge}
                                          onChange={(val) => handleUpdateCandidate(c.id, { casier_judiciaire_vierge: val })}
                                          disabled={isReadOnly}
                                        />
                                      </div>

                                      <div className="space-y-1.5 flex flex-col justify-between">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Permis B + Véhiculé ?</label>
                                        <ThreeWayToggle
                                          value={c.permis_b_vehicule}
                                          onChange={(val) => handleUpdateCandidate(c.id, { permis_b_vehicule: val })}
                                          disabled={isReadOnly}
                                        />
                                      </div>

                                      <div className="space-y-1.5 flex flex-col justify-between">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Horaires décalés acceptés ?</label>
                                        <BooleanToggle
                                          value={c.horaires_decales}
                                          onChange={(val) => handleUpdateCandidate(c.id, { horaires_decales: val })}
                                          disabled={isReadOnly}
                                        />
                                      </div>

                                      <div className="space-y-1.5 flex flex-col justify-between">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Port de charge possible ?</label>
                                        <ThreeWayToggle
                                          value={c.port_de_charge}
                                          onChange={(val) => handleUpdateCandidate(c.id, { port_de_charge: val })}
                                          disabled={isReadOnly}
                                        />
                                      </div>
                                    </div>

                                    {/* Textareas */}
                                    <div className="space-y-3 pt-1">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Compte rendu d'échange</label>
                                        <textarea
                                          disabled={isReadOnly}
                                          value={c.compte_rendu_echange || ''}
                                          onChange={(e) => handleUpdateCandidate(c.id, { compte_rendu_echange: e.target.value })}
                                          placeholder="Consigner l'entretien téléphonique..."
                                          className="w-full min-h-[60px] px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none text-[11px] font-semibold"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">Points d'alerte identifiés</label>
                                        <textarea
                                          disabled={isReadOnly}
                                          value={c.points_alerte_prequal || ''}
                                          onChange={(e) => handleUpdateCandidate(c.id, { points_alerte_prequal: e.target.value })}
                                          placeholder="Indiquer les freins de recrutement potentiels..."
                                          className="w-full min-h-[50px] px-2.5 py-1.5 bg-white border border-slate-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-100 rounded-lg outline-none text-[11px] font-semibold text-rose-800 bg-rose-50/20"
                                        />
                                      </div>
                                    </div>

                                    {/* Actions rapides de statut de préqualification */}
                                    {!isReadOnly && (
                                      <div className="pt-3 border-t border-slate-200 space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-450 block">Changer le statut du candidat</label>
                                        <div className="grid grid-cols-3 gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateCandidate(c.id, { statut: 'en_cours' })}
                                            className={`py-1.5 px-2 text-[10px] font-black rounded-lg transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                                              c.statut === 'en_cours'
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                                : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50/50'
                                            }`}
                                          >
                                            <span className={`w-1.5 h-1.5 rounded-full ${c.statut === 'en_cours' ? 'bg-white' : 'bg-blue-500'} shrink-0`} />
                                            En cours
                                          </button>
                                          
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateCandidate(c.id, { statut: 'convoque' })}
                                            className={`py-1.5 px-2 text-[10px] font-black rounded-lg transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                                              c.statut === 'convoque'
                                                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                                : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50/50'
                                            }`}
                                          >
                                            <span className={`w-1.5 h-1.5 rounded-full ${c.statut === 'convoque' ? 'bg-white' : 'bg-amber-500'} shrink-0`} />
                                            Convoqué
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => handleUpdateCandidate(c.id, { statut: 'non_retenu' })}
                                            className={`py-1.5 px-2 text-[10px] font-black rounded-lg transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                                              c.statut === 'non_retenu'
                                                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                                : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50/50'
                                            }`}
                                          >
                                            <span className={`w-1.5 h-1.5 rounded-full ${c.statut === 'non_retenu' ? 'bg-white' : 'bg-rose-500'} shrink-0`} />
                                            Non retenu
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                  </div>

                                  {/* Section 2 : Entretien de recrutement */}
                                  <div className="bg-slate-50/45 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                                      <span className="w-5 h-5 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">2</span>
                                      <h5 className="font-black uppercase tracking-wider text-slate-800 text-[10px]">Entretien de recrutement</h5>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Recruteur entretien</label>
                                        <input
                                          type="text"
                                          disabled={isReadOnly}
                                          value={c.recruteur_entretien || ''}
                                          onChange={(e) => handleUpdateCandidate(c.id, { recruteur_entretien: e.target.value })}
                                          placeholder="Nom du recruteur..."
                                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Date d'entretien physique / Teams</label>
                                        <input
                                          type="date"
                                          disabled={isReadOnly}
                                          value={c.date_entretien || ''}
                                          onChange={(e) => handleUpdateCandidate(c.id, { date_entretien: e.target.value })}
                                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Date de naissance (JJ/MM/AAAA)</label>
                                        <input
                                          type="date"
                                          disabled={isReadOnly}
                                          value={c.date_naissance || ''}
                                          onChange={(e) => handleUpdateCandidate(c.id, { date_naissance: e.target.value })}
                                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none text-slate-800 font-semibold"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Lieu de naissance</label>
                                        <input
                                          type="text"
                                          disabled={isReadOnly}
                                          value={c.lieu_naissance || ''}
                                          onChange={(e) => handleUpdateCandidate(c.id, { lieu_naissance: e.target.value })}
                                          placeholder="Lieu de naissance..."
                                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none text-slate-800 font-semibold"
                                        />
                                      </div>
                                    </div>

                                    {/* Toggle Questions Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                                      <div className="space-y-1.5 flex flex-col justify-between">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Confirmation qualifications ?</label>
                                        <BooleanToggle
                                          value={c.confirmation_qualification}
                                          onChange={(val) => handleUpdateCandidate(c.id, { confirmation_qualification: val })}
                                          disabled={isReadOnly}
                                        />
                                      </div>

                                      <div className="space-y-1.5 flex flex-col justify-between">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Disponibilité formation ?</label>
                                        <ThreeWayToggle
                                          value={c.disponibilite_formation}
                                          onChange={(val) => handleUpdateCandidate(c.id, { disponibilite_formation: val })}
                                          disabled={isReadOnly}
                                        />
                                      </div>

                                      <div className="space-y-1.5 flex flex-col justify-between">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Disponibilité sur toute la saison ?</label>
                                        <ThreeWayToggle
                                          value={c.disponibilite_saison}
                                          onChange={(val) => handleUpdateCandidate(c.id, { disponibilite_saison: val })}
                                          disabled={isReadOnly}
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pré-résultat d'évaluation</label>
                                        <select
                                          disabled={isReadOnly}
                                          value={c.pre_resultat || ''}
                                          onChange={(e) => handleUpdateCandidate(c.id, { pre_resultat: e.target.value })}
                                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none"
                                        >
                                          <option value="">Sélectionner...</option>
                                          <option value="++">++ (Excellent)</option>
                                          <option value="+">+ (Favorable)</option>
                                          <option value="+-">+- (Réserves)</option>
                                          <option value="-">- (Défavorable)</option>
                                          <option value="--">-- (Rédhibitoire)</option>
                                        </select>
                                      </div>
                                    </div>

                                    {/* Textareas */}
                                    <div className="space-y-3 pt-1">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Compte rendu d'entretien</label>
                                        <textarea
                                          disabled={isReadOnly}
                                          value={c.compte_rendu_entretien || ''}
                                          onChange={(e) => handleUpdateCandidate(c.id, { compte_rendu_entretien: e.target.value })}
                                          placeholder="Synthèse de l'évaluation physique..."
                                          className="w-full min-h-[60px] px-2.5 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none text-[11px] font-semibold"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">Points d'alerte entretien</label>
                                        <textarea
                                          disabled={isReadOnly}
                                          value={c.points_alerte_entretien || ''}
                                          onChange={(e) => handleUpdateCandidate(c.id, { points_alerte_entretien: e.target.value })}
                                          placeholder="Remarques spécifiques de vigilance d'embauche..."
                                          className="w-full min-h-[50px] px-2.5 py-1.5 bg-white border border-slate-200 focus:border-rose-400 focus:ring-1 focus:ring-rose-100 rounded-lg outline-none text-[11px] font-semibold text-rose-800 bg-rose-50/20"
                                        />
                                      </div>
                                    </div>

                                    {/* Résultat final Validation Panel */}
                                    <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 block">DÉCISION DE RECRUTEMENT FINALE</label>
                                      <div className="grid grid-cols-3 gap-2">
                                        <button
                                          type="button"
                                          disabled={isReadOnly}
                                          onClick={() => handleUpdateCandidate(c.id, { resultat: 'retenu' })}
                                          className={`py-2 px-1 text-[10px] font-black uppercase tracking-wider border rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                                            c.resultat === 'retenu'
                                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-150/50'
                                              : 'bg-emerald-50/40 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                                          }`}
                                        >
                                          <UserCheck className="w-4 h-4 shrink-0" />
                                          Retenu
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isReadOnly}
                                          onClick={() => handleUpdateCandidate(c.id, { resultat: 'non_retenu' })}
                                          className={`py-2 px-1 text-[10px] font-black uppercase tracking-wider border rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                                            c.resultat === 'non_retenu'
                                              ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-150/50'
                                              : 'bg-rose-50/40 border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white'
                                          }`}
                                        >
                                          <XCircle className="w-4 h-4 shrink-0" />
                                          Non retenu
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isReadOnly}
                                          onClick={() => handleUpdateCandidate(c.id, { resultat: 'noshow' })}
                                          className={`py-2 px-1 text-[10px] font-black uppercase tracking-wider border rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                                            c.resultat === 'noshow'
                                              ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-150/50'
                                              : 'bg-purple-50/40 border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white'
                                          }`}
                                        >
                                          <Ghost className="w-4 h-4 shrink-0" />
                                          Noshow
                                        </button>
                                      </div>
                                    </div>

                                  </div>
                                </div>

                                {/* Section 3 : Check-list d'intégration administrative */}
                                <div className="space-y-3 pt-2 border-t border-slate-150">
                                  <div className="flex items-center gap-2 pb-1">
                                    <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">3</span>
                                    <h5 className="font-black uppercase tracking-wider text-slate-800 text-[10px]">Parcours d'intégration & Constitution du dossier</h5>
                                  </div>

                                  {/* Grid layout of 11 items */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {CANDIDATE_INTEGRATION_FIELDS.map((field) => renderCandidateChecklistItem(field, c))}
                                  </div>

                                  {/* Section 3 free comments area */}
                                  <div className="space-y-1.5 pt-3">
                                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Commentaires & Suivi logistique d'accueil</label>
                                    <textarea
                                      disabled={isReadOnly}
                                      value={c.commentaires || ''}
                                      onChange={(e) => handleUpdateCandidate(c.id, { commentaires: e.target.value })}
                                      placeholder="Ajouter des notes libres sur l'intégration du candidat (tailles d'habits commandés, retours badges, suivi d'hébergement, etc)..."
                                      className="w-full min-h-[70px] p-3 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-[#0062FF] rounded-xl outline-none transition-all resize-y"
                                    />
                                  </div>
                                </div>

                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'candidat' && (
                <div className="space-y-4 animate-fade-in text-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <User className="w-4 h-4 text-slate-400" />
                    <h3 className="font-black text-sm text-slate-800">Gestion des Candidats</h3>
                  </div>
                  <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">
                    Gestion et liaison des candidats d'intérimaires rattachés à cette commande de groupe. Ce volet permettra d'attribuer des profils, de suivre les statuts individuels d'intégration et d'éditer en masse les dossiers d'embauche.
                  </p>
                  <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-xl max-w-md text-amber-900 font-semibold flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>La gestion nominative des candidats sera configurée dans l'itération suivante.</span>
                  </div>
                </div>
              )}

              {activeDetailTab === 'suivi' && (
                <div className="space-y-4 animate-fade-in text-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <ListChecks className="w-4 h-4 text-slate-400" />
                    <h3 className="font-black text-sm text-slate-800">Journal de Suivi & Étapes</h3>
                  </div>
                  <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">
                    Historique chronologique et notes de suivi logistique. Permet d'enregistrer les jalons clés de la commande de groupe, les relances clients et les alertes opérationnelles.
                  </p>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-md text-slate-500 font-semibold flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>Suivi temporel des étapes planifié pour l'itération suivante.</span>
                  </div>
                </div>
              )}

              {activeDetailTab === 'organisme' && (
                <div className="space-y-4 animate-fade-in text-xs">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <GraduationCap className="w-4 h-4 text-slate-400" />
                    <h3 className="font-black text-sm text-slate-800">Organisme de Formation</h3>
                  </div>
                  <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">
                    Détails concernant l'organisme de formation chargé d'animer les sessions initiales réglementaires, dates de planification et convention collective de formation professionnelle associée.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Organisme retenu</span>
                      <p className="font-bold text-slate-800 mt-0.5">{cmd.organisme_formation || 'Non désigné'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase font-black">Nombre de sessions</span>
                      <p className="font-bold text-slate-800 mt-0.5">{cmd.nombre_sessions} session(s) de formation</p>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL FORMULAIRE : NOUVELLE COMMANDE / MODIFICATION */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-scale-up">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 border border-amber-200/60 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingCommande ? 'Modifier la Commande' : 'Nouvelle Commande de Groupe'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    {editingCommande ? `Modification du dossier ${editingCommande.reference}` : 'La référence sera calculée et numérotée séquentiellement par escale'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCommande(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reference Preview for fresh creation */}
            {!editingCommande && (
              <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[9px] font-black uppercase text-amber-700">Aperçu de la référence générée</span>
                  <p className="text-sm font-black text-amber-950 mt-0.5">
                    {generateReference(formEscale)}
                  </p>
                </div>
                <p className="text-[10px] text-amber-800 font-semibold max-w-[200px] text-right">
                  Code calculé pour l'année en cours sur l'escale {formEscale}.
                </p>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Escale Dropdown selection */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Escale d'exploitation</label>
                  <select
                    value={formEscale}
                    onChange={(e) => setFormEscale(e.target.value)}
                    disabled={!!editingCommande}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold p-2.5 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-amber-400 disabled:opacity-60 cursor-pointer"
                  >
                    {ESCALES_DATA.map(e => (
                      <option key={e.code} value={e.code}>{e.code} - {e.name}</option>
                    ))}
                  </select>
                </div>

                {/* Client Text Input */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Nom du client</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: TEMPO'AIR, Alyzia..."
                    value={formClient}
                    onChange={(e) => setFormClient(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none font-semibold transition-all"
                  />
                </div>

                {/* Service Dropdown (dynamically fed from base intérimaires, never hardcoded) */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Filière / Service</label>
                  <select
                    value={formService}
                    onChange={(e) => setFormService(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold p-2.5 rounded-xl border border-slate-200 outline-none focus:bg-white focus:border-amber-400 cursor-pointer"
                  >
                    {servicesList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Poste exact */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Intitulé du poste</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Agent d'escale, Bagagiste..."
                    value={formPoste}
                    onChange={(e) => setFormPoste(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none font-semibold transition-all"
                  />
                </div>

                {/* Nombre d'agents */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Nombre d'agents souhaités</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formNombreAgents}
                    onChange={(e) => setFormNombreAgents(Number(e.target.value))}
                    className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none font-semibold transition-all"
                  />
                </div>

                {/* Nombre de sessions */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Nombre de sessions de formation nécessaires</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formNombreSessions}
                    onChange={(e) => setFormNombreSessions(Number(e.target.value))}
                    className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none font-semibold transition-all"
                  />
                </div>

                {/* Organisme de formation */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Organisme de formation souhaité</label>
                  <input
                    type="text"
                    placeholder="ex: Alyzia Academy, CAMAS..."
                    value={formOrganisme}
                    onChange={(e) => setFormOrganisme(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none font-semibold transition-all"
                  />
                </div>

                {/* Date mise à disposition */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Date de mise à disposition souhaitée</label>
                  <input
                    type="date"
                    required
                    value={formDateMAD}
                    onChange={(e) => setFormDateMAD(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none font-semibold transition-all"
                  />
                </div>

                {/* POEI checkbox toggle */}
                <div 
                  onClick={() => setFormPoei(!formPoei)}
                  className="sm:col-span-2 flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 cursor-pointer select-none transition-all mt-2"
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${
                    formPoei ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-300 bg-white'
                  }`}>
                    {formPoei && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs">Dossier sous dispositif POEI ?</span>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Préparation Opérationnelle à l'Emploi Individuelle pour les stagiaires sélectionnés.</p>
                  </div>
                </div>

              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingCommande(null);
                  }}
                  className="px-4.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isReadOnly}
                  className="px-5.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-slate-950 font-black rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {editingCommande ? 'Modifier' : 'Créer'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : PLANIFICATION INFOCALL */}
      {/* ========================================================================= */}
      {isInfoCallModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 border border-amber-200/60 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Réservation InfoCall</h3>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Planifier la réunion collective d'information</p>
                </div>
              </div>
              <button
                onClick={() => setIsInfoCallModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Lieu de l'InfoCall */}
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 block">Lieu / Salle / Lien Teams</label>
                <input
                  type="text"
                  placeholder="ex: Bureau Alyzia CDG, Lien Teams..."
                  value={infoCallLieu}
                  onChange={(e) => setInfoCallLieu(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-[#0062FF] focus:ring-1 focus:ring-blue-100 outline-none font-semibold transition-all"
                />
              </div>

              {/* Liste de dates/heures */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-700 block">Créneau(x) proposé(s)</label>
                  <button
                    type="button"
                    onClick={() => setInfoCallTempDates([...infoCallTempDates, { date: '', heure: '' }])}
                    className="text-[10px] font-black text-amber-600 hover:text-amber-700 cursor-pointer flex items-center gap-0.5"
                  >
                    + Ajouter un créneau
                  </button>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {infoCallTempDates.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 animate-fade-in">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) => {
                            const newDates = [...infoCallTempDates];
                            newDates[idx].date = e.target.value;
                            setInfoCallTempDates(newDates);
                          }}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-amber-400 outline-none"
                        />
                        <input
                          type="time"
                          value={item.heure}
                          onChange={(e) => {
                            const newDates = [...infoCallTempDates];
                            newDates[idx].heure = e.target.value;
                            setInfoCallTempDates(newDates);
                          }}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-amber-400 outline-none"
                        />
                      </div>
                      
                      {infoCallTempDates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newDates = infoCallTempDates.filter((_, i) => i !== idx);
                            setInfoCallTempDates(newDates);
                          }}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsInfoCallModalOpen(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleSaveInfoCall}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : CONFIRMATION PERSONNALISÉE (Remplace window.confirm pour iframes) */}
      {/* ========================================================================= */}
      {customConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scale-up animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-600 border border-amber-200/60 rounded-xl mt-0.5 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900">{customConfirm.title}</h3>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">{customConfirm.message}</p>
              </div>
            </div>
            <div className="pt-2 flex items-center justify-end gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setCustomConfirm(null)}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  customConfirm.onConfirm();
                  setCustomConfirm(null);
                }}
                className={`px-4 py-2 text-white font-black rounded-xl shadow-xs transition-all cursor-pointer ${customConfirm.actionColor}`}
              >
                {customConfirm.actionText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : AJOUT CANDIDAT DE COMMANDE DE GROUPE */}
      {/* ========================================================================= */}
      {isNewCandidateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-up animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-750 border border-blue-100 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Nouveau Candidat</h3>
                  <p className="text-[11px] text-slate-550 font-semibold">Créer une nouvelle fiche de recrutement pour cette commande</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsNewCandidateModalOpen(false);
                  setNewCandidateForm({ nom: '', prenom: '', telephone: '', email: '' });
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Nom <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Nom de famille..."
                    value={newCandidateForm.nom}
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, nom: e.target.value })}
                    className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-[#0062FF] focus:ring-1 focus:ring-blue-100 outline-none font-semibold transition-all text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Prénom <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Prénom..."
                    value={newCandidateForm.prenom}
                    onChange={(e) => setNewCandidateForm({ ...newCandidateForm, prenom: e.target.value })}
                    className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-[#0062FF] focus:ring-1 focus:ring-blue-100 outline-none font-semibold transition-all text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 block">Numéro de téléphone</label>
                <input
                  type="tel"
                  placeholder="ex: 06 12 34 56 78..."
                  value={newCandidateForm.telephone}
                  onChange={(e) => setNewCandidateForm({ ...newCandidateForm, telephone: e.target.value })}
                  className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-[#0062FF] focus:ring-1 focus:ring-blue-100 outline-none font-semibold transition-all text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 block">Adresse e-mail</label>
                <input
                  type="email"
                  placeholder="ex: candidat@email.com..."
                  value={newCandidateForm.email}
                  onChange={(e) => setNewCandidateForm({ ...newCandidateForm, email: e.target.value })}
                  className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-[#0062FF] focus:ring-1 focus:ring-blue-100 outline-none font-semibold transition-all text-slate-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewCandidateModalOpen(false);
                    setNewCandidateForm({ nom: '', prenom: '', telephone: '', email: '' });
                  }}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleAddCandidate}
                  className="px-5 py-2 bg-[#0062FF] hover:bg-blue-700 text-white font-black rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Ajouter le candidat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : MODIFIER CANDIDAT DE COMMANDE DE GROUPE */}
      {/* ========================================================================= */}
      {editingCandidate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-up animate-fade-in text-xs">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-750 border border-blue-100 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Modifier le Candidat</h3>
                  <p className="text-[11px] text-slate-550 font-bold">Modifier les informations de contact de {editingCandidate.prenom} {editingCandidate.nom}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCandidate(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Nom <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Nom de famille..."
                    value={editCandidateForm.nom}
                    onChange={(e) => setEditCandidateForm({ ...editCandidateForm, nom: e.target.value })}
                    className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-[#0062FF] focus:ring-1 focus:ring-blue-100 outline-none font-semibold transition-all text-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 block">Prénom <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Prénom..."
                    value={editCandidateForm.prenom}
                    onChange={(e) => setEditCandidateForm({ ...editCandidateForm, prenom: e.target.value })}
                    className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-[#0062FF] focus:ring-1 focus:ring-blue-100 outline-none font-semibold transition-all text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 block">Numéro de téléphone</label>
                <input
                  type="tel"
                  placeholder="ex: 06 12 34 56 78..."
                  value={editCandidateForm.telephone}
                  onChange={(e) => setEditCandidateForm({ ...editCandidateForm, telephone: e.target.value })}
                  className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-[#0062FF] focus:ring-1 focus:ring-blue-100 outline-none font-semibold transition-all text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-700 block">Adresse e-mail</label>
                <input
                  type="email"
                  placeholder="ex: candidat@email.com..."
                  value={editCandidateForm.email}
                  onChange={(e) => setEditCandidateForm({ ...editCandidateForm, email: e.target.value })}
                  className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white p-2.5 rounded-xl border border-slate-200 focus:border-[#0062FF] focus:ring-1 focus:ring-blue-100 outline-none font-semibold transition-all text-slate-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingCandidate(null)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!editCandidateForm.nom.trim() || !editCandidateForm.prenom.trim()) return;
                    handleUpdateCandidate(editingCandidate.id, {
                      nom: editCandidateForm.nom,
                      prenom: editCandidateForm.prenom,
                      telephone: editCandidateForm.telephone,
                      email: editCandidateForm.email
                    });
                    setEditingCandidate(null);
                  }}
                  className="px-5 py-2 bg-[#0062FF] hover:bg-blue-700 text-white font-black rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
