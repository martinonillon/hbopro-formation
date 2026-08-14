export interface TrainingModule {
  id: string;
  name: string;
  formateur: string;
  type: string; // Présentiel, E-learning, Distantiel
  cycle: string; // INI, PER, MDC
  escale: string;
  service: string;
  visa?: string; // En attente, Validée, Refusée
  resultat: string; // Absent, Annulée, Echouée, En cours, Rattrapage, Réussite
  consigne: string; // A payer, Ne pas payer, Paye OK, Facturation client, A relancer
  category?: string; // Réglementaire, QSE, Divers, Métier, Dégivrage, CACES, Management, Langue
  code?: string; // Code de formation
}

export interface Collaborator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  escale: string; // BES, BOD, LYS, LHR, etc.
  service: string; // PISTE, PASSAGE, TRAFIC, etc.
  avatar?: string;
  hireDate?: string;
  matricule?: string; // Matricule de l'agent
  phone?: string;     // Numéro de téléphone de l'agent
}

export interface HistoryEntry {
  action: string;
  date: string;
  heure: string;
  author: string;
}

export interface TrainingLog {
  id: string;
  collaboratorId: string;
  collaboratorName: string; // Cache for easy search
  moduleName: string;
  formateur: string;
  type: string;
  cycle: string;
  escale: string;
  service: string;
  visa?: string; // En attente, Validée, Refusée
  resultat: string; // Absent, Annulée, Echouée, En cours, Rattrapage, Réussite
  consigne: string; // A payer, Ne pas payer, Paye OK, Facturation client, A relancer
  dateInscription: string;
  dateValidation?: string;
  dateDebut?: string;
  dateFin?: string;
  notes?: string;
  cleanNotes?: string;
  idFormateur?: string;
  heureDebut1?: string;
  heureFin1?: string;
  heureDebut2?: string;
  heureFin2?: string;
  madEa?: boolean;
  cttHbo?: boolean;
  convoc?: boolean;
  lieu?: string;
  numSession?: string;
  emrg?: boolean;
  attest?: boolean;
  emrgFileUrl?: string;
  emrgFileName?: string;
  history?: HistoryEntry[];
  datePaye?: string;
  commentairePaye?: string;
  numFacture?: string;
  montantFacture?: number;
}

export interface RealTimeEvent {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export type AppPermissionLevel = 'Masquer' | 'Lecture' | 'Écriture';

// Alias for backwards compatibility
export type TabPermission = AppPermissionLevel;

export type AppKey = 'formation' | 'coverageControl' | 'contractGenerator' | 'rhGenerator' | 'admin';

export interface UserAppPermissions {
  formation: AppPermissionLevel;          // App Formation (KPI, Calendrier, Suivi Général, Paye, Facturation, Intérimaires, Catalogue)
  coverageControl: AppPermissionLevel;    // App Contrôle de couverture
  contractGenerator: AppPermissionLevel;  // App Générateur import contrat
  rhGenerator: AppPermissionLevel;        // App Générateur dossier RH
  admin: AppPermissionLevel;              // App Administration
}

// Alias for UserAppPermissions
export type UserTabPermissions = UserAppPermissions;

export interface AppUser {
  id: string;
  username: string; // Identifiant e.g. MOE0226 or AAA1234
  lastName: string;
  firstName: string;
  role: string;
  permissions: UserAppPermissions;
  createdAt: string;
}

