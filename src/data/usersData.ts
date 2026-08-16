import { AppUser, UserAppPermissions, AppKey, AppPermissionLevel } from '../types';
import { 
  GraduationCap, 
  FolderGit2,
  TrendingUp,
  Clock,
  FileText, 
  ShieldCheck, 
  Shield 
} from 'lucide-react';
import React from 'react';

export const ALL_FULL_PERMISSIONS: UserAppPermissions = {
  formation: 'Écriture',
  rhGenerator: 'Écriture',
  operationsTracking: 'Écriture',
  absenceTracking: 'Écriture',
  contractGenerator: 'Écriture',
  coverageControl: 'Écriture',
  admin: 'Écriture',
};

export const DEFAULT_READONLY_PERMISSIONS: UserAppPermissions = {
  formation: 'Lecture',
  rhGenerator: 'Lecture',
  operationsTracking: 'Lecture',
  absenceTracking: 'Lecture',
  contractGenerator: 'Lecture',
  coverageControl: 'Lecture',
  admin: 'Masquer',
};

export const DEFAULT_ADMIN_USER: AppUser = {
  id: 'usr-admin-default',
  username: 'MOE0226',
  lastName: 'ONILLON MINÉE',
  firstName: 'Martin',
  role: 'Administrateur',
  permissions: ALL_FULL_PERMISSIONS,
  createdAt: '2026-01-01T00:00:00.000Z'
};

export const INITIAL_USERS: AppUser[] = [
  DEFAULT_ADMIN_USER
];

/**
 * Normalizes raw user permissions to ensure full compatibility with all application keys
 */
export function normalizeUserPermissions(rawPerms: any): UserAppPermissions {
  if (!rawPerms || typeof rawPerms !== 'object') {
    return { ...DEFAULT_READONLY_PERMISSIONS };
  }

  // Handle migration from previous tab-based permissions if applicable
  const formationCandidate = rawPerms.formation || rawPerms.dashboard || rawPerms.logs || 'Lecture';
  const rhCandidate = rawPerms.rhGenerator || 'Écriture';
  const operationsCandidate = rawPerms.operationsTracking || 'Lecture';
  const absenceCandidate = rawPerms.absenceTracking || 'Lecture';
  const contractCandidate = rawPerms.contractGenerator || 'Lecture';
  const coverageCandidate = rawPerms.coverageControl || 'Lecture';
  const adminCandidate = rawPerms.admin || 'Masquer';

  const validatePerm = (val: any, fallback: AppPermissionLevel): AppPermissionLevel => {
    if (val === 'Écriture' || val === 'Lecture' || val === 'Masquer') return val;
    return fallback;
  };

  return {
    formation: validatePerm(formationCandidate, 'Lecture'),
    rhGenerator: validatePerm(rhCandidate, 'Écriture'),
    operationsTracking: validatePerm(operationsCandidate, 'Lecture'),
    absenceTracking: validatePerm(absenceCandidate, 'Lecture'),
    contractGenerator: validatePerm(contractCandidate, 'Lecture'),
    coverageControl: validatePerm(coverageCandidate, 'Lecture'),
    admin: validatePerm(adminCandidate, 'Masquer'),
  };
}

export function getUserInitials(firstName: string, lastName: string): string {
  const cleanFirst = (firstName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '').toUpperCase();
  const cleanLast = (lastName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '').toUpperCase();
  
  const l1 = cleanFirst.length > 0 ? cleanFirst[0] : 'A';
  const l2 = cleanLast.length > 0 ? cleanLast[0] : 'A';
  const l3 = cleanLast.length > 0 ? cleanLast[cleanLast.length - 1] : 'A';

  return `${l1}${l2}${l3}`;
}

export function generateRandomUserId(firstName: string = '', lastName: string = '', existingUsernames: string[] = []): string {
  const initials = getUserInitials(firstName, lastName);
  let candidate = '';
  let attempts = 0;
  
  do {
    const num = Math.floor(1000 + Math.random() * 9000).toString();
    candidate = `${initials}${num}`;
    attempts++;
  } while (existingUsernames.includes(candidate) && attempts < 100);

  return candidate;
}

export interface AppDefinition {
  key: AppKey;
  label: string;
  subLabel: string;
  description: string;
  includedTabs?: string[];
  gradient: string;
  icon: React.ElementType;
}

export const APP_DEFINITIONS: Record<AppKey, AppDefinition> = {
  formation: {
    key: 'formation',
    label: 'App Formation',
    subLabel: 'Planifier, suivre les sessions et gérer la paie et la facturation.',
    description: 'Planifier, suivre les sessions et gérer la paie et la facturation (KPI, Calendrier, Suivi général, Paye, Facturation, Intérimaires et Catalogue).',
    includedTabs: ['KPI', 'Calendrier', 'Suivi Général', 'Paye', 'Facturation', 'Intérimaires', 'Catalogue'],
    gradient: 'linear-gradient(135deg, #35ffd0 0%, #0ebfa0 100%)',
    icon: GraduationCap,
  },
  rhGenerator: {
    key: 'rhGenerator',
    label: 'App Générateur dossier RH',
    subLabel: "Standardiser et générer le dossier RH complet de l'intérimaire.",
    description: "Standardiser et générer le dossier RH complet de l'intérimaire (12 pièces justificatives, recadrage photo et fusion PDF).",
    includedTabs: ['12 pièces justificatives', 'Recadrage photo', 'Export ZIP'],
    gradient: 'linear-gradient(135deg, #ff751f 0%, #d84315 100%)',
    icon: FolderGit2,
  },
  operationsTracking: {
    key: 'operationsTracking',
    label: "App Suivi d'exploitation",
    subLabel: "Suivi de l'activité par escale et KPI",
    description: "Suivi de l'activité par escale et indicateurs clés de performance opérationnels.",
    includedTabs: ['Activité par escale', 'KPI Opérations'],
    gradient: 'linear-gradient(135deg, #082c66 0%, #031430 100%)',
    icon: TrendingUp,
  },
  absenceTracking: {
    key: 'absenceTracking',
    label: 'App Suivi des absences',
    subLabel: 'Assure le suivi des absences et génère le mailing associé.',
    description: 'Assure le suivi des absences et génère le mailing associé.',
    includedTabs: ['Suivi absences', 'Génération mailing'],
    gradient: 'linear-gradient(135deg, #57aea6 0%, #3d8c85 100%)',
    icon: Clock,
  },
  contractGenerator: {
    key: 'contractGenerator',
    label: 'App Générateur import contrat',
    subLabel: 'Convertir instantanément vos imports de contrats pour HBO.',
    description: 'Convertir instantanément vos imports de contrats pour HBO.',
    includedTabs: ['Imports HBO', 'Matrice Planete'],
    gradient: 'linear-gradient(135deg, #0062ff 0%, #0043b8 100%)',
    icon: FileText,
  },
  coverageControl: {
    key: 'coverageControl',
    label: 'App Contrôle de couverture',
    subLabel: 'Contrôler la conformité entre le planning réel et les contrats édités.',
    description: 'Contrôler la conformité entre le planning réel et les contrats édités (Province et Orly).',
    includedTabs: ['Contrôle Province', 'Contrôle Orly'],
    gradient: 'linear-gradient(135deg, #ff5757 0%, #d32f2f 100%)',
    icon: ShieldCheck,
  },
  admin: {
    key: 'admin',
    label: 'App Administration',
    subLabel: 'Gérer les utilisateurs, les rôles et les accès à la plateforme.',
    description: 'Gérer les utilisateurs, les rôles et les accès à la plateforme.',
    includedTabs: ['Gestion des utilisateurs', 'Matrice des droits par application'],
    gradient: 'linear-gradient(135deg, #6d72db 0%, #4338ca 100%)',
    icon: Shield,
  },
};

export const APP_KEYS: AppKey[] = [
  'formation',
  'rhGenerator',
  'operationsTracking',
  'absenceTracking',
  'contractGenerator',
  'coverageControl',
  'admin'
];

