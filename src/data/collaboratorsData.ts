import { Collaborator, TrainingLog } from '../types';
import { RAW_MODULES } from './modulesData';

export const INITIAL_COLLABORATORS: Collaborator[] = [
  {
    id: 'c1',
    firstName: 'Thomas',
    lastName: 'Dubois',
    email: 't.dubois@hubjob.fr',
    escale: 'BOD',
    service: 'PISTE',
    hireDate: '2022-03-15',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'c2',
    firstName: 'Amandine',
    lastName: 'Petit',
    email: 'a.petit@hubjob.fr',
    escale: 'NCE',
    service: 'PASSAGE',
    hireDate: '2023-06-01',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'c3',
    firstName: 'Julien',
    lastName: 'Moreau',
    email: 'j.moreau@hubjob.fr',
    escale: 'LYS',
    service: 'TRAFIC',
    hireDate: '2021-09-10',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'c4',
    firstName: 'Sarah',
    lastName: 'Michel',
    email: 's.michel@hubjob.fr',
    escale: 'TLS',
    service: 'PASSAGE',
    hireDate: '2024-01-15',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'c5',
    firstName: 'Nicolas',
    lastName: 'Roux',
    email: 'n.roux@hubjob.fr',
    escale: 'BOD',
    service: 'ADMIN',
    hireDate: '2020-11-20',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'c6',
    firstName: 'Elodie',
    lastName: 'Simon',
    email: 'e.simon@hubjob.fr',
    escale: 'BES',
    service: 'CARGO',
    hireDate: '2023-02-18',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'c7',
    firstName: 'Lucas',
    lastName: 'Lefevre',
    email: 'l.lefevre@hubjob.fr',
    escale: 'MRS',
    service: 'PISTE',
    hireDate: '2021-05-12',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'c8',
    firstName: 'Sophie',
    lastName: 'Mercier',
    email: 's.mercier@hubjob.fr',
    escale: 'BOD',
    service: 'PHMR',
    hireDate: '2022-10-05',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_TRAINING_LOGS: TrainingLog[] = [
  // Thomas Dubois (c1) - BOD, PISTE
  {
    id: 'l1',
    collaboratorId: 'c1',
    collaboratorName: 'Thomas Dubois',
    moduleName: 'METIER PISTE - PUSH',
    formateur: 'Hubjob - Interne',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'BOD',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: 'Paye OK',
    dateInscription: '2026-05-10',
    dateValidation: '2026-05-12',
    notes: 'Excellente maîtrise lors du test pratique.'
  },
  {
    id: 'l2',
    collaboratorId: 'c1',
    collaboratorName: 'Thomas Dubois',
    moduleName: 'QSE - CO ACTIVITE - SECURITE EN PISTE',
    formateur: 'Hubjob - Interne',
    type: 'E-learning',
    cycle: 'PER',
    escale: 'BOD',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: 'N/A',
    dateInscription: '2026-06-01',
    dateValidation: '2026-06-03',
    notes: 'Fait à distance sur la plateforme interne.'
  },
  {
    id: 'l3',
    collaboratorId: 'c1',
    collaboratorName: 'Thomas Dubois',
    moduleName: 'DEGIVRAGE - THEORIE FROID CONTROLE ET EXECUTION',
    formateur: 'CAMAS',
    type: 'Distantiel',
    cycle: 'INI',
    escale: 'LYS',
    service: 'GALERIE',
    visa: 'En attente',
    resultat: 'En cours',
    consigne: 'Facturation client',
    dateInscription: '2026-07-01',
    notes: 'Formation théorique commencée.'
  },

  // Amandine Petit (c2) - NCE, PASSAGE
  {
    id: 'l4',
    collaboratorId: 'c2',
    collaboratorName: 'Amandine Petit',
    moduleName: 'METIER PASSAGE - DCS ALTEA CM',
    formateur: 'CAMAS',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'NCE',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: 'Paye OK',
    dateInscription: '2026-04-12',
    dateValidation: '2026-04-15'
  },
  {
    id: 'l5',
    collaboratorId: 'c2',
    collaboratorName: 'Amandine Petit',
    moduleName: 'REGLEMENTAIRE - 7.5 - DGR 09 - PASSAGE',
    formateur: 'CAMAS',
    type: 'Présentiel',
    cycle: 'PER',
    escale: 'NCE',
    service: 'PASSAGE',
    visa: 'En attente',
    resultat: 'Rattrapage',
    consigne: 'A payer',
    dateInscription: '2026-07-05',
    notes: 'Nécessite une repasse sur la partie DGR lithium.'
  },

  // Julien Moreau (c3) - LYS, TRAFIC
  {
    id: 'l6',
    collaboratorId: 'c3',
    collaboratorName: 'Julien Moreau',
    moduleName: 'METIER TRAFIC - METIER AGENT DE TRAFIC',
    formateur: 'CAMAS',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'LYS',
    service: 'TRAFIC',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: 'Paye OK',
    dateInscription: '2026-02-10',
    dateValidation: '2026-02-14'
  },
  {
    id: 'l7',
    collaboratorId: 'c3',
    collaboratorName: 'Julien Moreau',
    moduleName: 'DIVERS - GESTION DES CONFLITS',
    formateur: 'EA',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'LYS',
    service: 'TRAFIC',
    visa: 'En attente',
    resultat: 'Absent',
    consigne: 'A payer',
    dateInscription: '2026-07-10',
    notes: 'Malade le jour de la convocation. À replanifier d\'urgence.'
  },

  // Sarah Michel (c4) - TLS, PASSAGE
  {
    id: 'l8',
    collaboratorId: 'c4',
    collaboratorName: 'Sarah Michel',
    moduleName: 'METIER PASSAGE - METIER AGENT D\'ESCALE COMMERCIAL - INITIAL',
    formateur: 'CAMAS',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'TLS',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: 'Paye OK',
    dateInscription: '2026-05-10',
    dateValidation: '2026-05-15'
  },
  {
    id: 'l9',
    collaboratorId: 'c4',
    collaboratorName: 'Sarah Michel',
    moduleName: 'METIER PASSAGE - DCS ERES',
    formateur: 'Hubjob - Interne',
    type: 'E-learning',
    cycle: 'INI',
    escale: 'TLS',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: 'N/A',
    dateInscription: '2026-06-15',
    dateValidation: '2026-06-16'
  },
  {
    id: 'l10',
    collaboratorId: 'c4',
    collaboratorName: 'Sarah Michel',
    moduleName: 'REGLEMENTAIRE - 11.2.3.8',
    formateur: 'Butterfly Training',
    type: 'E-learning',
    cycle: 'PER',
    escale: 'TLS',
    service: 'PASSAGE',
    visa: 'En attente',
    resultat: 'En cours',
    consigne: 'A payer',
    dateInscription: '2026-07-12'
  },

  // Nicolas Roux (c5) - BOD, ADMIN
  {
    id: 'l11',
    collaboratorId: 'c5',
    collaboratorName: 'Nicolas Roux',
    moduleName: 'MANAGEMENT - MANAGEMENT DES EQUIPES',
    formateur: 'EA',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'BOD',
    service: 'ADMIN',
    visa: 'En attente',
    resultat: 'En cours',
    consigne: 'A payer',
    dateInscription: '2026-07-01'
  },

  // Elodie Simon (c6) - BES, CARGO
  {
    id: 'l12',
    collaboratorId: 'c6',
    collaboratorName: 'Elodie Simon',
    moduleName: 'CARGO - ADR',
    formateur: 'Hubjob - Interne',
    type: 'E-learning',
    cycle: 'PER',
    escale: 'BES',
    service: 'CARGO',
    visa: 'Refusée',
    resultat: 'Echouée',
    consigne: 'Ne pas payer',
    dateInscription: '2026-06-10',
    notes: 'Score final de 55% sur l\'examen. Un minimum de 80% est requis. Repassage prévu.'
  },

  // Lucas Lefevre (c7) - MRS, PISTE
  {
    id: 'l13',
    collaboratorId: 'c7',
    collaboratorName: 'Lucas Lefevre',
    moduleName: 'METIER PISTE - CHARGEMENT AVION SOUTE VRAC',
    formateur: 'Hubjob - Interne',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'MRS',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: 'N/A',
    dateInscription: '2026-05-20',
    dateValidation: '2026-05-22'
  },
  {
    id: 'l14',
    collaboratorId: 'c7',
    collaboratorName: 'Lucas Lefevre',
    moduleName: 'DIVERS - ATTITUDES DE SERVICES',
    formateur: 'EA',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'MRS',
    service: 'NETTOYAGE',
    visa: 'En attente',
    resultat: 'En cours',
    consigne: 'A payer',
    dateInscription: '2026-07-08'
  },

  // Sophie Mercier (c8) - BOD, PHMR
  {
    id: 'l15',
    collaboratorId: 'c8',
    collaboratorName: 'Sophie Mercier',
    moduleName: 'METIER PASSAGE - ACCUEIL PMR',
    formateur: 'Hubjob - Interne',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'BOD',
    service: 'PHMR',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: 'N/A',
    dateInscription: '2026-04-05',
    dateValidation: '2026-04-06'
  },
  {
    id: 'l16',
    collaboratorId: 'c8',
    collaboratorName: 'Sophie Mercier',
    moduleName: 'DEGIVRAGE - OPERATEUR DEGIVRAGE',
    formateur: 'Butterfly Training',
    type: 'Distantiel',
    cycle: 'MDC',
    escale: 'BOD',
    service: 'CATERING',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: 'Paye OK',
    dateInscription: '2026-06-20',
    dateValidation: '2026-06-22'
  }
];
