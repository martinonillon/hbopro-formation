import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  MapPin, 
  Briefcase, 
  Mail, 
  Calendar, 
  ChevronRight, 
  Plus, 
  Award, 
  BookOpen, 
  AlertCircle, 
  Clock, 
  Check, 
  X,
  FileText,
  FileDown,
  Save,
  Printer,
  Copy,
  CheckCircle2,
  ExternalLink,
  CalendarDays,
  Trash2,
  Edit,
  User,
  Tag,
  Receipt
} from 'lucide-react';
import { Collaborator, TrainingLog, TrainingModule } from '../types';
import { ESCALES, SERVICES, FORMATEURS, TYPES, CYCLES, RESULTATS, CONSIGNES, getEscaleStyle, getCategoryOfModule, CATEGORY_COLORS } from '../data/modulesData';
import { formatDateDMY, formatDateFR, normalizeDateToISO } from '../utils/dateUtils';

interface CollaboratorsListProps {
  collaborators: Collaborator[];
  trainingLogs: TrainingLog[];
  modulesCatalog: TrainingModule[];
  onAddCollaborator: (collab: Omit<Collaborator, 'id'>) => void;
  onAssignModule: (collabId: string, moduleName: string, formateur: string, type: string, cycle: string, escale: string, service: string) => void;
  onUpdateTrainingStatus: (logId: string, updates: Partial<TrainingLog>) => void;
  onDeleteTrainingLog: (logId: string) => void;
  onDeleteCollaborator: (collabId: string) => void;
  onClearAllCollaborators?: () => void;
  onUpdateCollaborator?: (collab: Collaborator) => void;
  onEditLog?: (log: TrainingLog) => void;
  onOpenEnrollment?: () => void;
  selectedCollabId?: string | null;
  onSelectCollabId?: (id: string | null) => void;
  isReadOnly?: boolean;
}

export default function CollaboratorsList({
  collaborators,
  trainingLogs,
  modulesCatalog,
  onAddCollaborator,
  onAssignModule,
  onUpdateTrainingStatus,
  onDeleteTrainingLog,
  onDeleteCollaborator,
  onClearAllCollaborators,
  onUpdateCollaborator,
  onEditLog,
  onOpenEnrollment,
  selectedCollabId: propSelectedCollabId,
  onSelectCollabId,
  isReadOnly = false
}: CollaboratorsListProps) {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEscale, setSelectedEscale] = useState('ALL');
  const [selectedService, setSelectedService] = useState('ALL');
  
  // Selected Collab Detail view with synchronization
  const [selectedCollabId, setSelectedCollabIdState] = useState<string | null>(propSelectedCollabId || null);
  
  useEffect(() => {
    if (propSelectedCollabId !== undefined) {
      setSelectedCollabIdState(propSelectedCollabId);
    }
  }, [propSelectedCollabId]);

  const setSelectedCollabId = (id: string | null) => {
    setSelectedCollabIdState(id);
    if (onSelectCollabId) {
      onSelectCollabId(id);
    }
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
  
  // New Collab Form modal
  const [isNewCollabOpen, setIsNewCollabOpen] = useState(false);
  const [newCollabData, setNewCollabData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    escale: 'BOD',
    service: 'PISTE',
    matricule: ''
  });

  // Edit Collab Form modal
  const [isEditCollabOpen, setIsEditCollabOpen] = useState(false);
  const [editCollabData, setEditCollabData] = useState<Collaborator | null>(null);

  // Assign Module Form modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignData, setAssignData] = useState({
    moduleId: modulesCatalog[0]?.id || '',
    formateur: FORMATEURS[0],
    type: TYPES[0],
    cycle: CYCLES[0],
    escale: ESCALES[0],
    service: SERVICES[0]
  });

  // Edit Log Status state
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editLogData, setEditLogData] = useState<{
    resultat: string;
    consigne: string;
    notes: string;
  }>({
    resultat: 'En cours',
    consigne: 'N/A',
    notes: ''
  });

  // Convocation State
  const [isConvocationModalOpen, setIsConvocationModalOpen] = useState(false);
  const [selectedLogForConvocation, setSelectedLogForConvocation] = useState<TrainingLog | null>(null);
  const [convocationStartDate, setConvocationStartDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [convocationEndDate, setConvocationEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [convocationTimeStart1, setConvocationTimeStart1] = useState('09:00');
  const [convocationTimeEnd1, setConvocationTimeEnd1] = useState('12:00');
  const [convocationTimeStart2, setConvocationTimeStart2] = useState('13:30');
  const [convocationTimeEnd2, setConvocationTimeEnd2] = useState('17:00');
  const [convocationFormateur, setConvocationFormateur] = useState('');
  const [convocationLocation, setConvocationLocation] = useState('');
  const [customConvocationNotes, setCustomConvocationNotes] = useState('');
  const [copiedMail, setCopiedMail] = useState(false);

  // Delete States
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
  const [confirmDeleteCollabId, setConfirmDeleteCollabId] = useState<string | null>(null);
  const [isConfirmClearAllOpen, setIsConfirmClearAllOpen] = useState(false);
  const [historyLog, setHistoryLog] = useState<TrainingLog | null>(null);

  // Dynamically extract all unique formateurs from catalog + history logs + static list
  const allFormateurs = useMemo(() => {
    const set = new Set<string>(FORMATEURS);
    modulesCatalog.forEach(m => {
      if (m.formateur) set.add(m.formateur);
    });
    trainingLogs.forEach(l => {
      if (l.formateur) set.add(l.formateur);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [modulesCatalog, trainingLogs]);

  const formattedConvocationDates = useMemo(() => {
    if (!convocationStartDate) return '';
    const startObj = new Date(convocationStartDate);
    const startFormatted = startObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    if (convocationStartDate === convocationEndDate || !convocationEndDate) {
      return `le ${startFormatted}`;
    } else {
      const endObj = new Date(convocationEndDate);
      const endFormatted = endObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      return `du ${startFormatted} au ${endFormatted}`;
    }
  }, [convocationStartDate, convocationEndDate]);

  const formattedConvocationDatesShort = useMemo(() => {
    if (!convocationStartDate) return '';
    const startObj = new Date(convocationStartDate);
    const startFormatted = startObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    
    if (convocationStartDate === convocationEndDate || !convocationEndDate) {
      return startFormatted;
    } else {
      const endObj = new Date(convocationEndDate);
      const endFormatted = endObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${startFormatted} ➔ ${endFormatted}`;
    }
  }, [convocationStartDate, convocationEndDate]);

  // Calculate stats per collaborator
  const collabsWithStats = useMemo(() => {
    return collaborators.map(collab => {
      const logs = trainingLogs.filter(l => l.collaboratorId === collab.id);
      const total = logs.length;
      const completed = logs.filter(l => l.resultat === 'Réussite').length;
      const inProgress = logs.filter(l => l.resultat === 'En cours').length;
      const failed = logs.filter(l => ['Echouée', 'Absent', 'Rattrapage'].includes(l.resultat)).length;
      
      return {
        ...collab,
        totalTrainings: total,
        completedTrainings: completed,
        inProgressTrainings: inProgress,
        failedTrainings: failed,
        complianceRate: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });
  }, [collaborators, trainingLogs]);

  // Filters
  const filteredCollabs = useMemo(() => {
    return collabsWithStats.filter(c => {
      const matchesSearch = `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEscale = selectedEscale === 'ALL' || c.escale === selectedEscale;
      const matchesService = selectedService === 'ALL' || c.service === selectedService;
      return matchesSearch && matchesEscale && matchesService;
    });
  }, [collabsWithStats, searchTerm, selectedEscale, selectedService]);

  // Selected Collaborator Info
  const selectedCollab = useMemo(() => {
    if (!selectedCollabId) return null;
    return collabsWithStats.find(c => c.id === selectedCollabId) || null;
  }, [collabsWithStats, selectedCollabId]);

  const selectedCollabLogs = useMemo(() => {
    if (!selectedCollabId) return [];
    return trainingLogs.filter(l => l.collaboratorId === selectedCollabId);
  }, [trainingLogs, selectedCollabId]);

  // Form Submissions
  const handleCreateCollab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollabData.firstName || !newCollabData.lastName || !newCollabData.email || !newCollabData.matricule) return;
    onAddCollaborator(newCollabData);
    setIsNewCollabOpen(false);
    setNewCollabData({
      firstName: '',
      lastName: '',
      email: '',
      escale: 'BOD',
      service: 'PISTE',
      matricule: ''
    });
  };

  const handleUpdateCollabSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCollabData || !editCollabData.firstName || !editCollabData.lastName || !editCollabData.email || !editCollabData.matricule) return;
    if (onUpdateCollaborator) {
      onUpdateCollaborator(editCollabData);
    }
    setIsEditCollabOpen(false);
    setEditCollabData(null);
  };

  const handleAssignModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollabId) return;
    const module = modulesCatalog.find(m => m.id === assignData.moduleId);
    if (!module) return;

    onAssignModule(
      selectedCollabId,
      module.name,
      assignData.formateur,
      assignData.type,
      assignData.cycle,
      assignData.escale,
      assignData.service
    );
    setIsAssignOpen(false);
  };

  const startEditingLog = (log: TrainingLog) => {
    setEditingLogId(log.id);
    setEditLogData({
      resultat: log.resultat,
      consigne: log.consigne || 'N/A',
      notes: log.notes || ''
    });
  };

  const handleSaveLogUpdate = (logId: string) => {
    onUpdateTrainingStatus(logId, editLogData);
    setEditingLogId(null);
  };

  // Select module changed in assignment form: prefill service/escale/formateur if available
  const handleModuleSelectChange = (modId: string) => {
    const mod = modulesCatalog.find(m => m.id === modId);
    if (mod) {
      setAssignData(prev => ({
        ...prev,
        moduleId: modId,
        formateur: mod.formateur || FORMATEURS[0],
        type: mod.type || TYPES[0],
        cycle: mod.cycle || CYCLES[0],
        escale: mod.escale || ESCALES[0],
        service: mod.service || SERVICES[0]
      }));
    }
  };

  // Generated email templates
  const generatedEmailSubject = useMemo(() => {
    if (!selectedLogForConvocation) return '';
    return `[HUBJOB] Convocation formation : ${selectedLogForConvocation.moduleName}`;
  }, [selectedLogForConvocation]);

  const generatedEmailBody = useMemo(() => {
    if (!selectedLogForConvocation || !selectedCollab) return '';
    const dateStr = formattedConvocationDates;
    const hoursStr = `Matin : de ${convocationTimeStart1} à ${convocationTimeEnd1} | Après-midi : de ${convocationTimeStart2} à ${convocationTimeEnd2}`;
    
    return `Bonjour ${selectedCollab.firstName},\n\n` +
      `Dans le cadre du maintien de vos habilitations professionnelles, vous êtes convoqué(e) à la session de formation suivante :\n\n` +
      `• Formation : ${selectedLogForConvocation.moduleName}\n` +
      `• Date : ${dateStr}\n` +
      `• Horaires : ${hoursStr}\n` +
      `• Formateur / Organisme : ${convocationFormateur || selectedLogForConvocation.formateur}\n` +
      `• Lieu / Adresse : ${convocationLocation || 'Salle de formation Hubjob'}\n` +
      `• Type : ${selectedLogForConvocation.type}\n` +
      `• Escale d'affectation : ${selectedCollab.escale}\n` +
      `• Service rattaché : ${selectedCollab.service}\n` +
      `• Matricule Agent : ${selectedCollab.matricule || 'Non renseigné'}\n` +
      (customConvocationNotes ? `\nConsignes spécifiques : ${customConvocationNotes}\n` : '') +
      `\nMerci de vous présenter muni(e) de vos pièces d'identité, de votre badge d'accès aéroportuaire et de vos équipements de protection individuelle (EPI) si requis.\n\n` +
      `En cas d'empêchement, merci de prévenir votre hiérarchie au moins 48 heures à l'avance.\n\n` +
      `Cordialement,\n` +
      `Le Service Formation Hubjob`;
  }, [
    selectedLogForConvocation, 
    selectedCollab, 
    formattedConvocationDates, 
    convocationTimeStart1, 
    convocationTimeEnd1, 
    convocationTimeStart2, 
    convocationTimeEnd2, 
    convocationFormateur, 
    convocationLocation, 
    customConvocationNotes
  ]);

  // Launch browser printing popup for the full collaborator profile sheet
  const handlePrintCollaboratorProfile = () => {
    if (!selectedCollab) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Le bloqueur de fenêtres contextuelles a empêché l'ouverture de l'impression. Veuillez autoriser les fenêtres contextuelles.");
      return;
    }

    const logsHtml = selectedCollabLogs.map(log => {
      const mod = modulesCatalog.find(m => m.name === log.moduleName);
      const cat = mod ? getCategoryOfModule(mod) : 'Divers';
      
      const resClass = 
        log.resultat === 'Réussite' ? 'badge-success' :
        log.resultat === 'En cours' ? 'badge-info' :
        log.resultat === 'Rattrapage' ? 'badge-warning' :
        log.resultat === 'A traiter' ? 'badge-traiter' :
        'badge-danger';

      const dur = calculateDuration(log);

      return `
        <tr>
          <td>
            <div class="module-name">${log.moduleName}</div>
            <div class="module-cat">${cat}</div>
          </td>
          <td>
            <div class="detail-text">${log.type}</div>
            <div class="cycle-tag">${log.cycle || 'INI'}</div>
          </td>
          <td>
            <div class="detail-text">${formatDateDMY(log.dateDebut)} au ${formatDateDMY(log.dateFin)}</div>
            <div class="lieu-text">${log.lieu || 'Escale Hubjob'}</div>
          </td>
          <td>
            <div class="detail-text">${log.formateur}</div>
            ${log.idFormateur ? `<div class="sub-text">ID: ${log.idFormateur}</div>` : ''}
          </td>
          <td>
            <span class="badge ${resClass}">${log.resultat}</span>
          </td>
          <td class="font-mono text-center">${dur} h</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Fiche Individuelle - ${selectedCollab.firstName} ${selectedCollab.lastName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 30px;
              background-color: #fff;
              line-height: 1.4;
              font-size: 11px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .logo-title-group {
              display: flex;
              flex-direction: column;
            }
            .logo-placeholder {
              font-size: 24px;
              font-weight: 850;
              color: #0f172a;
              letter-spacing: -0.03em;
            }
            .logo-sub {
              font-size: 10px;
              color: #0062FF;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-top: 1px;
            }
            .meta-info {
              text-align: right;
              font-size: 11px;
              color: #64748b;
            }
            .doc-title {
              text-align: center;
              font-size: 16px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: 0.05em;
              margin: 20px 0;
              text-transform: uppercase;
              border: 1px solid #e2e8f0;
              padding: 12px;
              background-color: #f8fafc;
              border-radius: 8px;
            }
            .collab-profile {
              display: flex;
              gap: 20px;
              margin-bottom: 25px;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
              background-color: #f8fafc;
              align-items: center;
            }
            .avatar-bubble {
              height: 55px;
              width: 55px;
              border-radius: 50%;
              background-color: #0f172a;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              font-weight: 700;
              border: 2px solid #e2e8f0;
            }
            .collab-details {
              flex: 1;
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 10px 20px;
            }
            .collab-details .item {
              font-size: 12px;
            }
            .collab-details .label {
              color: #64748b;
              font-weight: 500;
              margin-right: 5px;
            }
            .collab-details .val {
              font-weight: 600;
              color: #0f172a;
            }
            .kpi-container {
              display: flex;
              gap: 10px;
              align-items: center;
            }
            .kpi-box {
              background: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 8px 12px;
              text-align: center;
              min-width: 80px;
            }
            .kpi-box .kpi-lbl {
              font-size: 8px;
              text-transform: uppercase;
              color: #64748b;
              font-weight: 600;
              display: block;
              margin-bottom: 2px;
            }
            .kpi-box .kpi-val {
              font-size: 16px;
              font-weight: 800;
              color: #0f172a;
            }
            .kpi-box .kpi-val.compliance {
              color: #10b981;
            }
            .table-title {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              color: #0f172a;
              letter-spacing: 0.05em;
              margin-bottom: 10px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background-color: #f1f5f9;
              color: #475569;
              font-weight: 700;
              font-size: 10px;
              text-transform: uppercase;
              text-align: left;
              padding: 10px 8px;
              border-bottom: 2px solid #cbd5e1;
            }
            td {
              padding: 10px 8px;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
              font-size: 11px;
            }
            tr:nth-child(even) td {
              background-color: #fafbfd;
            }
            .module-name {
              font-weight: 750;
              color: #0f172a;
              font-size: 11px;
              line-height: 1.2;
            }
            .module-cat {
              font-size: 9px;
              font-weight: 700;
              color: #0062FF;
              margin-top: 2px;
              text-transform: uppercase;
            }
            .detail-text {
              font-weight: 500;
              color: #334155;
            }
            .sub-text {
              font-size: 9px;
              color: #94a3b8;
            }
            .lieu-text {
              font-size: 9px;
              color: #64748b;
              font-style: italic;
              margin-top: 1px;
            }
            .cycle-tag {
              display: inline-block;
              font-family: monospace;
              font-size: 9px;
              font-weight: 700;
              background-color: #eff6ff;
              color: #1d4ed8;
              padding: 1px 4px;
              border-radius: 4px;
              border: 1px solid #bfdbfe;
              margin-top: 2px;
            }
            .badge {
              display: inline-block;
              font-size: 9px;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 9999px;
              text-transform: uppercase;
              text-align: center;
              white-space: nowrap;
            }
            .badge-success {
              background-color: #d1fae5;
              color: #065f46;
              border: 1px solid #a7f3d0;
            }
            .badge-info {
              background-color: #dbeafe;
              color: #1e40af;
              border: 1px solid #bfdbfe;
            }
            .badge-warning {
              background-color: #fef3c7;
              color: #92400e;
              border: 1px solid #fde68a;
            }
            .badge-traiter {
              background-color: #fef08a;
              color: #854d0e;
              border: 1px solid #fef08a;
            }
            .badge-danger {
              background-color: #fee2e2;
              color: #991b1b;
              border: 1px solid #fecaca;
            }
            .font-mono {
              font-family: monospace;
            }
            .text-center {
              text-align: center;
            }
            @media print {
              body { margin: 15px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-title-group">
              <div class="logo-placeholder">Hubjob</div>
              <div class="logo-sub">Ton allié intérim</div>
            </div>
            <div class="meta-info">
              <div>Matricule Agent: <strong>${selectedCollab.matricule || 'N/A'}</strong></div>
              <div>Date d'édition: ${new Date().toLocaleDateString('fr-FR')}</div>
              <div>Escale principale: ${selectedCollab.escale}</div>
            </div>
          </div>

          <div class="doc-title">
            Fiche Individuelle de Suivi de Formation & Aptitude
          </div>

          <div class="collab-profile">
            <div class="avatar-bubble">
              ${selectedCollab.firstName.charAt(0).toUpperCase()}${selectedCollab.lastName.charAt(0).toUpperCase()}
            </div>
            <div class="collab-details">
              <div class="item"><span class="label">Nom complet :</span><span class="val">${selectedCollab.lastName.toUpperCase()} ${selectedCollab.firstName}</span></div>
              <div class="item"><span class="label">Email :</span><span class="val">${selectedCollab.email}</span></div>
              <div class="item"><span class="label">Escale :</span><span class="val">${selectedCollab.escale}</span></div>
              <div class="item"><span class="label">Service rattaché :</span><span class="val">${selectedCollab.service}</span></div>
              <div class="item"><span class="label">Matricule :</span><span class="val">${selectedCollab.matricule || 'N/A'}</span></div>
            </div>
            <div class="kpi-container">
              <div class="kpi-box">
                <span class="kpi-lbl">Conformité</span>
                <span class="kpi-val compliance">${selectedCollab.complianceRate}%</span>
              </div>
              <div class="kpi-box">
                <span class="kpi-lbl">Valides</span>
                <span class="kpi-val">${selectedCollab.completedTrainings}</span>
              </div>
            </div>
          </div>

          <div class="table-title">
            Historique des formations rattachées (${selectedCollabLogs.length})
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 35%">Module / Catégorie</th>
                <th style="width: 15%">Modalité / Cycle</th>
                <th style="width: 20%">Période & Lieu</th>
                <th style="width: 15%">Formateur</th>
                <th style="width: 10%">Résultat</th>
                <th style="width: 5%" class="text-center">Durée</th>
              </tr>
            </thead>
            <tbody>
              ${logsHtml || '<tr><td colspan="6" class="text-center" style="color: #64748b; padding: 20px;">Aucune formation enregistrée pour cet agent.</td></tr>'}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Launch browser printing popup for the document
  const handlePrintConvocation = () => {
    if (!selectedCollab || !selectedLogForConvocation) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Le bloqueur de fenêtres contextuelles a empêché l'ouverture de l'impression. Veuillez autoriser les fenêtres contextuelles.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Convocation - ${selectedCollab.firstName} ${selectedCollab.lastName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 40px;
              background-color: #fff;
              line-height: 1.5;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #082C66;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo-placeholder {
              font-size: 24px;
              font-weight: 800;
              color: #082C66;
              letter-spacing: -0.025em;
            }
            .logo-sub {
              font-size: 11px;
              color: #0062FF;
              font-weight: 600;
              margin-top: 2px;
            }
            .meta-info {
              text-align: right;
              font-size: 12px;
              color: #64748b;
            }
            .doc-title {
              text-align: center;
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: 0.05em;
              margin: 40px 0;
              text-transform: uppercase;
              border: 1px solid #e2e8f0;
              padding: 12px;
              background-color: #f8fafc;
            }
            .info-grid {
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 30px;
              margin-bottom: 40px;
            }
            .info-box {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
              background-color: #f8fafc;
            }
            .info-box h3 {
              margin: 0 0 10px 0;
              font-size: 12px;
              color: #0062FF;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 5px;
            }
            .info-row {
              font-size: 13px;
              margin-bottom: 6px;
            }
            .info-label {
              font-weight: 600;
              color: #475569;
            }
            .letter-body {
              font-size: 14px;
              line-height: 1.6;
              margin-bottom: 50px;
              color: #334155;
            }
            .letter-body p {
              margin-bottom: 15px;
            }
            .signature-area {
              display: flex;
              justify-content: space-between;
              margin-top: 60px;
              font-size: 13px;
            }
            .signature-block {
              width: 220px;
              text-align: center;
            }
            .signature-line {
              margin-top: 50px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 5px;
              color: #64748b;
            }
            .stamp-box {
              border: 2px dashed #94a3b8;
              height: 100px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              color: #94a3b8;
              border-radius: 8px;
              margin-top: 10px;
            }
            @media print {
              body { margin: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo-placeholder">Hubjob</div>
              <div class="logo-sub">Ton allié intérim</div>
            </div>
            <div class="meta-info">
              <div>Réf: CONV-${selectedLogForConvocation.id.substring(0, 8).toUpperCase()}</div>
              <div>Date: ${new Date().toLocaleDateString('fr-FR')}</div>
              <div>Lieu d'émission: Escale de ${selectedCollab.escale}</div>
            </div>
          </div>

          <div class="doc-title">
            Convocation à une session de formation professionnelle
          </div>

          <div class="info-grid">
            <div class="info-box">
              <h3>Collaborateur convoqué</h3>
              <div class="info-row"><span class="info-label">Nom :</span> ${selectedCollab.lastName.toUpperCase()}</div>
              <div class="info-row"><span class="info-label">Prénom :</span> ${selectedCollab.firstName}</div>
              <div class="info-row"><span class="info-label">Matricule :</span> ${selectedCollab.matricule || 'N/A'}</div>
              <div class="info-row"><span class="info-label">Escale :</span> ${selectedCollab.escale}</div>
              <div class="info-row"><span class="info-label">Service :</span> ${selectedCollab.service}</div>
            </div>

            <div class="info-box">
              <h3>Détails de la formation</h3>
              <div class="info-row"><span class="info-label">Intitulé :</span> ${selectedLogForConvocation.moduleName}</div>
              <div class="info-row"><span class="info-label">Date :</span> ${formattedConvocationDates}</div>
              <div class="info-row"><span class="info-label">Matin :</span> de ${convocationTimeStart1} à ${convocationTimeEnd1}</div>
              <div class="info-row"><span class="info-label">Après-midi :</span> de ${convocationTimeStart2} à ${convocationTimeEnd2}</div>
              <div class="info-row"><span class="info-label">Formateur :</span> ${convocationFormateur || selectedLogForConvocation.formateur}</div>
              <div class="info-row"><span class="info-label">Lieu :</span> ${convocationLocation || 'Salle de formation Hubjob'}</div>
              <div class="info-row"><span class="info-label">Type :</span> ${selectedLogForConvocation.type}</div>
            </div>
          </div>

          <div class="letter-body">
            <p>Bonjour ${selectedCollab.firstName},</p>
            <p>
              Dans le cadre de votre plan de développement des compétences et du maintien de vos habilitations professionnelles, nous avons le plaisir de vous convoquer à la session de formation mentionnée ci-dessus.
            </p>
            <p>
              Cette formation est obligatoire pour la bonne exécution de vos missions au sein de l'escale de <strong>${selectedCollab.escale}</strong>. Elle se déroulera au lieu suivant : <strong>${convocationLocation || 'Salle de formation Hubjob'}</strong>.
            </p>
            ${customConvocationNotes ? `<p><strong>Consignes spécifiques :</strong> ${customConvocationNotes}</p>` : ''}
            <p>
              Nous vous rappelons que vous devez vous présenter muni(e) de vos équipements de protection individuelle (EPI) si la formation l'exige, ainsi que de vos pièces d'identité et de votre badge aéroportuaire.
            </p>
            <p>
              En cas d'empêchement majeur, vous êtes tenu(e) d'en informer immédiatement votre hiérarchie et le responsable formation au moins 48 heures à l'avance.
            </p>
            <p>Nous vous souhaitons une excellente session de formation.</p>
          </div>

          <div class="signature-area">
            <div class="signature-block">
              <div class="info-label">Le Collaborateur convoqué</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 5px;">Pour accord, signature précédée de la mention "Lu et approuvé"</div>
              <div class="signature-line">Signature</div>
            </div>
            
            <div class="signature-block">
              <div class="info-label">Le Service Formation Hubjob</div>
              <div class="stamp-box">Tampon Hubjob</div>
              <div class="signature-line">Visa Responsable</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="collaborators-main-grid">
      
      {/* Left panel: List with Search/Filters */}
      <div className="xl:col-span-1 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-900 text-sm">Collaborateurs ({filteredCollabs.length})</h3>
            {!isReadOnly && (
              <div className="flex items-center gap-1.5">
                {onClearAllCollaborators && (
                  <button
                    onClick={() => setIsConfirmClearAllOpen(true)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all border border-rose-200 cursor-pointer"
                    id="clear-all-collabs-btn"
                    title="Vider toute la base de données des intérimaires"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Vider la base
                  </button>
                )}
                <button
                  onClick={() => setIsNewCollabOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                  id="add-collab-btn"
                  title="Ajouter un collaborateur"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Nouveau
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher nom, prénom, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Escale</label>
              <select
                value={selectedEscale}
                onChange={(e) => setSelectedEscale(e.target.value)}
                className="mt-1 block w-full py-1.5 px-2 border border-slate-200 bg-white rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">Toutes les Escales</option>
                {ESCALES.map(esc => (
                  <option key={esc} value={esc}>{esc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Service</label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="mt-1 block w-full py-1.5 px-2 border border-slate-200 bg-white rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">Tous les Services</option>
                {SERVICES.map(srv => (
                  <option key={srv} value={srv}>{srv}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Collaborators List container */}
        <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1" id="collabs-scrollable-list">
          {filteredCollabs.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
              Aucun collaborateur trouvé pour ces filtres.
            </div>
          ) : (
            filteredCollabs.map(collab => {
              const isSelected = selectedCollabId === collab.id;
              return (
                <div
                  key={collab.id}
                  onClick={() => setSelectedCollabId(collab.id)}
                  className={`bg-white border p-4 rounded-xl cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] relative ${
                    isSelected ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200'
                  }`}
                  id={`collab-item-${collab.id}`}
                >
                  <div className="flex items-center gap-3">
                    {(() => {
                      const escStyle = getEscaleStyle(collab.escale);
                      return (
                        <div className={`h-10 w-10 rounded-full ${escStyle.bg} ${escStyle.text} border ${escStyle.border} flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                          {collab.firstName.charAt(0).toUpperCase()}{collab.lastName.charAt(0).toUpperCase()}
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {collab.firstName} {collab.lastName}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {collab.email}
                      </p>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${
                      isSelected ? 'text-blue-600 translate-x-1 font-bold' : 'text-slate-300'
                    }`} />
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const style = getEscaleStyle(collab.escale);
                        return (
                          <span className={`${style.bg} ${style.text} ${style.border} px-1.5 py-0.5 rounded font-mono font-bold border`}>
                            {collab.escale}
                          </span>
                        );
                      })()}
                      <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-100/30">
                        {collab.service}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Taux:</span>
                      <span className={`font-bold ${
                        collab.complianceRate >= 80 ? 'text-emerald-600' :
                        collab.complianceRate >= 50 ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {collab.complianceRate}%
                      </span>
                    </div>
                  </div>

                  {/* Micro Indicators */}
                  <div className="flex items-center gap-2 mt-2 text-[9px] text-slate-400">
                    <span className="flex items-center gap-0.5 text-emerald-600 font-semibold">
                      <Check className="h-2.5 w-2.5" /> {collab.completedTrainings} val.
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-blue-600 font-semibold">
                      <Clock className="h-2.5 w-2.5" /> {collab.inProgressTrainings} en cours
                    </span>
                    {collab.failedTrainings > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-rose-500 font-bold">
                          <AlertCircle className="h-2.5 w-2.5" /> {collab.failedTrainings} alertes
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel: Collaborator Details Sheet (2 cols width on large screens) */}
      <div className="xl:col-span-2">
        {!selectedCollab ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.05)] h-full flex flex-col items-center justify-center space-y-3">
            <div className="p-4 bg-slate-50 text-slate-400 rounded-full">
              <FileText className="h-10 w-10" />
            </div>
            <h4 className="font-semibold text-slate-700 text-sm">Aucun collaborateur sélectionné</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              Sélectionnez un membre de l'équipe dans la liste de gauche pour consulter sa fiche d'aptitude, son historique de formation, et lui attribuer de nouveaux modules.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden h-full flex flex-col" id="collab-details-container">
            {/* Details Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white relative">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {(() => {
                    const escStyle = getEscaleStyle(selectedCollab.escale);
                    return (
                      <div className={`h-16 w-16 rounded-full ${escStyle.bg} ${escStyle.text} border-2 ${escStyle.border} flex items-center justify-center font-bold text-xl shadow-lg shrink-0`}>
                        {selectedCollab.firstName.charAt(0).toUpperCase()}{selectedCollab.lastName.charAt(0).toUpperCase()}
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      {selectedCollab.firstName} {selectedCollab.lastName}
                    </h3>
                    <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> {selectedCollab.email}
                    </p>
                  </div>
                </div>

                {/* KPI stats */}
                <div className="flex items-center gap-3">
                  <div className="bg-slate-800/80 border border-slate-700/50 p-2.5 rounded-xl text-center min-w-[75px]">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Taux</span>
                    <span className="text-lg font-bold text-emerald-400">{selectedCollab.complianceRate}%</span>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700/50 p-2.5 rounded-xl text-center min-w-[75px]">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Validés</span>
                    <span className="text-lg font-bold text-slate-100">{selectedCollab.completedTrainings}</span>
                  </div>
                  
                  {/* Export PDF Button */}
                  <button
                    onClick={handlePrintCollaboratorProfile}
                    className="bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 p-2.5 rounded-xl text-center text-purple-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 self-stretch font-bold text-xs"
                    title="Exporter le dossier complet en PDF"
                  >
                    <FileDown className="h-5 w-5" />
                    <span className="hidden lg:inline">Exporter PDF</span>
                  </button>
                  
                  {/* Modifier Button */}
                  {!isReadOnly && (
                    <button
                      onClick={() => {
                        setEditCollabData(selectedCollab);
                        setIsEditCollabOpen(true);
                      }}
                      className="bg-blue-650/10 hover:bg-blue-600 border border-blue-500/30 p-2.5 rounded-xl text-center text-blue-200 hover:text-white transition-all cursor-pointer flex items-center justify-center self-stretch"
                      title="Modifier cet intérimaire"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  )}

                  {!isReadOnly && (
                    <button
                      onClick={() => setConfirmDeleteCollabId(selectedCollab.id)}
                      className="bg-red-650/10 hover:bg-red-600 border border-red-500/30 p-2.5 rounded-xl text-center text-red-200 hover:text-white transition-all cursor-pointer flex items-center justify-center self-stretch"
                      title="Supprimer cet intérimaire"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Badges bar */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/10 text-xs">
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-blue-400" /> Escale : 
                  {(() => {
                    const style = getEscaleStyle(selectedCollab.escale);
                    return (
                      <strong className="font-mono px-2 py-0.5 rounded ml-1 text-white border" style={{ backgroundColor: style.hex + '33', borderColor: style.hex }}>
                        {selectedCollab.escale}
                      </strong>
                    );
                  })()}
                </span>
                <span className="text-white/20 font-light">|</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Briefcase className="h-3.5 w-3.5 text-blue-400" /> Service : 
                  <strong className="text-white bg-white/10 px-2 py-0.5 rounded ml-1">{selectedCollab.service}</strong>
                </span>
              </div>
            </div>

            {/* List of training modules */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[480px]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-blue-600" /> Fiche d'aptitude & Formations rattachées ({selectedCollabLogs.length})
                </h4>
                
                {!isReadOnly && (
                  <button
                    onClick={() => onOpenEnrollment ? onOpenEnrollment() : setIsAssignOpen(true)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all border border-blue-200/40"
                    id="assign-module-trigger-btn"
                  >
                    <Plus className="h-3.5 w-3.5" /> Assigner une formation
                  </button>
                )}
              </div>

              {selectedCollabLogs.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                  Aucun module n'a été attribué à ce collaborateur pour l'instant. Cliquez sur "Assigner une formation" ci-dessus pour démarrer son parcours de formation.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedCollabLogs.map((log) => {
                    const isEditing = editingLogId === log.id;
                    const mod = modulesCatalog.find(m => m.name === log.moduleName);
                    const cat = mod ? getCategoryOfModule(mod) : 'Divers';
                    const colorConfig = CATEGORY_COLORS[cat] || { hex: '#737373', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };

                    return (
                      <div 
                        key={log.id}
                        className={`border rounded-xl p-4 transition-all relative ${
                          isEditing ? 'border-blue-400 bg-blue-50/10' : 'border-slate-100 hover:bg-slate-50/50'
                        }`}
                        id={`training-card-${log.id}`}
                      >
                        {/* Inline Editor if editing */}
                        {isEditing ? (
                          <div>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                              <div className="min-w-0">
                                <h5 className="text-xs font-bold text-slate-850">{log.moduleName}</h5>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-1">
                                  <span>Formateur: <strong>{log.formateur}</strong></span>
                                  <span>•</span>
                                  <span>Type: <strong>{log.type}</strong></span>
                                  <span>•</span>
                                  <span>Cycle: <strong className="text-slate-700 font-mono">{log.cycle}</strong></span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-dashed border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400">Résultat</label>
                                <select
                                  value={editLogData.resultat}
                                  onChange={(e) => setEditLogData(prev => ({ ...prev, resultat: e.target.value }))}
                                  className="mt-1 block w-full py-1 px-2 border border-slate-200 bg-white rounded text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {RESULTATS.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] uppercase font-bold text-slate-400">Consigne Facture</label>
                                <select
                                  value={editLogData.consigne}
                                  onChange={(e) => setEditLogData(prev => ({ ...prev, consigne: e.target.value }))}
                                  className="mt-1 block w-full py-1 px-2 border border-slate-200 bg-white rounded text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  {CONSIGNES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="md:col-span-3">
                                <label className="text-[9px] uppercase font-bold text-slate-400">Notes / Consignes d'apprentissage</label>
                                <textarea
                                  value={editLogData.notes}
                                  onChange={(e) => setEditLogData(prev => ({ ...prev, notes: e.target.value }))}
                                  placeholder="Ajoutez un commentaire sur la session ou les points à travailler..."
                                  className="mt-1 block w-full p-2 border border-slate-200 rounded text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                                  rows={2}
                                />
                              </div>
                              <div className="md:col-span-3 flex justify-end gap-1.5 mt-1">
                                <button
                                  onClick={() => setEditingLogId(null)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all"
                                >
                                  <X className="h-3 w-3" /> Annuler
                                </button>
                                <button
                                  onClick={() => handleSaveLogUpdate(log.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all"
                                >
                                  <Save className="h-3 w-3" /> Enregistrer
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {/* Bloc principal (Disposition sur 2 colonnes) */}
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                              
                              {/* Colonne de GAUCHE (Alignée à gauche) */}
                              <div className="flex-1 space-y-1.5 min-w-0">
                                {/* 1ère ligne : Tag de catégorie */}
                                <div className="flex items-center">
                                  <span className={`inline-flex items-center gap-1 text-[9px] ${colorConfig.bg} ${colorConfig.text} px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${colorConfig.border}`}>
                                    <Tag className="h-2.5 w-2.5" /> {cat}
                                  </span>
                                </div>

                                {/* 2ème ligne : Nom du module + N° de session */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-xs font-extrabold text-slate-850 leading-tight">
                                    {log.moduleName}
                                  </h5>
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
                                      <span className="font-mono text-[10px] font-extrabold text-[#0062FF] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80 shadow-2xs">
                                        N° {sessionNum}
                                      </span>
                                    );
                                  })()}
                                </div>

                                {/* 3ème ligne : Formateur + ID Formateur */}
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-slate-400 font-medium">Formateur :</span>
                                  <strong className="text-slate-700">{log.formateur}</strong>
                                  {log.idFormateur && (
                                    <span className="font-mono text-[9px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/50">
                                      ID : {log.idFormateur}
                                    </span>
                                  )}
                                </div>

                                {/* 4ème ligne : Type / Cycle */}
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-slate-400 font-medium">Modalité / Cycle :</span>
                                  <strong className="text-slate-700">{log.type}</strong>
                                  <span className="text-slate-300">/</span>
                                  <span className="font-mono text-[9px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100/50">
                                    {log.cycle || 'INI'}
                                  </span>
                                </div>
                              </div>

                              {/* Colonne de DROITE (Alignée à droite, en face des 4 lignes de gauche) */}
                              <div className="flex flex-col sm:items-end gap-2.5 shrink-0 w-full sm:w-auto">
                                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                                  {/* RÉSULTAT / CONSIGNE DE PAYE (non modifiable) */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                      log.resultat === 'Réussite' ? 'bg-[#57AEA6] text-white border-[#57AEA6]' :
                                      log.resultat === 'En cours' ? 'bg-[#0062FF] text-white border-[#0062FF]' :
                                      log.resultat === 'Rattrapage' ? 'bg-amber-500 text-white border-amber-500' :
                                      log.resultat === 'Absent' ? 'bg-rose-600 text-white border-rose-600' :
                                      log.resultat === 'Echouée' ? 'bg-rose-600 text-white border-rose-600' :
                                      log.resultat === 'Annulée' ? 'bg-slate-400 text-white border-slate-400' :
                                      log.resultat === 'A traiter' ? 'bg-yellow-400 text-slate-900 border-yellow-400' :
                                      'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                      {log.resultat}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                                      (log.consigne === 'N/A' || log.consigne === 'Ne pas payer' || !log.consigne) ? 'bg-slate-150 text-slate-700 border-slate-300' :
                                      log.consigne === 'A payer' ? 'bg-purple-600 text-white border-purple-700' :
                                      log.consigne === 'Paye OK' ? 'bg-emerald-600 text-white border-emerald-700' :
                                      log.consigne === 'Facturation client' ? 'bg-orange-500 text-white border-orange-600' :
                                      log.consigne === 'A relancer' ? 'bg-rose-600 text-white border-rose-700 animate-pulse font-extrabold' :
                                      'bg-slate-100 text-slate-700 border-slate-200'
                                    }`}>
                                      {log.consigne || 'N/A'}
                                    </span>
                                  </div>

                                  {/* Historique Button */}
                                  <button
                                    onClick={() => setHistoryLog(log)}
                                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center border border-transparent shrink-0"
                                    title="Historique des modifications"
                                  >
                                    <Clock className="h-4 w-4" />
                                  </button>

                                  {/* Remplacer le bouton Supprimer par une simple icône de corbeille */}
                                  {!isReadOnly && (
                                    <button
                                      onClick={() => setConfirmDeleteLogId(log.id)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-55 p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center border border-transparent shrink-0"
                                      title="Supprimer cette formation"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>

                                {/* Les icônes MAD / CTT / CONV (non modifiable) */}
                                <div className="flex items-center gap-1.5 sm:justify-end">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border transition-all tracking-wide ${
                                    log.madEa 
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
                                  }`} title="Mise à Disposition">
                                    MAD
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border transition-all tracking-wide ${
                                    log.cttHbo 
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
                                  }`} title="Contrat de Travail Temporaire">
                                    CTT
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border transition-all tracking-wide ${
                                    log.convoc 
                                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' 
                                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
                                  }`} title="Convocation">
                                    CONV
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border transition-all tracking-wide ${
                                    log.emrg 
                                      ? 'bg-sky-600 border-sky-600 text-white shadow-xs' 
                                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
                                  }`} title="Émargement">
                                    EMRG
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border transition-all tracking-wide ${
                                    log.attest 
                                      ? 'bg-pink-600 border-pink-600 text-white shadow-xs' 
                                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-50'
                                  }`} title="Attestation">
                                    ATT
                                  </span>
                                </div>
                              </div>

                            </div>

                            {/* Séparateur discret sous le bloc principal */}
                            <div className="my-3 border-t border-slate-100" />

                            {/* Bloc du bas (Aligné à gauche) */}
                            <div className="space-y-1.5 text-[11px] text-slate-500">
                              {(log.datePaye || log.commentairePaye) && (
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-600 bg-purple-50/70 p-1.5 rounded-lg border border-purple-100 flex-wrap">
                                  <span className="font-bold text-purple-900">Paye :</span>
                                  {log.datePaye && <span className="font-mono bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-semibold">Payé le {formatDateDMY(log.datePaye)}</span>}
                                  {log.commentairePaye && <span className="italic text-purple-800">« {log.commentairePaye} »</span>}
                                </div>
                              )}
                              {/* 5ème ligne : Date du ... au ... */}
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                                <span>Date du <strong className="text-slate-700">{formatDateDMY(log.dateDebut)}</strong> au <strong className="text-slate-700">{formatDateDMY(log.dateFin)}</strong></span>
                                <span className="text-slate-300">|</span>
                                <span className="text-slate-400 text-[9px]">Inscrit le {formatDateDMY(log.dateInscription)}</span>
                              </div>

                              {/* Lieu de la formation */}
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                <span>Lieu de formation : <strong className="text-slate-700">{log.lieu || 'Escale de formation Hubjob'}</strong></span>
                              </div>

                              {/* Heures de début/fin 1 et 2 + Durée */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-400 font-medium">Heures :</span>
                                {log.heureDebut1 && log.heureFin1 ? (
                                  <span className="font-semibold text-slate-700 font-mono text-[10px] bg-slate-50 border border-slate-200/50 px-1.5 py-0.5 rounded">
                                    S1 : {log.heureDebut1} - {log.heureFin1}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">S1 : N/A</span>
                                )}
                                {log.heureDebut2 && log.heureFin2 ? (
                                  <span className="font-semibold text-slate-700 font-mono text-[10px] bg-slate-50 border border-slate-200/50 px-1.5 py-0.5 rounded">
                                    S2 : {log.heureDebut2} - {log.heureFin2}
                                  </span>
                                ) : null}
                                <span className="text-slate-300">|</span>
                                <span className="text-slate-400 font-medium">Durée : <strong className="text-blue-700 font-extrabold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/30 font-mono text-[10px]">{calculateDuration(log)} h</strong></span>
                              </div>

                              {/* Données de Facturation (si renseignées) */}
                              {(log.numFacture || log.montantFacture !== undefined || log.dateValidation || log.visa) && (
                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-600 flex-wrap">
                                  <span className="font-bold text-slate-700 flex items-center gap-1 bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-100">
                                    <Receipt className="h-3 w-3 text-[#0062FF]" /> Facture :
                                  </span>
                                  {log.numFacture && (
                                    <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-semibold border border-slate-200">
                                      N° {log.numFacture}
                                    </span>
                                  )}
                                  {log.montantFacture !== undefined && (
                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
                                      {log.montantFacture} €
                                    </span>
                                  )}
                                  {log.dateValidation && (
                                    <span className="text-slate-500 font-mono">
                                      Validée le {formatDateDMY(log.dateValidation)}
                                    </span>
                                  )}
                                  {log.visa && (
                                    <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                                      log.visa === 'Validée' ? 'bg-emerald-600 text-white' :
                                      log.visa === 'Refusée' ? 'bg-rose-600 text-white' :
                                      'bg-amber-500 text-white'
                                    }`}>
                                      Visa: {log.visa}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: New Collaborator Form */}
      {isNewCollabOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <h4 className="font-bold text-sm">Ajouter un nouveau collaborateur</h4>
              <button onClick={() => setIsNewCollabOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCollab} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Prénom *</label>
                  <input
                    required
                    type="text"
                    value={newCollabData.firstName}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Nom *</label>
                  <input
                    required
                    type="text"
                    value={newCollabData.lastName}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Matricule *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: M123456"
                  value={newCollabData.matricule}
                  onChange={(e) => setNewCollabData(prev => ({ ...prev, matricule: e.target.value }))}
                  className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Email professionnel *</label>
                <input
                  required
                  type="email"
                  value={newCollabData.email}
                  onChange={(e) => setNewCollabData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Escale d'affectation</label>
                  <select
                    value={newCollabData.escale}
                    onChange={(e) => setNewCollabData(prev => ({ ...prev, escale: e.target.value }))}
                    className="mt-1 block w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
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
                    className="mt-1 block w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    {SERVICES.map(srv => (
                      <option key={srv} value={srv}>{srv}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewCollabOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Ajouter le collaborateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Collaborator Form */}
      {isEditCollabOpen && editCollabData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <h4 className="font-bold text-sm">Modifier les informations de l'intérimaire</h4>
              <button onClick={() => setIsEditCollabOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateCollabSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Prénom *</label>
                  <input
                    required
                    type="text"
                    value={editCollabData.firstName}
                    onChange={(e) => setEditCollabData(prev => prev ? ({ ...prev, firstName: e.target.value }) : null)}
                    className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Nom *</label>
                  <input
                    required
                    type="text"
                    value={editCollabData.lastName}
                    onChange={(e) => setEditCollabData(prev => prev ? ({ ...prev, lastName: e.target.value }) : null)}
                    className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Matricule *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: M123456"
                  value={editCollabData.matricule || ''}
                  onChange={(e) => setEditCollabData(prev => prev ? ({ ...prev, matricule: e.target.value }) : null)}
                  className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Email professionnel *</label>
                <input
                  required
                  type="email"
                  value={editCollabData.email}
                  onChange={(e) => setEditCollabData(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                  className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Escale d'affectation</label>
                  <select
                    value={editCollabData.escale}
                    onChange={(e) => setEditCollabData(prev => prev ? ({ ...prev, escale: e.target.value }) : null)}
                    className="mt-1 block w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    {ESCALES.map(esc => (
                      <option key={esc} value={esc}>{esc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Service rattaché</label>
                  <select
                    value={editCollabData.service}
                    onChange={(e) => setEditCollabData(prev => prev ? ({ ...prev, service: e.target.value }) : null)}
                    className="mt-1 block w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    {SERVICES.map(srv => (
                      <option key={srv} value={srv}>{srv}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditCollabOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Assign Module Form */}
      {isAssignOpen && selectedCollab && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">Attribuer un module de formation</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Destinataire : {selectedCollab.firstName} {selectedCollab.lastName}</p>
              </div>
              <button onClick={() => setIsAssignOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAssignModule} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Module de formation *</label>
                <select
                  value={assignData.moduleId}
                  onChange={(e) => handleModuleSelectChange(e.target.value)}
                  className="mt-1 block w-full py-2 px-3 border border-slate-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                >
                  {modulesCatalog.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Formateur habituel</label>
                  <select
                    value={assignData.formateur}
                    onChange={(e) => setAssignData(prev => ({ ...prev, formateur: e.target.value }))}
                    className="mt-1 block w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    {FORMATEURS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Type de formation</label>
                  <select
                    value={assignData.type}
                    onChange={(e) => setAssignData(prev => ({ ...prev, type: e.target.value }))}
                    className="mt-1 block w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    {TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Cycle</label>
                  <select
                    value={assignData.cycle}
                    onChange={(e) => setAssignData(prev => ({ ...prev, cycle: e.target.value }))}
                    className="mt-1 block w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    {CYCLES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Escale d'examen</label>
                  <select
                    value={assignData.escale}
                    onChange={(e) => setAssignData(prev => ({ ...prev, escale: e.target.value }))}
                    className="mt-1 block w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    {ESCALES.map(esc => (
                      <option key={esc} value={esc}>{esc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Service concerné</label>
                  <select
                    value={assignData.service}
                    onChange={(e) => setAssignData(prev => ({ ...prev, service: e.target.value }))}
                    className="mt-1 block w-full py-2 px-2 border border-slate-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    {SERVICES.map(srv => (
                      <option key={srv} value={srv}>{srv}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Assigner au collaborateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Convocation (Mail + PDF) Generator */}
      {isConvocationModalOpen && selectedCollab && selectedLogForConvocation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl max-w-6xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up my-8">
            {/* Modal Header */}
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm flex items-center gap-2">
                  <Printer className="h-4 w-4 text-blue-400" />
                  Générateur de Convocation Officielle - Hubjob
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Agent : <strong className="text-white">{selectedCollab.firstName} {selectedCollab.lastName}</strong> (Matricule : {selectedCollab.matricule || 'Non spécifié'})
                </p>
              </div>
              <button 
                onClick={() => setIsConvocationModalOpen(false)} 
                className="text-slate-400 hover:text-white cursor-pointer bg-slate-800 p-1.5 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-h-[85vh] overflow-y-auto">
              
              {/* Left Column (5/12) - Configuration & Mail */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* 1. Date & Time Config */}
                <div className="bg-white border border-slate-250/60 rounded-xl p-4 shadow-sm space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-blue-600" /> 1. Planification de la session
                  </h5>
                  
                  {/* Date début & fin */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Date de début</label>
                      <input
                        type="date"
                        value={convocationStartDate}
                        onChange={(e) => {
                          setConvocationStartDate(e.target.value);
                          if (!convocationEndDate || convocationEndDate < e.target.value) {
                            setConvocationEndDate(e.target.value);
                          }
                        }}
                        className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Date de fin</label>
                      <input
                        type="date"
                        value={convocationEndDate}
                        onChange={(e) => setConvocationEndDate(e.target.value)}
                        className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Heures 1 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Heure de début 1</label>
                      <input
                        type="time"
                        value={convocationTimeStart1}
                        onChange={(e) => setConvocationTimeStart1(e.target.value)}
                        className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Heure de fin 1</label>
                      <input
                        type="time"
                        value={convocationTimeEnd1}
                        onChange={(e) => setConvocationTimeEnd1(e.target.value)}
                        className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Heures 2 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Heure de début 2</label>
                      <input
                        type="time"
                        value={convocationTimeStart2}
                        onChange={(e) => setConvocationTimeStart2(e.target.value)}
                        className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Heure de fin 2</label>
                      <input
                        type="time"
                        value={convocationTimeEnd2}
                        onChange={(e) => setConvocationTimeEnd2(e.target.value)}
                        className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                      />
                    </div>
                  </div>

                  {/* Formateur */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Formateur</label>
                    <select
                      value={convocationFormateur}
                      onChange={(e) => setConvocationFormateur(e.target.value)}
                      className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                    >
                      {allFormateurs.map((formateurName) => (
                        <option key={formateurName} value={formateurName}>{formateurName}</option>
                      ))}
                    </select>
                  </div>

                  {/* Lieu */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Lieu / Adresse</label>
                    <input
                      type="text"
                      value={convocationLocation}
                      onChange={(e) => setConvocationLocation(e.target.value)}
                      placeholder="Ex: Salle de formation Hall B, Orly"
                      className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                    />
                  </div>

                  {/* Notes / Consignes */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Consignes spécifiques / Notes</label>
                    <textarea
                      value={customConvocationNotes}
                      onChange={(e) => setCustomConvocationNotes(e.target.value)}
                      placeholder="Ex: Se présenter munis de vos chaussures de sécurité..."
                      className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50"
                      rows={2}
                    />
                  </div>
                </div>

                {/* 2. Mail Preview */}
                <div className="bg-white border border-slate-250/60 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-blue-600" /> 2. Modèle de mail convoquant
                    </h5>
                    
                    <div className="space-y-2 mt-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Objet de l'email :</span>
                        <input
                          type="text"
                          readOnly
                          value={generatedEmailSubject}
                          className="w-full p-2 border border-slate-100 bg-slate-50 rounded-lg text-xs font-mono text-slate-700 outline-none select-all"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Corps du mail :</span>
                        <textarea
                          readOnly
                          value={generatedEmailBody}
                          className="w-full h-[180px] p-2.5 border border-slate-100 bg-slate-50 rounded-lg text-[11px] font-mono text-slate-650 outline-none select-all leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mail Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedEmailBody);
                        setCopiedMail(true);
                        setTimeout(() => setCopiedMail(false), 2000);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedMail ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" /> Copié !
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copier le texte
                        </>
                      )}
                    </button>
                    <a
                      href={`mailto:${selectedCollab.email}?subject=${encodeURIComponent(generatedEmailSubject)}&body=${encodeURIComponent(generatedEmailBody)}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Ouvrir Outlook
                    </a>
                  </div>
                </div>

              </div>

              {/* Right Column (7/12) - PDF Visual letterhead Preview */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                
                {/* Visual A4 sheet container */}
                <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-md font-sans text-slate-800 flex-1 overflow-y-auto select-none min-h-[500px]">
                  
                  {/* Fake Print Header */}
                  <div className="flex justify-between items-start border-b-2 border-[#082C66] pb-4 mb-4">
                    <div>
                      <div className="text-base font-extrabold text-[#082C66] tracking-tight leading-none">Hubjob</div>
                      <div className="text-[10px] text-[#0062FF] font-bold uppercase mt-1 tracking-wider">Ton allié intérim</div>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-mono space-y-0.5">
                      <div>Réf: CONV-{selectedLogForConvocation.id.substring(0, 8).toUpperCase()}</div>
                      <div>Date d'émission: {new Date().toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>

                  {/* Document Subject */}
                  <div className="text-center font-extrabold text-xs uppercase tracking-wider bg-slate-50 border border-slate-100 py-2.5 rounded-lg text-slate-900 my-4">
                    Lettre de Convocation Individuelle
                  </div>

                  {/* Grid Informational boxes */}
                  <div className="grid grid-cols-2 gap-4 my-4 text-[11px]">
                    <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-lg space-y-1">
                      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Agent convoqué</span>
                      <div>Nom : <strong className="text-slate-800">{selectedCollab.lastName.toUpperCase()}</strong></div>
                      <div>Prénom : <strong className="text-slate-800">{selectedCollab.firstName}</strong></div>
                      <div>Matricule : <strong className="text-slate-800 font-mono">{selectedCollab.matricule || 'Non spécifié'}</strong></div>
                      <div>Affectation : <span>{selectedCollab.escale} / {selectedCollab.service}</span></div>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-lg space-y-1 text-[11px]">
                      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Détails Session</span>
                      <div className="truncate">Intitulé : <strong className="text-slate-800">{selectedLogForConvocation.moduleName}</strong></div>
                      <div>Date : <strong className="text-slate-800">{formattedConvocationDatesShort}</strong></div>
                      <div>Matin : <strong className="text-slate-800 font-mono">{convocationTimeStart1} ➔ {convocationTimeEnd1}</strong></div>
                      <div>Après-midi : <strong className="text-slate-800 font-mono">{convocationTimeStart2} ➔ {convocationTimeEnd2}</strong></div>
                      <div className="truncate">Formateur : <span className="text-slate-700">{convocationFormateur || selectedLogForConvocation.formateur}</span></div>
                      <div className="truncate">Lieu : <span className="text-slate-700 font-semibold">{convocationLocation || 'Salle de formation Hubjob'}</span></div>
                      <div>Type : <span>{selectedLogForConvocation.type}</span></div>
                    </div>
                  </div>

                  {/* Body Paragraphs */}
                  <div className="text-[11px] space-y-3 text-slate-600 leading-relaxed my-4 border-t border-slate-50 pt-3">
                    <p>Bonjour {selectedCollab.firstName},</p>
                    <p>
                      Dans le cadre du maintien de vos aptitudes réglementaires Hubjob, nous vous prions de bien vouloir assister à la session de formation susmentionnée. 
                    </p>
                    {customConvocationNotes && (
                      <p className="bg-amber-50 border border-amber-200/60 text-amber-900 p-2 rounded-lg font-medium italic">
                        " {customConvocationNotes} "
                      </p>
                    )}
                    <p>
                      Veuillez vous présenter à l'adresse indiquée : <strong>{convocationLocation || 'Salle de formation Hubjob'}</strong> aux horaires spécifiés ci-dessus, muni(e) de vos équipements de protection individuelle (EPI) si requis, de votre badge aéroportuaire et d'une pièce d'identité en cours de validité.
                    </p>
                  </div>

                  {/* Fake Signature Stamps */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-slate-100 mt-6 text-[10px] text-slate-500">
                    <div className="text-center">
                      <span className="font-semibold text-slate-700 block mb-1">L'Agent Convoqué</span>
                      <div className="h-12 border border-slate-100 rounded-lg flex items-center justify-center text-[8px] bg-slate-50/30">
                        Signature précédée de la mention "Lu et approuvé"
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="font-semibold text-slate-700 block mb-1">Le Responsable Formation</span>
                      <div className="h-12 border border-blue-100 rounded-lg flex items-center justify-center text-[8px] font-bold text-blue-600/70 uppercase tracking-wider bg-blue-50/20 border-dashed">
                        Tampon Hubjob Certifié
                      </div>
                    </div>
                  </div>

                </div>

                {/* Print button */}
                <button
                  onClick={handlePrintConvocation}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider hover:scale-[1.01]"
                >
                  <Printer className="h-4 w-4" /> Télécharger / Imprimer la lettre de Convocation (PDF)
                </button>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression d'une formation */}
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
                  Êtes-vous sûr de vouloir supprimer cette formation ? Cette action supprimera définitivement cette formation de l'intérimaire.
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

      {/* Modal de confirmation de suppression de l'intérimaire */}
      {confirmDeleteCollabId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-150 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-full shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer cet intérimaire</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Êtes-vous sûr de vouloir supprimer cet intérimaire ? Tout son historique de formation sera également supprimé.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setConfirmDeleteCollabId(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Non
              </button>
              <button
                onClick={() => {
                  onDeleteCollaborator(confirmDeleteCollabId);
                  setConfirmDeleteCollabId(null);
                  setSelectedCollabId(null);
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
                <X className="h-5 w-5" />
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
                        date: formatDateDMY(historyLog.dateInscription),
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

      {/* Confirmation Modal for Clearing All Collaborators */}
      {isConfirmClearAllOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="clear-all-collabs-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Vider toute la base "Intérimaires" ?</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer tous les intérimaires de la base de données ? Cette action effacera définitivement l'ensemble des fiches agents (Supabase & Firestore).
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsConfirmClearAllOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (onClearAllCollaborators) {
                    onClearAllCollaborators();
                  }
                  setIsConfirmClearAllOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Oui, tout supprimer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
