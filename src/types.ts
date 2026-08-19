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
  matricule?: string; // Matricule Anael de l'agent
  phone?: string;     // Numéro de téléphone de l'agent
  poste?: string;     // Poste / Métier (texte libre)
  coefficient?: string; // Coefficient (texte libre)
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

export type AppKey = 
  | 'formation' 
  | 'rhGenerator' 
  | 'recruitment'
  | 'operationsTracking' 
  | 'absenceTracking' 
  | 'contractGenerator' 
  | 'coverageControl' 
  | 'baseInterimaires' 
  | 'admin';

export interface UserAppPermissions {
  formation: AppPermissionLevel;          // 1. App Formation (KPI, Calendrier, Suivi Général, Paye, Facturation, Catalogue)
  rhGenerator: AppPermissionLevel;        // 2. App Générateur dossier RH
  recruitment?: AppPermissionLevel;       // 3. App Recrutement & Intégration
  operationsTracking: AppPermissionLevel; // 4. App Suivi d'exploitation
  absenceTracking: AppPermissionLevel;    // 5. App Suivi des absences
  contractGenerator: AppPermissionLevel;  // 6. App Générateur import contrat
  coverageControl: AppPermissionLevel;    // 7. App Contrôle de couverture
  baseInterimaires?: AppPermissionLevel;  // 8. Base intérimaires
  admin: AppPermissionLevel;              // 9. App Administration
}

// Types pour l'application Recrutement & Parcours d'accueil
export type IntegrationChecklistValue = 'Oui' | 'Non' | 'N/A';

export interface RecruitmentChecklist {
  vehicule: IntegrationChecklistValue;
  horaireDecale: IntegrationChecklistValue;
  controleDossierFormation: IntegrationChecklistValue;
  mailInscription: IntegrationChecklistValue;
  ficheHbo: IntegrationChecklistValue;
  fichePlanete: IntegrationChecklistValue;
  demandeTca: IntegrationChecklistValue;
  commandeFormation: IntegrationChecklistValue;
  envoiLivretAccueil: IntegrationChecklistValue;
  miseAuxNormesDossierRh?: IntegrationChecklistValue;
}

export type RecruitmentStatus = 'en_cours' | 'mise_en_poste' | 'annule';

export interface RecruitmentRecord {
  id: string;
  collaboratorId: string;
  collaboratorName?: string;
  recruteur: string;
  dateEntretien: string;
  dateIntegrationPrevue: string;
  checklist: RecruitmentChecklist;
  commentaires: string;
  status: RecruitmentStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

// Alias for UserAppPermissions
export type UserTabPermissions = UserAppPermissions;

export interface AppUser {
  id: string;
  username: string; // Identifiant e.g. MOE0226 or AAA1234
  email?: string;
  password?: string; // Mot de passe (default: 'Hubstation2026!')
  lastName: string;
  firstName: string;
  role: string;
  status?: 'pending' | 'approved' | 'rejected';
  authId?: string;
  permissions: UserAppPermissions;
  createdAt: string;
}

export interface RegistrationRequest {
  id: string;
  lastName: string;
  firstName: string;
  role: string; // Poste
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  used?: boolean;
}

export const DEFAULT_PROVISIONAL_PASSWORD = 'Hubstation2026!';

export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export function validatePassword(password: string): PasswordValidationResult {
  const hasMinLength = (password || '').length >= 12;
  const hasUppercase = /[A-Z]/.test(password || '');
  const hasLowercase = /[a-z]/.test(password || '');
  const hasNumber = /[0-9]/.test(password || '');
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password || '');

  return {
    isValid: hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar
  };
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
  'ALYZIA', 'GIMAS', 'GIMAP', 'AHP', 'CAPRES', 'ACH', "GIMN'S", 'DIRBY', 'HUBJOB', 'SANTE', 'FORMATION', 'AUTRE'
] as const;

