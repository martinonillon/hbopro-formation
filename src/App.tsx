import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  BookOpen, 
  FolderSync, 
  Award, 
  MapPin, 
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Fingerprint,
  CreditCard,
  Receipt,
  Lock,
  KeyRound,
  ShieldAlert,
  Calendar,
  Shield,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { Collaborator, TrainingLog, TrainingModule, RealTimeEvent, AppUser, TabPermission, UserTabPermissions } from './types';
import { RAW_MODULES, getCategoryFromName, ESCALES, SERVICES, FORMATEURS, TYPES, CYCLES } from './data/modulesData';
import { INITIAL_COLLABORATORS, INITIAL_TRAINING_LOGS } from './data/collaboratorsData';
import { DEFAULT_ADMIN_USER, INITIAL_USERS } from './data/usersData';
import { formatDateDMY, formatDateFR, normalizeDateToISO, parseImportDate } from './utils/dateUtils';
import { deduplicateTrainingLogs } from './utils/deduplicateLogs';
import { syncCollection, saveItemToFirestore, deleteItemFromFirestore, saveBulkToFirestore, clearFirestoreCollection } from './lib/firestoreSync';
import { syncSupabaseTable, saveToSupabase, deleteFromSupabase, saveBulkToSupabase, checkAndMigrateLocalStorage, checkSupabaseHealth, clearSupabaseTable, fetchSessionDetails, fetchAllTrainingLogsFromSupabase } from './lib/supabaseSync';
const logoHubjob = '/src/assets/images/logo_hubjob_1784577741492.jpg';

// Lazy load individual sub-components
import Dashboard from './components/Dashboard';
import CollaboratorsList from './components/CollaboratorsList';
import TrainingLogs from './components/TrainingLogs';
import PayrollManagement from './components/PayrollManagement';
import BillingManagement from './components/BillingManagement';
import ModuleCatalog from './components/ModuleCatalog';
import ConsolidationPanel from './components/ConsolidationPanel';
import CalendarView from './components/CalendarView';
import CoverageControl from './components/CoverageControl';
import EnrollmentModal from './components/EnrollmentModal';
import HeaderLogo from './components/HeaderLogo';
import LoginScreen from './components/LoginScreen';
import AdminManagement from './components/AdminManagement';

export default function App() {
  // Users and Auth State
  const [users, setUsers] = useState<AppUser[]>([]);

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const savedUserId = localStorage.getItem('alyzia_current_user_id');
    if (savedUserId === DEFAULT_ADMIN_USER.id) {
      return DEFAULT_ADMIN_USER;
    }
    return null;
  });

  // State initialization with localStorage persistence
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);
  const [editLog, setEditLog] = useState<TrainingLog | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);

  const [modulesCatalog, setModulesCatalog] = useState<TrainingModule[]>([]);

  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  const handleSupabaseWriteError = (errMsg: string) => {
    if (
      !errMsg ||
      errMsg.includes("Could not find the table") ||
      errMsg.includes("permission denied") ||
      errMsg.includes("schema cache") ||
      errMsg.includes("42501") ||
      errMsg.includes("42P01")
    ) {
      console.warn("Supabase write error suppressed (non-fatal):", errMsg);
      return;
    }
    setSupabaseError(errMsg);
    addEvent(`⚠️ Erreur Supabase : ${errMsg}`, 'warning');
  };

  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'collaborators' | 'logs' | 'payroll' | 'billing' | 'catalog' | 'consolidation' | 'calendar' | 'coverageControl' | 'admin'>('dashboard');
  const [calendarInitialDate, setCalendarInitialDate] = useState<string | null>(null);
  const [calendarInitialNumSession, setCalendarInitialNumSession] = useState<string | null>(null);
  const [selectedCollabId, setSelectedCollabId] = useState<string | null>(null);
  const [logsFilter, setLogsFilter] = useState<{
    resultat?: string | string[];
    consigne?: string;
    madEa?: boolean;
    name?: string;
  } | null>(null);

  // Security & Password state for Consolidation tab (code: 010226)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isConsolidationUnlocked, setIsConsolidationUnlocked] = useState(false);

  // Save users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('alyzia_users', JSON.stringify(users));
    } catch (e) {
      console.warn('Impossible de sauvegarder les utilisateurs dans le stockage local:', e);
    }
  }, [users]);

  // Handle Login & Logout
  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    localStorage.setItem('alyzia_current_user_id', user.id);
    
    // Check if current active tab is hidden for this user, if so switch to first visible tab
    if (user.permissions[activeTab] === 'Masquer') {
      const firstAvailable = (Object.keys(user.permissions) as (keyof UserTabPermissions)[]).find(
        k => user.permissions[k] !== 'Masquer'
      );
      if (firstAvailable) {
        setActiveTab(firstAvailable);
      }
    }
    
    const timeString = new Date().toLocaleTimeString('fr-FR');
    const newEvent: RealTimeEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: timeString,
      message: `Connexion de ${user.firstName} ${user.lastName} (${user.username})`,
      type: 'success'
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 50));
  };

  const handleLogout = () => {
    if (currentUser) {
      const timeString = new Date().toLocaleTimeString('fr-FR');
      const newEvent: RealTimeEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: timeString,
        message: `Déconnexion de ${currentUser.firstName} ${currentUser.lastName} (${currentUser.username})`,
        type: 'info'
      };
      setEvents(prev => [newEvent, ...prev].slice(0, 50));
    }
    setCurrentUser(null);
    localStorage.removeItem('alyzia_current_user_id');
  };

  // User Management handlers
  const handleAddUser = (newUser: AppUser) => {
    setUsers(prev => [...prev, newUser]);
    saveItemToFirestore('users', newUser);
    saveToSupabase('users', newUser, handleSupabaseWriteError);
    addEvent(`Nouvel utilisateur créé : ${newUser.firstName} ${newUser.lastName} (${newUser.username})`, 'success');
  };

  const handleUpdateUser = (updatedUser: AppUser) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    saveItemToFirestore('users', updatedUser);
    saveToSupabase('users', updatedUser, handleSupabaseWriteError);
    addEvent(`Mise à jour de l'utilisateur ${updatedUser.firstName} ${updatedUser.lastName} (${updatedUser.username})`, 'info');
  };

  const handleDeleteUser = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete) {
      setUsers(prev => prev.filter(u => u.id !== userId));
      deleteItemFromFirestore('users', userId);
      deleteFromSupabase('users', userId, handleSupabaseWriteError);
      addEvent(`Utilisateur supprimé : ${userToDelete.firstName} ${userToDelete.lastName} (${userToDelete.username})`, 'warning');
    }
  };

  const handleOpenConsolidation = () => {
    if (isConsolidationUnlocked) {
      setActiveTab('consolidation');
    } else {
      setPasswordInput('');
      setPasswordError(false);
      setIsPasswordModalOpen(true);
    }
  };

  const handleOpenEnrollmentOnDate = (dateStr: string, numSessionStr: string) => {
    setEditLog(null);
    setCalendarInitialDate(dateStr);
    setCalendarInitialNumSession(numSessionStr);
    setIsEnrollmentOpen(true);
  };
  
  // Save to localStorage on change with try/catch to avoid QuotaExceededError crashes
  useEffect(() => {
    try {
      localStorage.setItem('alyzia_collaborators', JSON.stringify(collaborators));
    } catch (e) {
      console.warn('Impossible de sauvegarder les collaborateurs dans le stockage local:', e);
    }
  }, [collaborators]);

  useEffect(() => {
    try {
      localStorage.setItem('alyzia_training_logs', JSON.stringify(trainingLogs));
    } catch (err) {
      console.warn('Quota localStorage dépassé pour training_logs. Application du repli sécurisé :', err);
      try {
        // Strip heavy base64 strings so metadata persists cleanly without crashing
        const sanitizedLogs = trainingLogs.map(log => {
          if (log.emrgFileUrl && log.emrgFileUrl.length > 50000) {
            const { emrgFileUrl, ...rest } = log;
            return rest as TrainingLog;
          }
          return log;
        });
        localStorage.setItem('alyzia_training_logs', JSON.stringify(sanitizedLogs));
      } catch (innerErr) {
        console.error('Échec de la sauvegarde de secours dans localStorage :', innerErr);
      }
    }
  }, [trainingLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('alyzia_modules_catalog', JSON.stringify(modulesCatalog));
    } catch (e) {
      console.warn('Impossible de sauvegarder le catalogue de modules dans le stockage local:', e);
    }
  }, [modulesCatalog]);

  // Log events helper
  const addEvent = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timeString = new Date().toLocaleTimeString('fr-FR');
    const newEvent: RealTimeEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: timeString,
      message,
      type
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 50)); // Keep last 50 events
  };

  // Synchronisation Supabase & Firestore en temps réel entre tous les utilisateurs de l'équipe
  useEffect(() => {
    // Health check on load
    checkSupabaseHealth().then(res => {
      if (!res.ok) {
        setSupabaseError(res.error || "Impossible de se connecter à la base Supabase.");
      }
    });

    const handleSyncError = (errMsg: string) => {
      setSupabaseError(errMsg);
    };

    // Supabase Real-time subscriptions
    const unsubSupaCollabs = syncSupabaseTable('collaborators', setCollaborators, [], handleSyncError);
    const unsubSupaLogs = syncSupabaseTable('training_logs', (data: TrainingLog[]) => {
      const { uniqueLogs } = deduplicateTrainingLogs(data);
      setTrainingLogs(uniqueLogs.map(l => ({
        ...l,
        formateur: l.formateur === 'Alyzia - Interne' ? 'Hubjob - Interne' : l.formateur,
        consigne: l.consigne === 'Facture Alyzia' || l.consigne === 'Facture Hubjob' ? 'Facturation client' : l.consigne
      })));
    }, [], handleSyncError);
    const unsubSupaModules = syncSupabaseTable('modules_catalog', setModulesCatalog, [], handleSyncError);
    const unsubSupaUsers = syncSupabaseTable('users', setUsers, [], handleSyncError);

    // Fallback Firestore real-time sync
    const unsubCollabs = syncCollection('collaborators', setCollaborators, []);
    const unsubLogs = syncCollection('training_logs', (data: TrainingLog[]) => {
      const { uniqueLogs } = deduplicateTrainingLogs(data);
      setTrainingLogs(uniqueLogs.map(l => ({
        ...l,
        formateur: l.formateur === 'Alyzia - Interne' ? 'Hubjob - Interne' : l.formateur,
        consigne: l.consigne === 'Facture Alyzia' || l.consigne === 'Facture Hubjob' ? 'Facturation client' : l.consigne
      })));
    }, []);
    const unsubModules = syncCollection('modules_catalog', setModulesCatalog, []);
    const unsubUsers = syncCollection('users', setUsers, []);

    return () => {
      unsubSupaCollabs();
      unsubSupaLogs();
      unsubSupaModules();
      unsubSupaUsers();
      unsubCollabs();
      unsubLogs();
      unsubModules();
      unsubUsers();
    };
  }, []);

  // Handler: Clear/Purge all collaborators from Supabase, Firestore, and state
  const handleClearAllCollaborators = async () => {
    setCollaborators([]);
    localStorage.removeItem('alyzia_collaborators');
    localStorage.removeItem('collaborators');
    localStorage.removeItem('hubjob_collaborators');
    await clearSupabaseTable('collaborators', handleSupabaseWriteError);
    await clearFirestoreCollection('collaborators');
    addEvent("Base de données 'intérimaires' entièrement purgée. Prêt pour un nouvel import.", "warning");
  };

  // Clean and deduplicate all training logs
  const handleDeduplicateLogs = async () => {
    const { uniqueLogs, duplicateCount } = deduplicateTrainingLogs(trainingLogs);
    if (duplicateCount === 0) {
      addEvent("Nettoyage du registre : Aucun doublon trouvé dans l'historique.", "info");
      return { success: true, count: 0 };
    }

    setTrainingLogs(uniqueLogs);
    try {
      localStorage.setItem('alyzia_training_logs', JSON.stringify(uniqueLogs));
    } catch (e) {
      console.warn("localStorage write error", e);
    }

    // Clear remote databases and re-upload unique logs
    await clearSupabaseTable('training_logs', handleSupabaseWriteError);
    await clearFirestoreCollection('training_logs');

    saveBulkToFirestore('training_logs', uniqueLogs);
    await saveBulkToSupabase('training_logs', uniqueLogs, handleSupabaseWriteError);

    addEvent(`Clean des doublons effectué : ${duplicateCount} doublon(s) supprimé(s). (${uniqueLogs.length} suivis conservés dans Supabase).`, "success");
    return { success: true, count: duplicateCount };
  };

  // Add standard event on load
  useEffect(() => {
    addEvent("Base de données distante Supabase connectée (Realtime & Postgres)", "info");
    addEvent("Synchronisation multi-utilisateurs en temps réel activée", "success");
  }, []);

  // Handler: Add Collaborator
  const handleAddCollaborator = (collabData: Omit<Collaborator, 'id'>) => {
    const newId = 'c' + (collaborators.length + 1);
    const newCollab: Collaborator = {
      ...collabData,
      id: newId,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`
    };
    setCollaborators(prev => [...prev, newCollab]);
    saveItemToFirestore('collaborators', newCollab);
    saveToSupabase('collaborators', newCollab, handleSupabaseWriteError);
    addEvent(`Collaborateur ajouté : ${newCollab.firstName} ${newCollab.lastName} (${newCollab.escale})`, 'success');
  };

  const createHistoryEntry = (action: string, author?: string) => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}/${month}/${year}`;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;

    let defaultAuthor = "Martin ONILLON MINÉE";
    if (currentUser) {
      if (currentUser.firstName || currentUser.lastName) {
        defaultAuthor = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      } else if (currentUser.name) {
        defaultAuthor = currentUser.name.replace(/\s*\([^)]*\)/g, '').trim();
      }
    }

    return {
      action,
      date: dateStr,
      heure: timeStr,
      author: author || defaultAuthor
    };
  };

  // Auto-transition to 'A traiter' the day after the end of training
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    let updatedCount = 0;
    
    setTrainingLogs(prev => {
      let changed = false;
      const nextLogs = prev.map(log => {
        const endDate = log.dateFin || log.dateInscription;
        if (log.resultat === 'En cours' && endDate && today > endDate) {
          changed = true;
          updatedCount++;
          
          // Generate a custom action for the history log of this item
          const historyEntry = {
            action: "Transition automatique du statut : 'En cours' → 'A traiter' (fin de formation dépassée)",
            date: `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
            heure: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}:${String(new Date().getSeconds()).padStart(2, '0')}`,
            author: "Système"
          };
          const history = log.history ? [...log.history, historyEntry] : [historyEntry];
          
          return {
            ...log,
            resultat: 'A traiter',
            history
          };
        }
        return log;
      });
      
      if (changed) {
        return nextLogs;
      }
      return prev;
    });

    if (updatedCount > 0) {
      addEvent(`${updatedCount} formation(s) expirée(s) passée(s) automatiquement à 'A traiter'`, 'warning');
    }
  }, []);

  // Handler: Assign training module
  const handleAssignModule = (
    collabId: string, 
    moduleName: string, 
    formateur: string, 
    type: string, 
    cycle: string, 
    escale: string, 
    service: string
  ) => {
    const collab = collaborators.find(c => c.id === collabId);
    if (!collab) return;

    // Check if already assigned and in progress
    const alreadyExists = trainingLogs.some(l => l.collaboratorId === collabId && l.moduleName === moduleName && l.resultat === 'En cours');
    if (alreadyExists) {
      addEvent(`Attention: ${collab.firstName} ${collab.lastName} a déjà ce module en cours`, 'warning');
      return;
    }

    const newLog: TrainingLog = {
      id: 'l' + (trainingLogs.length + 1),
      collaboratorId: collabId,
      collaboratorName: `${collab.firstName} ${collab.lastName}`,
      moduleName,
      formateur,
      type,
      cycle,
      escale,
      service,
      visa: 'En attente',
      resultat: 'En cours',
      consigne: 'N/A',
      dateInscription: new Date().toISOString().split('T')[0],
      history: [createHistoryEntry("Création de la formation")]
    };

    setTrainingLogs(prev => [newLog, ...prev]);
    saveItemToFirestore('training_logs', newLog);
    saveToSupabase('training_logs', newLog, handleSupabaseWriteError);
    addEvent(`Module "${moduleName}" assigné à ${collab.firstName} ${collab.lastName}`, 'info');
  };

  // Handler: Batch register enrollment from the new modal
  const handleRegisterEnrollment = (data: {
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
  }) => {
    const newLogs: TrainingLog[] = [];

    // Fallback auto session number if not explicitly set
    let computedSessionNum = data.numSession;
    if (!computedSessionNum && data.dateDebut) {
      const d = new Date(data.dateDebut);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const prefix = `HBO${yyyy}${mm}`;
        
        // Find existing increments
        const existingNums = trainingLogs
          .map(l => l.numSession)
          .filter((ns): ns is string => !!ns && ns.startsWith(prefix));
        
        let maxInc = 0;
        existingNums.forEach(ns => {
          const incPart = parseInt(ns.slice(prefix.length), 10);
          if (!isNaN(incPart) && incPart > maxInc) maxInc = incPart;
        });
        
        computedSessionNum = `${prefix}${String(maxInc + 1).padStart(2, '0')}`;
      }
    }

    data.collaboratorIds.forEach((collabId, index) => {
      const collab = collaborators.find(c => c.id === collabId);
      if (!collab) return;

      const optionsStr = [
        data.madEa ? 'MAD EA' : '',
        data.cttHbo ? 'CTT HBO' : '',
        data.convoc ? 'CONVOC' : ''
      ].filter(Boolean).join(' | ');

      const scheduleStr = [
        data.heureDebut1 && data.heureFin1 ? `S1: ${data.heureDebut1}-${data.heureFin1}` : '',
        data.heureDebut2 && data.heureFin2 ? `S2: ${data.heureDebut2}-${data.heureFin2}` : ''
      ].filter(Boolean).join(' / ');

      const details: string[] = [];
      if (optionsStr) details.push(`[${optionsStr}]`);
      if (data.idFormateur) details.push(`ID Formateur: ${data.idFormateur}`);
      if (scheduleStr) details.push(`Horaires: ${scheduleStr}`);
      details.push(`Dates: du ${data.dateDebut} au ${data.dateFin}`);
      if (data.notes && data.notes.trim()) details.push(`Note: ${data.notes.trim()}`);
      
      const noteText = details.join(' • ');

      const newLog: TrainingLog = {
        id: 'l-enroll-' + Date.now() + '-' + index + '-' + Math.random().toString(36).substr(2, 4),
        collaboratorId: collabId,
        collaboratorName: `${collab.firstName} ${collab.lastName}`,
        moduleName: data.moduleName,
        formateur: data.formateur,
        type: data.type,
        cycle: data.cycle,
        escale: data.escale,
        service: data.service,
        numSession: computedSessionNum,
        lieu: data.lieu,
        visa: 'En attente',
        resultat: data.resultat || 'En cours',
        consigne: data.consigne || 'N/A',
        dateInscription: new Date().toISOString().split('T')[0],
        dateDebut: data.dateDebut,
        dateFin: data.dateFin,
        notes: noteText,
        cleanNotes: data.notes,
        idFormateur: data.idFormateur,
        heureDebut1: data.heureDebut1,
        heureFin1: data.heureFin1,
        heureDebut2: data.heureDebut2,
        heureFin2: data.heureFin2,
        madEa: data.madEa,
        cttHbo: data.cttHbo,
        convoc: data.convoc,
        history: [createHistoryEntry("Inscription groupée à la formation")]
      };

      newLogs.push(newLog);
    });

    if (newLogs.length > 0) {
      setTrainingLogs(prev => [...newLogs, ...prev]);
      saveBulkToFirestore('training_logs', newLogs);
      saveBulkToSupabase('training_logs', newLogs, handleSupabaseWriteError).then(async (ok) => {
        if (ok) {
          const sessionNumToRefetch = computedSessionNum;
          const freshSessionLogs = await fetchSessionDetails(sessionNumToRefetch);
          if (freshSessionLogs && freshSessionLogs.length > 0) {
            setTrainingLogs(prev => {
              const freshIds = new Set(freshSessionLogs.map((l: any) => l.id));
              const otherLogs = prev.filter(l => l.numSession !== sessionNumToRefetch && !freshIds.has(l.id));
              return [...otherLogs, ...freshSessionLogs];
            });
          }
        }
      });
      addEvent(`Inscription groupée de ${newLogs.length} intérimaire(s) au module "${data.moduleName}" réussie`, 'success');
    }
  };

  // Handler: Delete multiple logs (e.g. session deletion)
  const handleDeleteLogs = (logIds: string[]) => {
    setTrainingLogs(prev => prev.filter(l => !logIds.includes(l.id)));
    logIds.forEach(id => {
      deleteItemFromFirestore('training_logs', id);
      deleteFromSupabase('training_logs', id, handleSupabaseWriteError);
    });
    addEvent(`Suppression de ${logIds.length} enregistrement(s) de formation de la session`, 'warning');
  };

  // Handler: Bulk update multiple logs
  const handleBulkUpdateLogs = (updates: { id: string; changes: Partial<TrainingLog> }[]) => {
    setTrainingLogs(prev => prev.map(log => {
      const item = updates.find(u => u.id === log.id);
      if (!item) return log;

      const updated = { ...log, ...item.changes };
      if (item.changes.resultat === 'Réussite') {
        updated.dateValidation = new Date().toISOString().split('T')[0];
      }
      saveItemToFirestore('training_logs', updated);
      saveToSupabase('training_logs', updated, handleSupabaseWriteError);
      return updated;
    }));
    addEvent(`Modification de masse effectuée pour ${updates.length} participant(s)`, 'success');
  };

  // Handler: Update training status
  const handleUpdateTrainingStatus = (logId: string, updates: Partial<TrainingLog>) => {
    setTrainingLogs(prev => prev.map(log => {
      if (log.id === logId) {
        const history = log.history ? [...log.history] : [
          {
            action: "Création de la formation",
            date: formatDateDMY(log.dateInscription),
            heure: "00:00:00",
            author: "Administrateur"
          }
        ];
        
        const changes: string[] = [];
        if (updates.resultat !== undefined && updates.resultat !== log.resultat) {
          changes.push(`Statut: ${log.resultat} → ${updates.resultat}`);
        }
        if (updates.consigne !== undefined && updates.consigne !== log.consigne) {
          changes.push(`Consigne paye: ${log.consigne || 'N/A'} → ${updates.consigne}`);
        }
        if (updates.datePaye !== undefined && updates.datePaye !== log.datePaye) {
          changes.push(`Date de paye: ${log.datePaye || 'Non définie'} → ${updates.datePaye}`);
        }
        if (updates.commentairePaye !== undefined && updates.commentairePaye !== log.commentairePaye) {
          changes.push(`Commentaire paye mis à jour`);
        }
        if (updates.madEa !== undefined && updates.madEa !== log.madEa) {
          changes.push(`MAD EA: ${log.madEa ? 'Oui' : 'Non'} → ${updates.madEa ? 'Oui' : 'Non'}`);
        }
        if (updates.cttHbo !== undefined && updates.cttHbo !== log.cttHbo) {
          changes.push(`CTT HBO: ${log.cttHbo ? 'Oui' : 'Non'} → ${updates.cttHbo ? 'Oui' : 'Non'}`);
        }
        if (updates.convoc !== undefined && updates.convoc !== log.convoc) {
          changes.push(`Convocation: ${log.convoc ? 'Oui' : 'Non'} → ${updates.convoc ? 'Oui' : 'Non'}`);
        }
        if (updates.notes !== undefined && updates.notes !== log.notes) {
          changes.push(`Notes modifiées`);
        }
        
        const actionText = changes.length > 0 ? `Modification (${changes.join(', ')})` : "Mise à jour des informations";
        history.push(createHistoryEntry(actionText));

        const updated = { ...log, ...updates, history };
        if (updates.resultat === 'Réussite') {
          updated.dateValidation = new Date().toISOString().split('T')[0];
        }
        saveItemToFirestore('training_logs', updated);
        saveToSupabase('training_logs', updated, handleSupabaseWriteError);
        addEvent(`Statut mis à jour pour ${log.collaboratorName} : ${updates.resultat || log.resultat}`, 'success');
        return updated;
      }
      return log;
    }));
  };

  // Handler: Full update of a training log from Edit Mode
  const handleUpdateTrainingLog = (logId: string, data: {
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
    collaboratorIds?: string[];
  }) => {
    const optionsStr = [
      data.madEa ? 'MAD EA' : '',
      data.cttHbo ? 'CTT HBO' : '',
      data.convoc ? 'CONVOC' : ''
    ].filter(Boolean).join(' | ');

    const scheduleStr = [
      data.heureDebut1 && data.heureFin1 ? `S1: ${data.heureDebut1}-${data.heureFin1}` : '',
      data.heureDebut2 && data.heureFin2 ? `S2: ${data.heureDebut2}-${data.heureFin2}` : ''
    ].filter(Boolean).join(' / ');

    const details: string[] = [];
    if (optionsStr) details.push(`[${optionsStr}]`);
    if (data.idFormateur) details.push(`ID Formateur: ${data.idFormateur}`);
    if (scheduleStr) details.push(`Horaires: ${scheduleStr}`);
    details.push(`Dates: du ${data.dateDebut} au ${data.dateFin}`);
    if (data.notes && data.notes.trim()) details.push(`Note: ${data.notes.trim()}`);
    
    const noteText = details.join(' • ');

    let logsToSave: TrainingLog[] = [];
    setTrainingLogs(prev => {
      const targetLog = prev.find(l => l.id === logId);
      if (!targetLog) return prev;

      const targetNumSession = targetLog.numSession?.trim();
      const targetDate = targetLog.dateDebut || targetLog.dateInscription;
      const targetModule = targetLog.moduleName;
      const targetEscale = targetLog.escale;

      const isSessionLog = (l: TrainingLog) => {
        if (targetNumSession && targetNumSession !== '') {
          return l.numSession?.trim() === targetNumSession;
        }
        return (
          (l.dateDebut || l.dateInscription) === targetDate &&
          l.moduleName === targetModule &&
          l.escale === targetEscale
        );
      };

      const sessionLogs = prev.filter(isSessionLog);
      const sessionLogIds = new Set(sessionLogs.map(l => l.id));

      let updatedLogs = prev;

      if (data.collaboratorIds && data.collaboratorIds.length > 0) {
        const targetCollabIds = new Set(data.collaboratorIds);

        // Remove logs for participants no longer selected
        const removedLogs = updatedLogs.filter(l => sessionLogIds.has(l.id) && !targetCollabIds.has(l.collaboratorId));
        removedLogs.forEach(l => {
          deleteItemFromFirestore('training_logs', l.id);
          deleteFromSupabase('training_logs', l.id, handleSupabaseWriteError);
        });

        updatedLogs = updatedLogs.filter(l => {
          if (sessionLogIds.has(l.id)) {
            return targetCollabIds.has(l.collaboratorId);
          }
          return true;
        });

        // Add logs for newly added collaborators
        const existingCollabIds = new Set(sessionLogs.map(l => l.collaboratorId));
        const newCollabIds = data.collaboratorIds.filter(cId => !existingCollabIds.has(cId));

        if (newCollabIds.length > 0) {
          const newLogs: TrainingLog[] = newCollabIds.map((cId, idx) => {
            const collab = collaborators.find(c => c.id === cId);
            const collabName = collab ? `${collab.lastName.toUpperCase()} ${collab.firstName}` : 'Agent Intérimaire';
            
            return {
              id: `log_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
              collaboratorId: cId,
              collaboratorName: collabName,
              moduleName: data.moduleName,
              formateur: data.formateur,
              type: data.type,
              cycle: data.cycle,
              escale: data.escale,
              service: data.service,
              idFormateur: data.idFormateur,
              dateInscription: new Date().toISOString().split('T')[0],
              dateDebut: data.dateDebut,
              dateFin: data.dateFin,
              heureDebut1: data.heureDebut1,
              heureFin1: data.heureFin1,
              heureDebut2: data.heureDebut2,
              heureFin2: data.heureFin2,
              madEa: data.madEa,
              cttHbo: data.cttHbo,
              convoc: data.convoc,
              visa: undefined,
              notes: noteText,
              cleanNotes: data.notes,
              resultat: data.resultat || 'En cours',
              consigne: data.consigne || 'N/A',
              lieu: data.lieu || `Escale de ${data.escale} - Salle de Formation`,
              numSession: data.numSession || targetNumSession || `HBO${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}01`,
              history: [
                createHistoryEntry("Ajout à la session lors de la modification globale")
              ]
            };
          });
          updatedLogs = [...updatedLogs, ...newLogs];
        }
      }

      const finalLogs = updatedLogs.map(log => {
        if (sessionLogIds.has(log.id)) {
          const history = log.history ? [...log.history] : [
            {
              action: "Création de la formation",
              date: formatDateDMY(log.dateInscription),
              heure: "00:00:00",
              author: "Administrateur"
            }
          ];

          const changes: string[] = [];
          if (data.moduleName !== log.moduleName) changes.push(`Module: ${log.moduleName} → ${data.moduleName}`);
          if (data.formateur !== log.formateur) changes.push(`Formateur: ${log.formateur} → ${data.formateur}`);
          if (data.type !== log.type) changes.push(`Type: ${log.type} → ${data.type}`);
          if (data.cycle !== log.cycle) changes.push(`Cycle: ${log.cycle} → ${data.cycle}`);
          if (data.resultat && data.resultat !== log.resultat) changes.push(`Statut: ${log.resultat} → ${data.resultat}`);
          if (data.consigne && data.consigne !== log.consigne) changes.push(`Consigne: ${log.consigne} → ${data.consigne}`);
          if (data.dateDebut !== log.dateDebut || data.dateFin !== log.dateFin) changes.push("Dates modifiées");
          
          const actionText = changes.length > 0 ? `Modification globale (${changes.join(', ')})` : "Modification globale de la session";
          history.push(createHistoryEntry(actionText));

          return {
            ...log,
            moduleName: data.moduleName,
            formateur: data.formateur,
            type: data.type,
            cycle: data.cycle,
            escale: data.escale,
            service: data.service,
            idFormateur: data.idFormateur,
            heureDebut1: data.heureDebut1,
            heureFin1: data.heureFin1,
            heureDebut2: data.heureDebut2,
            heureFin2: data.heureFin2,
            madEa: data.madEa,
            cttHbo: data.cttHbo,
            convoc: data.convoc,
            dateDebut: data.dateDebut,
            dateFin: data.dateFin,
            notes: noteText,
            cleanNotes: data.notes,
            resultat: data.resultat || log.resultat,
            consigne: data.consigne || log.consigne,
            lieu: data.lieu || log.lieu,
            numSession: data.numSession || log.numSession,
            history
          };
        }
        return log;
      });

      logsToSave = finalLogs.filter(l => sessionLogIds.has(l.id) || l.id.startsWith('log_'));
      return finalLogs;
    });

    if (logsToSave.length > 0) {
      saveBulkToFirestore('training_logs', logsToSave);
      saveBulkToSupabase('training_logs', logsToSave, handleSupabaseWriteError).then(async (ok) => {
        if (ok) {
          const sessionNumToRefetch = data.numSession || logsToSave[0]?.numSession;
          if (sessionNumToRefetch) {
            const freshSessionLogs = await fetchSessionDetails(sessionNumToRefetch);
            if (freshSessionLogs && freshSessionLogs.length > 0) {
              setTrainingLogs(prev => {
                const freshIds = new Set(freshSessionLogs.map((l: any) => l.id));
                const otherLogs = prev.filter(l => l.numSession !== sessionNumToRefetch && !freshIds.has(l.id));
                return [...otherLogs, ...freshSessionLogs];
              });
            } else {
              const freshLogs = await fetchAllTrainingLogsFromSupabase();
              if (freshLogs && freshLogs.length > 0) {
                setTrainingLogs(freshLogs);
              }
            }
          } else {
            const freshLogs = await fetchAllTrainingLogsFromSupabase();
            if (freshLogs && freshLogs.length > 0) {
              setTrainingLogs(freshLogs);
            }
          }
        }
      });
    }
    addEvent(`Session de formation mise à jour avec succès pour l'ensemble des participants`, 'success');
  };

  // Handler: Quick anomalous log fix
  const handleQuickFixLog = (logId: string, result: string) => {
    handleUpdateTrainingStatus(logId, { resultat: result, notes: 'Régularisé en direct depuis le Tableau de Bord.' });
  };

  // Handler: Delete a training log
  const handleDeleteTrainingLog = (logId: string) => {
    const log = trainingLogs.find(l => l.id === logId);
    if (!log) return;
    setTrainingLogs(prev => prev.filter(l => l.id !== logId));
    deleteItemFromFirestore('training_logs', logId);
    deleteFromSupabase('training_logs', logId, handleSupabaseWriteError);
    addEvent(`Formation supprimée pour ${log.collaboratorName} : ${log.moduleName}`, 'warning');
  };

  // Handler: Delete a collaborator/intérimaire and all their associated training logs
  const handleDeleteCollaborator = (collabId: string) => {
    const collab = collaborators.find(c => c.id === collabId);
    if (!collab) return;
    setCollaborators(prev => prev.filter(c => c.id !== collabId));
    deleteItemFromFirestore('collaborators', collabId);
    deleteFromSupabase('collaborators', collabId, handleSupabaseWriteError);
    
    // Also delete associated training logs
    const logsToDelete = trainingLogs.filter(l => l.collaboratorId === collabId);
    setTrainingLogs(prev => prev.filter(l => l.collaboratorId !== collabId));
    logsToDelete.forEach(l => {
      deleteItemFromFirestore('training_logs', l.id);
      deleteFromSupabase('training_logs', l.id, handleSupabaseWriteError);
    });
    
    addEvent(`Intérimaire supprimé : ${collab.firstName} ${collab.lastName} (Toutes ses formations rattachées ont également été supprimées)`, 'warning');
  };

  // Handler: Update an existing collaborator's details and update cached names in training logs
  const handleUpdateCollaborator = (updatedCollab: Collaborator) => {
    setCollaborators(prev => prev.map(c => c.id === updatedCollab.id ? updatedCollab : c));
    saveItemToFirestore('collaborators', updatedCollab);
    saveToSupabase('collaborators', updatedCollab, handleSupabaseWriteError);
    
    setTrainingLogs(prev => prev.map(log => {
      if (log.collaboratorId === updatedCollab.id) {
        const updatedLog = {
          ...log,
          collaboratorName: `${updatedCollab.firstName} ${updatedCollab.lastName}`
        };
        saveItemToFirestore('training_logs', updatedLog);
        saveToSupabase('training_logs', updatedLog, handleSupabaseWriteError);
        return updatedLog;
      }
      return log;
    }));
    addEvent(`Intérimaire mis à jour : ${updatedCollab.firstName} ${updatedCollab.lastName}`, 'success');
  };
  
  // Handler: Add training module
  const handleAddModule = (moduleData: Omit<TrainingModule, 'id'>) => {
    const newId = 'm-' + Date.now();
    const newModule: TrainingModule = {
      ...moduleData,
      id: newId
    };
    setModulesCatalog(prev => [...prev, newModule]);
    saveItemToFirestore('modules_catalog', newModule);
    saveToSupabase('modules_catalog', newModule, handleSupabaseWriteError);
    addEvent(`Module ajouté au catalogue : ${newModule.name}`, 'success');
  };

  // Handler: Update training module
  const handleUpdateModule = (updatedModule: TrainingModule) => {
    const oldModule = modulesCatalog.find(m => m.id === updatedModule.id);
    setModulesCatalog(prev => prev.map(m => m.id === updatedModule.id ? updatedModule : m));
    saveItemToFirestore('modules_catalog', updatedModule);
    saveToSupabase('modules_catalog', updatedModule, handleSupabaseWriteError);
    
    // Propagate module name update to training logs if name has changed
    if (oldModule && oldModule.name !== updatedModule.name) {
      setTrainingLogs(prev => prev.map(log => {
        if (log.moduleName === oldModule.name) {
          const updatedLog = {
            ...log,
            moduleName: updatedModule.name
          };
          saveItemToFirestore('training_logs', updatedLog);
          saveToSupabase('training_logs', updatedLog, handleSupabaseWriteError);
          return updatedLog;
        }
        return log;
      }));
    }
    
    addEvent(`Module mis à jour : ${updatedModule.name}`, 'success');
  };

  // Handler: Delete training module
  const handleDeleteModule = (moduleId: string) => {
    const mod = modulesCatalog.find(m => m.id === moduleId);
    if (!mod) return;
    setModulesCatalog(prev => prev.filter(m => m.id !== moduleId));
    deleteItemFromFirestore('modules_catalog', moduleId);
    deleteFromSupabase('modules_catalog', moduleId, handleSupabaseWriteError);
    addEvent(`Module supprimé du catalogue : ${mod.name}`, 'warning');
  };

  // Handler: Parse custom pasted CSV
  const handleImportCSV = async (csvText: string, type: 'modules' | 'agents' | 'history' = 'modules', mode: 'append' | 'replace' = 'append') => {
    try {
      const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        return { success: false, message: "Le fichier CSV doit contenir au moins une ligne d'en-tête et une ligne de données." };
      }

      // Detect column index mapping from headers
      const headers = lines[0].split(',').map(h => h.trim().toUpperCase());

      if (type === 'modules') {
        const moduleIdx = headers.findIndex(h => h === 'MODULE' || h === 'NOM' || h === 'NOM_MODULE' || h === 'NAME');
        const formateurIdx = headers.findIndex(h => h === 'FORMATEUR' || h === 'TRAINER');
        const typeIdx = headers.findIndex(h => h === 'TYPE' || h === 'MODALITE' || h === 'MODALITÉ');
        const categoryIdx = headers.findIndex(h => h === 'CATEGORIE' || h === 'CATÉGORIE' || h === 'CATEGORY' || h === 'TAG');
        const codeIdx = headers.findIndex(h => h === 'CODE' || h === 'CODE_FORMATION');

        // Backwards compatibility/fallback headers
        const cycleIdx = headers.findIndex(h => h === 'CYCLE');
        const escaleIdx = headers.findIndex(h => h === 'ESCALE');
        const serviceIdx = headers.findIndex(h => h === 'SERVICE');
        const visaIdx = headers.findIndex(h => h === 'VISA');
        const resultIdx = headers.findIndex(h => h === 'RESULTAT' || h === 'RÉSULTAT');
        const consigneIdx = headers.findIndex(h => h === 'CONSIGNE');

        if (moduleIdx === -1) {
          return { success: false, message: "Colonne 'MODULE' ou 'NOM' obligatoire introuvable dans l'en-tête. Format attendu : MODULE,CATEGORIE,FORMATEUR,TYPE,CODE" };
        }

        const newModules: TrainingModule[] = [];
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim());
          
          if (row.length < 1 || !row[moduleIdx]) continue;

          newModules.push({
            id: 'imported-' + i + '-' + Math.random().toString(36).substr(2, 5),
            name: row[moduleIdx],
            formateur: formateurIdx !== -1 ? row[formateurIdx] || 'Hubjob - Interne' : 'Hubjob - Interne',
            type: typeIdx !== -1 ? row[typeIdx] || 'Présentiel' : 'Présentiel',
            cycle: cycleIdx !== -1 ? row[cycleIdx] || 'INI' : 'INI',
            escale: escaleIdx !== -1 ? row[escaleIdx] || 'BOD' : 'BOD',
            service: serviceIdx !== -1 ? row[serviceIdx] || 'PISTE' : 'PISTE',
            visa: visaIdx !== -1 ? row[visaIdx] || 'En attente' : 'En attente',
            resultat: resultIdx !== -1 ? row[resultIdx] || 'En cours' : 'En cours',
            consigne: consigneIdx !== -1 ? row[consigneIdx] || '' : '',
            category: categoryIdx !== -1 ? row[categoryIdx] || undefined : undefined,
            code: codeIdx !== -1 ? row[codeIdx] || undefined : undefined
          });
        }

        if (newModules.length === 0) {
          return { success: false, message: "Aucune donnée valide n'a pu être lue." };
        }

        if (mode === 'replace') {
          await clearSupabaseTable('modules_catalog', handleSupabaseWriteError);
          await clearFirestoreCollection('modules_catalog');
          setModulesCatalog(newModules);
        } else {
          setModulesCatalog(prev => [...prev, ...newModules]);
        }
        saveBulkToFirestore('modules_catalog', newModules);
        const supaOk = await saveBulkToSupabase('modules_catalog', newModules, handleSupabaseWriteError);
        addEvent(`Référentiel mis à jour (${mode === 'replace' ? 'Remplacement' : 'Ajout'}) : ${newModules.length} modules traités.`, 'success');
        return { 
          success: true, 
          message: `Félicitations ! Votre catalogue a été mis à jour dans Supabase avec ${newModules.length} modules (${mode === 'replace' ? 'Remplacé' : 'Ajouté'})${!supaOk ? ' [Attention: Avertissement Supabase, voir la console]' : ''}.`, 
          count: newModules.length 
        };
      } 
      
      else if (type === 'agents') {
        // Matricule, Nom, Prénom, Escale, Service, Téléphone, Mail
        const matriculeIdx = headers.findIndex(h => h.includes('MATRICULE'));
        const nomIdx = headers.findIndex(h => h.includes('NOM'));
        const prenomIdx = headers.findIndex(h => h.includes('PRENOM') || h.includes('PRÉNOM'));
        const escaleIdx = headers.findIndex(h => h.includes('ESCALE'));
        const serviceIdx = headers.findIndex(h => h.includes('SERVICE'));
        const telIdx = headers.findIndex(h => h.includes('TEL') || h.includes('PHONE') || h.includes('TELEPHONE') || h.includes('TÉLÉPHONE') || h.includes('PORTABLE'));
        const mailIdx = headers.findIndex(h => h.includes('MAIL') || h.includes('EMAIL') || h.includes('E-MAIL'));

        if (nomIdx === -1 || prenomIdx === -1) {
          return { success: false, message: "Les colonnes 'NOM' et 'PRENOM' sont obligatoires pour importer des agents. Format attendu : MATRICULE,NOM,PRENOM,ESCALE,SERVICE,TELEPHONE,MAIL" };
        }

        const newCollabs: Collaborator[] = [];
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim());
          if (row.length < Math.max(nomIdx, prenomIdx) + 1 || !row[nomIdx] || !row[prenomIdx]) continue;

          newCollabs.push({
            id: 'c-imported-' + i + '-' + Math.random().toString(36).substr(2, 5),
            firstName: row[prenomIdx],
            lastName: row[nomIdx],
            email: mailIdx !== -1 && row[mailIdx] ? row[mailIdx] : `${row[prenomIdx].toLowerCase()}.${row[nomIdx].toLowerCase()}@hubjob.fr`,
            escale: escaleIdx !== -1 && row[escaleIdx] ? row[escaleIdx] : 'BOD',
            service: serviceIdx !== -1 && row[serviceIdx] ? row[serviceIdx] : 'PISTE',
            hireDate: new Date().toISOString().split('T')[0],
            matricule: matriculeIdx !== -1 ? row[matriculeIdx] || '' : '',
            phone: telIdx !== -1 ? row[telIdx] || '' : '',
            avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`
          });
        }

        if (newCollabs.length === 0) {
          return { success: false, message: "Aucune donnée d'agent valide n'a pu être lue." };
        }

        if (mode === 'replace') {
          await clearSupabaseTable('collaborators', handleSupabaseWriteError);
          await clearFirestoreCollection('collaborators');
          setCollaborators(newCollabs);
        } else {
          setCollaborators(prev => [...prev, ...newCollabs]);
        }
        saveBulkToFirestore('collaborators', newCollabs);
        const supaOk = await saveBulkToSupabase('collaborators', newCollabs, handleSupabaseWriteError);
        addEvent(`Base agents mise à jour (${mode === 'replace' ? 'Remplacement' : 'Ajout'}) : ${newCollabs.length} collaborateurs traités.`, 'success');
        return { 
          success: true, 
          message: `Félicitations ! Base agents mise à jour dans Supabase avec ${newCollabs.length} agents (${mode === 'replace' ? 'Remplacé' : 'Ajouté'})${!supaOk ? ' [Attention: Avertissement Supabase, voir la console]' : ''}.`, 
          count: newCollabs.length 
        };
      }

      else if (type === 'history') {
        const normHeader = (h: string) => 
          h.trim()
           .toUpperCase()
           .normalize("NFD")
           .replace(/[\u0300-\u036f]/g, "")
           .replace(/[^A-Z0-9]/g, "");

        const cleanHeaders = headers.map(normHeader);
        const findHeaderIdx = (...keys: string[]) => {
          return cleanHeaders.findIndex(ch => keys.includes(ch));
        };

        const nomIdx = findHeaderIdx('NOM', 'LASTNAME', 'NOMCOLLABORATEUR', 'AGENT', 'NOMAGENT');
        const prenomIdx = findHeaderIdx('PRENOM', 'FIRSTNAME', 'PRENOMAGENT');
        const completIdx = findHeaderIdx('NOMCOMPLET', 'COLLABORATEUR', 'INTERIMAIRE', 'AGENTCOMPLET');
        const moduleIdx = findHeaderIdx('MODULE', 'NOMMODULE', 'FORMATION', 'INTITULE');
        const formateurIdx = findHeaderIdx('FORMATEUR', 'TRAINER');
        const typeIdx = findHeaderIdx('TYPE', 'MODALITE');
        const cycleIdx = findHeaderIdx('CYCLE');
        const escaleIdx = findHeaderIdx('ESCALE', 'STATION');
        const serviceIdx = findHeaderIdx('SERVICE', 'DEPARTEMENT');
        const visaIdx = findHeaderIdx('VISA', 'VISARESPONSABLE');
        const resultIdx = findHeaderIdx('RESULTAT', 'RESULT');
        const consigneIdx = findHeaderIdx('CONSIGNE');

        const idFormateurIdx = findHeaderIdx('ID', 'IDFORMATEUR', 'IDSESSION', 'NUMSESSION');
        const dateDebutIdx = findHeaderIdx('DATED', 'DATEDEBUT', 'DEBUT');
        const dateFinIdx = findHeaderIdx('DATEF', 'DATEFIN', 'FIN');
        const dateInscrIdx = findHeaderIdx('DATEINSCRIPTION', 'INSCRIPTION');
        const heureDebut1Idx = findHeaderIdx('D1', 'HEUREDEBUT1', 'DEBUT1');
        const heureFin1Idx = findHeaderIdx('F1', 'HEUREFIN1', 'FIN1');
        const heureDebut2Idx = findHeaderIdx('D2', 'HEUREDEBUT2', 'DEBUT2');
        const heureFin2Idx = findHeaderIdx('F2', 'HEUREFIN2', 'FIN2');

        const madEaIdx = findHeaderIdx('MADEA', 'MAD', 'EA');
        const cttHboIdx = findHeaderIdx('CTTHBO', 'CTT', 'HBO');
        const convocIdx = findHeaderIdx('CONVOC', 'CONVOCATION');
        const emrgIdx = findHeaderIdx('EMRG', 'EMERGEMENT', 'EMARGEMENT');
        const attestIdx = findHeaderIdx('ATTEST', 'ATTESTATION');

        const datePayeIdx = findHeaderIdx('DATEPAYE', 'PAYEDATE', 'DATEPAIE');
        const commentairePayeIdx = findHeaderIdx('COMMENTAIRE', 'COMMENTAIRES', 'COMMENTAIREPAYE', 'NOTE', 'NOTES');

        const numFactureIdx = findHeaderIdx('NFACT', 'NFACTURE', 'NUMFACTURE', 'NOFACTURE', 'FACTURE', 'NUMFACT');
        const montantFactureIdx = findHeaderIdx('MONTANT', 'MONTANTFACTURE', 'PRIX', 'COUT');
        const dateValIdx = findHeaderIdx('VALGED', 'VALIDATIONGED', 'DATEVALIDATION', 'VALIDATION');
        const lieuIdx = findHeaderIdx('LIEU', 'SALLE', 'LIEUFORMATION');

        if (moduleIdx === -1 || (nomIdx === -1 && completIdx === -1)) {
          return { success: false, message: "Les colonnes 'NOM' (ou 'COLLABORATEUR') et 'MODULE' (ou 'FORMATION') sont obligatoires pour importer l'historique. Format attendu : NOM, PRENOM, ESCALE, SERVICE, MODULE, CYCLE, FORMATEUR, ID, TYPE, DATE D, DATE F, D1, F1, D2, F2, MAD EA, CTT HBO, CONVOC, EMRG, ATTEST, RESULTAT, CONSIGNE, DATE PAYE, COMMENTAIRE, N° FACT, MONTANT, VAL° GED, VISA" };
        }

        const parseBool = (val: string | undefined): boolean => {
          if (!val) return false;
          const normalized = val.toLowerCase().trim();
          return (
            normalized === 'oui' || 
            normalized === 'true' || 
            normalized === '1' || 
            normalized === 'vrai' || 
            normalized === 'yes' || 
            normalized === 'y' || 
            normalized === 'x' || 
            normalized === 'v' || 
            normalized === 'ok' || 
            normalized === 'coché' || 
            normalized === 'coche'
          );
        };

        const newLogs: TrainingLog[] = [];
        const missingCollabsMap = new Map<string, Collaborator>();

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim());
          if (row.length < 1) continue;

          let fName = '';
          let lName = '';
          let fullName = '';

          if (completIdx !== -1 && row[completIdx]) {
            fullName = row[completIdx];
            const parts = fullName.split(' ');
            if (parts.length > 1) {
              fName = parts[0];
              lName = parts.slice(1).join(' ');
            } else {
              lName = fullName;
            }
          } else {
            fName = prenomIdx !== -1 ? row[prenomIdx] || '' : '';
            lName = nomIdx !== -1 ? row[nomIdx] || '' : '';
            fullName = fName ? `${fName} ${lName}` : lName;
          }

          if (!fullName || !row[moduleIdx]) continue;

          // Match or link with collaborator
          const collab = collaborators.find(c => 
            c.lastName.toLowerCase() === lName.toLowerCase() ||
            `${c.firstName} ${c.lastName}`.toLowerCase() === fullName.toLowerCase()
          );

          let collabId = collab ? collab.id : undefined;
          if (!collabId) {
            collabId = 'c-imported-history-' + i + '-' + Math.random().toString(36).substr(2, 5);
            const missingCollab: Collaborator = {
              id: collabId,
              firstName: fName || fullName,
              lastName: lName || fullName,
              email: `${(fName || 'agent').toLowerCase().replace(/[^a-z0-9]/g, '')}.${(lName || 'imported').toLowerCase().replace(/[^a-z0-9]/g, '')}@hubjob.fr`,
              escale: escaleIdx !== -1 && row[escaleIdx] ? row[escaleIdx] : 'BOD',
              service: serviceIdx !== -1 && row[serviceIdx] ? row[serviceIdx] : 'PISTE',
              hireDate: new Date().toISOString().split('T')[0],
              matricule: '',
              phone: ''
            };
            missingCollabsMap.set(collabId, missingCollab);
          }

          const rawDateDebut = dateDebutIdx !== -1 ? row[dateDebutIdx] : undefined;
          const rawDateFin = dateFinIdx !== -1 ? row[dateFinIdx] : undefined;
          const rawDateInscr = dateInscrIdx !== -1 ? row[dateInscrIdx] : undefined;
          const rawDateVal = dateValIdx !== -1 ? row[dateValIdx] : undefined;
          const rawDatePaye = datePayeIdx !== -1 ? row[datePayeIdx] : undefined;

          const parsedDateDebut = parseImportDate(rawDateDebut) || new Date().toISOString().split('T')[0];
          const parsedDateFin = parseImportDate(rawDateFin) || parsedDateDebut;
          const parsedDateInscr = parseImportDate(rawDateInscr) || parsedDateDebut;
          const parsedDateVal = parseImportDate(rawDateVal) || (resultIdx !== -1 && row[resultIdx] === 'Réussite' ? parsedDateFin : undefined);
          const parsedDatePaye = parseImportDate(rawDatePaye);

          const comm = commentairePayeIdx !== -1 ? row[commentairePayeIdx] || '' : '';
          const madEa = madEaIdx !== -1 ? parseBool(row[madEaIdx]) : false;
          const cttHbo = cttHboIdx !== -1 ? parseBool(row[cttHboIdx]) : false;
          const convoc = convocIdx !== -1 ? parseBool(row[convocIdx]) : false;
          const emrg = emrgIdx !== -1 ? parseBool(row[emrgIdx]) : false;
          const attest = attestIdx !== -1 ? parseBool(row[attestIdx]) : false;

          const rawMontant = montantFactureIdx !== -1 && row[montantFactureIdx] ? row[montantFactureIdx] : undefined;
          let parsedMontant: number | undefined = undefined;
          if (rawMontant) {
            const cleanedNum = parseFloat(rawMontant.replace(',', '.').replace(/[^0-9.]/g, ''));
            if (!isNaN(cleanedNum)) parsedMontant = cleanedNum;
          }

          newLogs.push({
            id: 'l-imported-' + i + '-' + Math.random().toString(36).substr(2, 5),
            collaboratorId: collabId,
            collaboratorName: fullName,
            moduleName: row[moduleIdx],
            formateur: formateurIdx !== -1 && row[formateurIdx] ? row[formateurIdx] : 'Hubjob - Interne',
            type: typeIdx !== -1 && row[typeIdx] ? row[typeIdx] : 'Présentiel',
            cycle: cycleIdx !== -1 && row[cycleIdx] ? row[cycleIdx] : 'INI',
            escale: escaleIdx !== -1 && row[escaleIdx] ? row[escaleIdx] : (collab?.escale || 'BOD'),
            service: serviceIdx !== -1 && row[serviceIdx] ? row[serviceIdx] : (collab?.service || 'PISTE'),
            visa: visaIdx !== -1 && row[visaIdx] ? row[visaIdx] : 'Validée',
            resultat: resultIdx !== -1 && row[resultIdx] ? row[resultIdx] : 'Réussite',
            consigne: consigneIdx !== -1 && row[consigneIdx] ? row[consigneIdx] : 'Paye OK',
            dateInscription: parsedDateInscr,
            dateValidation: parsedDateVal,
            dateDebut: parsedDateDebut,
            dateFin: parsedDateFin,
            notes: comm,
            cleanNotes: comm,
            idFormateur: idFormateurIdx !== -1 ? row[idFormateurIdx] || '' : '',
            madEa,
            cttHbo,
            convoc,
            emrg,
            attest,
            lieu: lieuIdx !== -1 ? row[lieuIdx] || '' : '',
            heureDebut1: heureDebut1Idx !== -1 ? row[heureDebut1Idx] || '' : '',
            heureFin1: heureFin1Idx !== -1 ? row[heureFin1Idx] || '' : '',
            heureDebut2: heureDebut2Idx !== -1 ? row[heureDebut2Idx] || '' : '',
            heureFin2: heureFin2Idx !== -1 ? row[heureFin2Idx] || '' : '',
            datePaye: parsedDatePaye,
            commentairePaye: comm || undefined,
            numFacture: numFactureIdx !== -1 ? row[numFactureIdx] || undefined : undefined,
            montantFacture: parsedMontant
          });
        }

        if (newLogs.length === 0) {
          return { success: false, message: "Aucune ligne d'historique valide n'a pu être lue." };
        }

        // Deduplicate imported history logs to prevent duplicates
        const { uniqueLogs: cleanedImportLogs } = deduplicateTrainingLogs(newLogs);

        // 1. If any new collaborators were dynamically created during history import, insert them into Supabase first
        if (missingCollabsMap.size > 0) {
          const missingCollabsList = Array.from(missingCollabsMap.values());
          setCollaborators(prev => [...prev, ...missingCollabsList]);
          saveBulkToFirestore('collaborators', missingCollabsList);
          await saveBulkToSupabase('collaborators', missingCollabsList, handleSupabaseWriteError);
        }

        // 2. Perform replace vs append for training_logs in Supabase & Firestore
        let finalLogsToSave = cleanedImportLogs;
        if (mode === 'replace') {
          await clearSupabaseTable('training_logs', handleSupabaseWriteError);
          await clearFirestoreCollection('training_logs');
          setTrainingLogs(cleanedImportLogs);
        } else {
          const { uniqueLogs: combinedUnique } = deduplicateTrainingLogs([...trainingLogs, ...cleanedImportLogs]);
          finalLogsToSave = combinedUnique;
          setTrainingLogs(combinedUnique);
        }

        // 3. Save logs to Firestore and Supabase
        saveBulkToFirestore('training_logs', finalLogsToSave);
        let lastSupaErr = '';
        const supaSuccess = await saveBulkToSupabase('training_logs', finalLogsToSave, (errMsg) => {
          lastSupaErr = errMsg;
          handleSupabaseWriteError(errMsg);
        });

        if (!supaSuccess) {
          console.error("[Import Error] Supabase a retourné une erreur lors de l'enregistrement du registre historique:", finalLogsToSave);
          addEvent(`⚠️ Problème lors de la sauvegarde Supabase de l'historique de formation (${finalLogsToSave.length} enregistrements) : ${lastSupaErr}`, 'error');
          return {
            success: false,
            message: `L'import local a fonctionné (${finalLogsToSave.length} dossiers), mais la sauvegarde Supabase a échoué : ${lastSupaErr || 'Vérifiez la structure de votre table Supabase.'}`
          };
        }

        addEvent(`Historique de formation mis à jour dans Supabase (${mode === 'replace' ? 'Remplacement' : 'Ajout'}) : ${finalLogsToSave.length} suivis.`, 'success');
        return { 
          success: true, 
          message: `Félicitations ! L'historique de suivi de formation (${finalLogsToSave.length} dossiers uniques) a été enregistré et conservé avec succès dans Supabase (${mode === 'replace' ? 'Remplacé' : 'Ajouté'}).`, 
          count: finalLogsToSave.length 
        };
      }

      return { success: false, message: "Type d'import inconnu." };

    } catch (err: any) {
      return { success: false, message: `Erreur d'analyse : ${err.message}` };
    }
  };

  // Real-time Event Simulator triggers
  const handleTriggerSimulation = () => {
    const typesOfSimulation = ['complete_active', 'new_enrollment', 'mark_absent', 'add_comment'];
    const chosenSimType = typesOfSimulation[Math.floor(Math.random() * typesOfSimulation.length)];

    const activeLogs = trainingLogs.filter(l => l.resultat === 'En cours');

    if (chosenSimType === 'complete_active' && activeLogs.length > 0) {
      // Pick a random active log and complete it
      const randomLog = activeLogs[Math.floor(Math.random() * activeLogs.length)];
      handleUpdateTrainingStatus(randomLog.id, { 
        resultat: 'Réussite', 
        visa: 'Validée',
        notes: 'Simulateur: Résultat validé à 100% lors de l\'examen en direct.'
      });
      addEvent(`[SIMULATION] Formation réussie pour ${randomLog.collaboratorName} sur "${randomLog.moduleName}"`, 'success');
    } else if (chosenSimType === 'new_enrollment' && collaborators.length > 0) {
      // Pick random collaborator and random catalog module
      const randomCollab = collaborators[Math.floor(Math.random() * collaborators.length)];
      const randomMod = modulesCatalog[Math.floor(Math.random() * modulesCatalog.length)];
      
      handleAssignModule(
        randomCollab.id,
        randomMod.name,
        randomMod.formateur || FORMATEURS[0],
        randomMod.type || TYPES[0],
        randomMod.cycle || CYCLES[0],
        randomCollab.escale,
        randomCollab.service
      );
      addEvent(`[SIMULATION] Convocation automatique de ${randomCollab.firstName} ${randomCollab.lastName} sur "${randomMod.name}"`, 'info');
    } else if (chosenSimType === 'mark_absent' && activeLogs.length > 0) {
      // Mark someone absent
      const randomLog = activeLogs[Math.floor(Math.random() * activeLogs.length)];
      handleUpdateTrainingStatus(randomLog.id, { 
        resultat: 'Absent', 
        visa: 'En attente',
        notes: 'Simulateur: Absence injustifiée constatée par le formateur.' 
      });
      addEvent(`[SIMULATION] Alerte Absence enregistrée pour ${randomLog.collaboratorName} pour la formation "${randomLog.moduleName}"`, 'error');
    } else {
      // Generic info update
      addEvent(`[SIMULATION] Synchro Hubjob en attente de nouveaux flux`, 'info');
    }
  };

  // If user is not authenticated, block access with Login screen
  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col antialiased text-slate-800">
      
      {/* Premium Navigation Header */}
      <header className="bg-white border-b border-slate-200 h-16 shrink-0 sticky top-0 z-30 shadow-xs" id="main-app-header">
        <div className="w-full px-4 sm:px-6 h-full flex items-center justify-between">
          
          {/* Logo Group */}
          <div className="flex items-center gap-4 py-2">
            <HeaderLogo defaultLogoUrl={logoHubjob} canEditLogo={currentUser.username === 'MOE0226'} />
            <div className="hidden md:block pl-4 border-l border-slate-200">
              <p className="text-xs text-slate-500 font-bold tracking-wide">Suivi de formation, paye et facturation</p>
            </div>
          </div>

          {/* Connected User Identity Badge & Logout Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 transition-all px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-7 h-7 bg-[#082C66] text-[#ffde59] rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                {currentUser.firstName[0]}{currentUser.lastName[0]}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser.firstName} {currentUser.lastName}
                </p>
                <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">{currentUser.role}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200/80 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Déconnexion et verrouillage de la session"
              id="header-logout-button"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>

        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-xs" id="navigation-tabs-bar">
        <div className="w-full px-4 sm:px-6">
          <div className="flex space-x-1 overflow-x-auto py-2">
            
            {currentUser.permissions.dashboard !== 'Masquer' && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'dashboard' 
                    ? 'bg-[#082C66]/5 text-[#082C66] font-bold border border-[#082C66]/10 shadow-2xs' 
                    : 'text-slate-600 hover:text-[#0062FF] hover:bg-[#0062FF]/5'
                }`}
                id="tab-dashboard"
              >
                <LayoutDashboard className="h-4 w-4 text-[#082C66]" />
                Accueil
              </button>
            )}

            {currentUser.permissions.calendar !== 'Masquer' && (
              <button
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'calendar' 
                    ? 'bg-[#06b6d4]/10 text-[#00838f] font-bold border border-[#06b6d4]/30 shadow-2xs' 
                    : 'text-slate-600 hover:text-[#06b6d4] hover:bg-[#06b6d4]/5'
                }`}
                id="tab-calendar"
              >
                <Calendar className="h-4 w-4 text-[#06b6d4]" />
                Calendrier
              </button>
            )}

            {currentUser.permissions.logs !== 'Masquer' && (
              <button
                onClick={() => { setLogsFilter(null); setActiveTab('logs'); }}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'logs' 
                    ? 'bg-[#082C66]/5 text-[#082C66] font-bold border border-[#082C66]/10 shadow-2xs' 
                    : 'text-slate-600 hover:text-[#0062FF] hover:bg-[#0062FF]/5'
                }`}
                id="tab-logs"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#57aea6]" />
                Suivi Général
              </button>
            )}

            {currentUser.permissions.payroll !== 'Masquer' && (
              <button
                onClick={() => setActiveTab('payroll')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'payroll' 
                    ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200 shadow-2xs' 
                    : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50/50'
                }`}
                id="tab-payroll"
              >
                <CreditCard className="h-4 w-4 text-purple-600" />
                Gestion paye
              </button>
            )}

            {currentUser.permissions.billing !== 'Masquer' && (
              <button
                onClick={() => setActiveTab('billing')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'billing' 
                    ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200 shadow-2xs' 
                    : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50/50'
                }`}
                id="tab-billing"
              >
                <Receipt className="h-4 w-4 text-amber-600" />
                Gestion facturation
              </button>
            )}

            {currentUser.permissions.collaborators !== 'Masquer' && (
              <button
                onClick={() => { setSelectedCollabId(null); setActiveTab('collaborators'); }}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'collaborators' 
                    ? 'bg-[#082C66]/5 text-[#082C66] font-bold border border-[#082C66]/10 shadow-2xs' 
                    : 'text-slate-600 hover:text-[#0062FF] hover:bg-[#0062FF]/5'
                }`}
                id="tab-collaborators"
              >
                <Users className="h-4 w-4 text-[#0062FF]" />
                Intérimaires
              </button>
            )}

            {currentUser.permissions.catalog !== 'Masquer' && (
              <button
                onClick={() => setActiveTab('catalog')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'catalog' 
                    ? 'bg-[#082C66]/5 text-[#082C66] font-bold border border-[#082C66]/10 shadow-2xs' 
                    : 'text-slate-600 hover:text-[#0062FF] hover:bg-[#0062FF]/5'
                }`}
                id="tab-catalog"
              >
                <BookOpen className="h-4 w-4 text-[#ffde59]" />
                Catalogue de formation
              </button>
            )}

            {currentUser.permissions.coverageControl !== 'Masquer' && (
              <button
                onClick={() => setActiveTab('coverageControl')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'coverageControl' 
                    ? 'bg-[#082C66]/5 text-[#082C66] font-bold border border-[#082C66]/10 shadow-2xs' 
                    : 'text-slate-600 hover:text-[#0062FF] hover:bg-[#0062FF]/5'
                }`}
                id="tab-coverage-control"
              >
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Contrôle de couverture
              </button>
            )}

            {currentUser.permissions.admin !== 'Masquer' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'admin' 
                    ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200 shadow-2xs' 
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50'
                }`}
                id="tab-admin"
              >
                <Shield className="h-4 w-4 text-indigo-600" />
                Admin
              </button>
            )}

          </div>
        </div>
      </nav>

      {/* Main content stage */}
      <main className="flex-1 w-full px-4 sm:px-6 py-6" id="main-content-stage">
        
        {/* Render Active Tab */}
        <div className="animate-fade-in">
          {activeTab === 'dashboard' && currentUser.permissions.dashboard !== 'Masquer' && (
            <Dashboard 
              collaborators={collaborators}
              trainingLogs={trainingLogs}
              events={events}
              onTriggerSimulation={handleTriggerSimulation}
              onQuickFixLog={handleQuickFixLog}
              onOpenEnrollment={() => setIsEnrollmentOpen(true)}
              onNavigateToTab={(tab, filter) => {
                if (filter) {
                  setLogsFilter(filter);
                } else {
                  setLogsFilter(null);
                }
                setActiveTab(tab as any);
              }}
              isReadOnly={currentUser.permissions.dashboard === 'Lecture'}
            />
          )}

          {activeTab === 'collaborators' && currentUser.permissions.collaborators !== 'Masquer' && (
            <CollaboratorsList 
              collaborators={collaborators}
              trainingLogs={trainingLogs}
              modulesCatalog={modulesCatalog}
              onAddCollaborator={handleAddCollaborator}
              onAssignModule={handleAssignModule}
              onUpdateTrainingStatus={handleUpdateTrainingStatus}
              onDeleteTrainingLog={handleDeleteTrainingLog}
              onDeleteCollaborator={handleDeleteCollaborator}
              onClearAllCollaborators={handleClearAllCollaborators}
              onUpdateCollaborator={handleUpdateCollaborator}
              onEditLog={(log) => { setEditLog(log); setIsEnrollmentOpen(true); }}
              onOpenEnrollment={() => { setEditLog(null); setIsEnrollmentOpen(true); }}
              selectedCollabId={selectedCollabId}
              onSelectCollabId={setSelectedCollabId}
              isReadOnly={currentUser.permissions.collaborators === 'Lecture'}
            />
          )}

          {activeTab === 'logs' && currentUser.permissions.logs !== 'Masquer' && (
            <TrainingLogs 
              trainingLogs={trainingLogs}
              onUpdateTrainingStatus={handleUpdateTrainingStatus}
              onDeleteTrainingLog={handleDeleteTrainingLog}
              onOpenEnrollment={() => { setEditLog(null); setIsEnrollmentOpen(true); }}
              onEditLog={(log) => { setEditLog(log); setIsEnrollmentOpen(true); }}
              initialFilters={logsFilter}
              onClearFilters={() => setLogsFilter(null)}
              onViewCollaborator={(collabId) => {
                setSelectedCollabId(collabId);
                setActiveTab('collaborators');
              }}
              onDeduplicateLogs={handleDeduplicateLogs}
              isReadOnly={currentUser.permissions.logs === 'Lecture'}
            />
          )}

          {activeTab === 'payroll' && currentUser.permissions.payroll !== 'Masquer' && (
            <PayrollManagement 
              trainingLogs={trainingLogs}
              collaborators={collaborators}
              onUpdateTrainingStatus={handleUpdateTrainingStatus}
              onEditLog={(log) => { setEditLog(log); setIsEnrollmentOpen(true); }}
              onViewCollaborator={(collabId) => {
                setSelectedCollabId(collabId);
                setActiveTab('collaborators');
              }}
              isReadOnly={currentUser.permissions.payroll === 'Lecture'}
            />
          )}

          {activeTab === 'billing' && currentUser.permissions.billing !== 'Masquer' && (
            <BillingManagement 
              trainingLogs={trainingLogs}
              collaborators={collaborators}
              onUpdateTrainingStatus={handleUpdateTrainingStatus}
              onEditLog={(log) => { setEditLog(log); setIsEnrollmentOpen(true); }}
              onViewCollaborator={(collabId) => {
                setSelectedCollabId(collabId);
                setActiveTab('collaborators');
              }}
              isReadOnly={currentUser.permissions.billing === 'Lecture'}
            />
          )}

          {activeTab === 'catalog' && currentUser.permissions.catalog !== 'Masquer' && (
            <ModuleCatalog 
              modulesCatalog={modulesCatalog}
              trainingLogs={trainingLogs}
              onAddModule={handleAddModule}
              onUpdateModule={handleUpdateModule}
              onDeleteModule={handleDeleteModule}
              isReadOnly={currentUser.permissions.catalog === 'Lecture'}
            />
          )}

          {activeTab === 'consolidation' && (
            <ConsolidationPanel 
              onImportCSV={handleImportCSV}
              modulesCatalog={modulesCatalog}
              collaborators={collaborators}
              trainingLogs={trainingLogs}
            />
          )}

          {activeTab === 'calendar' && currentUser.permissions.calendar !== 'Masquer' && (
            <CalendarView 
              trainingLogs={trainingLogs}
              collaborators={collaborators}
              modulesCatalog={modulesCatalog}
              onOpenEnrollmentOnDate={handleOpenEnrollmentOnDate}
              onEditLog={(log) => { setEditLog(log); setIsEnrollmentOpen(true); }}
              onDeleteLogs={handleDeleteLogs}
              onBulkUpdateLogs={handleBulkUpdateLogs}
              isReadOnly={currentUser.permissions.calendar === 'Lecture'}
            />
          )}

          {activeTab === 'coverageControl' && currentUser.permissions.coverageControl !== 'Masquer' && (
            <CoverageControl />
          )}

          {activeTab === 'admin' && currentUser.permissions.admin !== 'Masquer' && (
            <AdminManagement 
              users={users}
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              currentUserPermission={currentUser.permissions.admin}
            />
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 shrink-0 mt-auto" id="main-app-footer">
        <div className="w-full px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <div>
            © 2026 <strong>Hubjob</strong>. Application de Gestion de Formation & d'Aptitudes en Temps Réel.
          </div>
          <div className="flex items-center gap-4">
            <span>Données partenaires synchronisées</span>
            <span>•</span>
            <button 
              onClick={handleOpenConsolidation} 
              className="text-[#0062FF] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              id="footer-launch-consolidation-btn"
            >
              <Lock className="h-3 w-3 text-slate-400" />
              Lancer la consolidation de production
            </button>
          </div>
        </div>
      </footer>

      {/* Password Protection Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-[#0062FF] rounded-xl border border-blue-100">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Accès Sécurisé</h3>
                <p className="text-xs text-slate-500">Consolidation de production & Import CSV</p>
              </div>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (passwordInput.trim() === '010226') {
                  setIsConsolidationUnlocked(true);
                  setIsPasswordModalOpen(false);
                  setActiveTab('consolidation');
                  setPasswordError(false);
                } else {
                  setPasswordError(true);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Saisissez le mot de passe d'accès :
                </label>
                <input
                  type="password"
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                  placeholder="Code de sécurité..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:border-[#0062FF] focus:outline-hidden"
                  id="consolidation-password-input"
                />
                {passwordError && (
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Code d'accès incorrect. Veuillez réessayer.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0062FF] hover:bg-[#0052D4] rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  id="consolidation-password-submit-btn"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Déverrouiller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Central Enrollment Modal */}
      <EnrollmentModal 
        isOpen={isEnrollmentOpen}
        onClose={() => { 
          setIsEnrollmentOpen(false); 
          setEditLog(null); 
          setCalendarInitialDate(null);
          setCalendarInitialNumSession(null);
        }}
        collaborators={collaborators}
        modulesCatalog={modulesCatalog}
        trainingLogs={trainingLogs}
        onRegister={handleRegisterEnrollment}
        editLog={editLog}
        onUpdateLog={handleUpdateTrainingLog}
        preselectedCollaboratorId={selectedCollabId}
        initialDate={calendarInitialDate}
        initialNumSession={calendarInitialNumSession}
      />

    </div>
  );
}
