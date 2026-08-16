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

export type AppKey = 'formation' | 'rhGenerator' | 'operationsTracking' | 'absenceTracking' | 'contractGenerator' | 'coverageControl' | 'admin';

export interface UserAppPermissions {
  formation: AppPermissionLevel;          // 1. App Formation (KPI, Calendrier, Suivi Général, Paye, Facturation, Intérimaires, Catalogue)
  rhGenerator: AppPermissionLevel;        // 2. App Générateur dossier RH
  operationsTracking: AppPermissionLevel; // 3. App Suivi d'exploitation (À venir - #082c66)
  absenceTracking: AppPermissionLevel;    // 4. App Suivi des absences (À venir - #57aea6)
  contractGenerator: AppPermissionLevel;  // 5. App Générateur import contrat (À venir - #0062ff)
  coverageControl: AppPermissionLevel;    // 6. App Contrôle de couverture (#ff5757)
  admin: AppPermissionLevel;              // 7. App Administration (#6d72db)
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

export interface Contact {
  id: string;
  genre?: 'M.' | 'Mme' | string;
  lastName: string;
  firstName: string;
  escale: string;
  entity: string;
  company?: string;
  service?: string;
  position?: string;
  comment?: string;
  mobilePhone?: string;
  landlinePhone?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const CONTACT_ESCALES = [
  'BES', 'BOD', 'LYS', 'MPL', 'MRS', 'NCE', 'NTE', 'TLS', 'GROUPE', 'HBO'
] as const;

export const CONTACT_ENTITIES = [
  'ALYZIA', 'GIMAS', 'GIMAP', 'AHP', 'CAPRES', 'ACH', "GIMN'S", 'DIRBY', 'HUBJOB', 'SANTE', 'FORMATION'
] as const;

