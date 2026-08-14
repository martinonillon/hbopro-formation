import { AppUser, UserTabPermissions } from '../types';

export const ALL_FULL_PERMISSIONS: UserTabPermissions = {
  dashboard: 'Écriture',
  calendar: 'Écriture',
  logs: 'Écriture',
  payroll: 'Écriture',
  billing: 'Écriture',
  collaborators: 'Écriture',
  catalog: 'Écriture',
  coverageControl: 'Écriture',
  admin: 'Écriture',
};

export const DEFAULT_READONLY_PERMISSIONS: UserTabPermissions = {
  dashboard: 'Lecture',
  calendar: 'Lecture',
  logs: 'Lecture',
  payroll: 'Lecture',
  billing: 'Lecture',
  collaborators: 'Lecture',
  catalog: 'Lecture',
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

export const TAB_LABELS: Record<keyof UserTabPermissions, { label: string; description: string }> = {
  dashboard: { label: 'KPI', description: 'Tableau de bord, indicateurs et graphiques KPI' },
  calendar: { label: 'Calendrier', description: 'Planning des sessions de formation' },
  logs: { label: 'Suivi Général', description: 'Liste des inscriptions et historiques de formation' },
  payroll: { label: 'Gestion paye', description: 'Consignes de paye des intérimaires' },
  billing: { label: 'Gestion facturation', description: 'Suivi des factures et prestations' },
  collaborators: { label: 'Intérimaires', description: 'Gestion des fiches collaborateurs' },
  catalog: { label: 'Catalogue de formation', description: 'Modules et habilitations de formation' },
  coverageControl: { label: 'Contrôle de couverture', description: 'Vérification de la conformité des postes' },
  admin: { label: 'Admin', description: 'Gestion des utilisateurs et des permissions' },
};
