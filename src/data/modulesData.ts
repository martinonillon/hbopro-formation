import { TrainingModule } from '../types';

export const RAW_MODULES: TrainingModule[] = [
  {
    id: 'm1',
    name: 'CACES - R389 CAT 1 ET 3',
    formateur: 'Aéroport',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'Hubjob',
    service: 'ADMIN',
    visa: 'En attente',
    resultat: 'Absent',
    consigne: 'A payer'
  },
  {
    id: 'm2',
    name: 'CARGO - ADR',
    formateur: 'Alyzia - Interne',
    type: 'E-learning',
    cycle: 'PER',
    escale: 'BES',
    service: 'CARGO',
    visa: 'Validée',
    resultat: 'Annulée',
    consigne: 'Ne pas payer'
  },
  {
    id: 'm3',
    name: 'DEGIVRAGE - OPERATEUR DEGIVRAGE',
    formateur: 'Butterfly Training',
    type: 'Distantiel',
    cycle: 'MDC',
    escale: 'BOD',
    service: 'CATERING',
    visa: 'Refusée',
    resultat: 'Echouée',
    consigne: 'Paye OK'
  },
  {
    id: 'm4',
    name: 'DEGIVRAGE - THEORIE FROID CONTROLE ET EXECUTION',
    formateur: 'CAMAS',
    type: 'Distantiel',
    cycle: 'INI',
    escale: 'LYS',
    service: 'GALERIE',
    visa: 'En attente',
    resultat: 'En cours',
    consigne: 'Facture Alyzia'
  },
  {
    id: 'm5',
    name: 'DEGIVRAGE - THEORIE FROID DECLENCHEMENT, EXECUTION & CONTROLE',
    formateur: 'CDF Externe',
    type: 'Présentiel',
    cycle: 'PER',
    escale: 'MPL',
    service: 'LITIGES',
    visa: 'En attente',
    resultat: 'Rattrapage',
    consigne: ''
  },
  {
    id: 'm6',
    name: 'DIVERS - ATTITUDES DE SERVICES',
    formateur: 'EA',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'MRS',
    service: 'NETTOYAGE',
    visa: 'En attente',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm7',
    name: 'DIVERS - EASYJET ACE',
    formateur: 'Pika Aéro',
    type: 'E-learning',
    cycle: 'INI',
    escale: 'NCE',
    service: 'PASSAGE',
    visa: 'En attente',
    resultat: 'En cours',
    consigne: ''
  },
  {
    id: 'm8',
    name: 'DIVERS - EASYJET BOH & AAA',
    formateur: 'Alyzia - Interne',
    type: 'E-learning',
    cycle: 'PER',
    escale: 'NTE',
    service: 'PHMR',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm9',
    name: 'DIVERS - GESTION DE LA RELATION HUMAINE',
    formateur: 'Aéroport',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'TLS',
    service: 'PISTE',
    visa: 'En attente',
    resultat: 'En cours',
    consigne: ''
  },
  {
    id: 'm10',
    name: 'DIVERS - GESTION DES CONFLITS',
    formateur: 'EA',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'LYS',
    service: 'TRAFIC',
    visa: 'En attente',
    resultat: 'En cours',
    consigne: ''
  },
  {
    id: 'm11',
    name: 'DIVERS - LUTTE CONTRE LA CORRUPTION',
    formateur: 'Alyzia - Interne',
    type: 'E-learning',
    cycle: 'PER',
    escale: 'BOD',
    service: 'ADMIN',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm12',
    name: 'HUBJOB - CORRESPONDANT SURETE',
    formateur: 'Aéroport',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'Hubjob',
    service: 'ADMIN',
    visa: 'En attente',
    resultat: 'En cours',
    consigne: ''
  },
  {
    id: 'm13',
    name: 'LANGUE - ANGLAIS ELEMENTAIRE',
    formateur: 'Butterfly Training',
    type: 'E-learning',
    cycle: 'INI',
    escale: 'LYS',
    service: 'PASSAGE',
    visa: 'En attente',
    resultat: 'En cours',
    consigne: ''
  },
  {
    id: 'm14',
    name: 'MANAGEMENT - GESTION DES EQUIPES',
    formateur: 'EA',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'NCE',
    service: 'ADMIN',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: 'Paye OK'
  },
  {
    id: 'm15',
    name: 'MANAGEMENT - MANAGEMENT DES EQUIPES',
    formateur: 'EA',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'BOD',
    service: 'ADMIN',
    visa: 'En attente',
    resultat: 'En cours',
    consigne: ''
  },
  {
    id: 'm16',
    name: 'METIER BILLETTERIE - GDS AMADEUS AIR',
    formateur: 'CAMAS',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'TLS',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm17',
    name: 'METIER PASSAGE - ACCUEIL PMR',
    formateur: 'Alyzia - Interne',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'BOD',
    service: 'PHMR',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm18',
    name: 'METIER PASSAGE - DCS ALTEA CM',
    formateur: 'CAMAS',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'NCE',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm19',
    name: 'METIER PASSAGE - DCS ERES',
    formateur: 'Alyzia - Interne',
    type: 'E-learning',
    cycle: 'INI',
    escale: 'TLS',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm20',
    name: 'METIER PASSAGE - DCS GONOW',
    formateur: 'Pika Aéro',
    type: 'Distantiel',
    cycle: 'INI',
    escale: 'MRS',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm21',
    name: 'METIER PASSAGE - METIER AGENT D\'ESCALE COMMERCIAL - INITIAL',
    formateur: 'CAMAS',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'TLS',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm22',
    name: 'METIER PASSAGE - PROCEDURES EASYJET',
    formateur: 'Alyzia - Interne',
    type: 'E-learning',
    cycle: 'INI',
    escale: 'NCE',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm23',
    name: 'METIER PASSAGE - PROCEDURES TRANSAVIA',
    formateur: 'Alyzia - Interne',
    type: 'E-learning',
    cycle: 'INI',
    escale: 'BOD',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm24',
    name: 'METIER PASSAGE - PROCEDURES VOLOTEA',
    formateur: 'Alyzia - Interne',
    type: 'E-learning',
    cycle: 'INI',
    escale: 'NTE',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm25',
    name: 'METIER PASSAGE - PASSEPORT ET VISA',
    formateur: 'Aéroport',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'TLS',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm26',
    name: 'METIER PISTE - ARRIMAGE',
    formateur: 'Alyzia - Interne',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'BES',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm27',
    name: 'METIER PISTE - ASSISTANT BARRE',
    formateur: 'Alyzia - Interne',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'BOD',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm28',
    name: 'METIER PISTE - CALAGE BALISAGE DES AVIONS',
    formateur: 'Alyzia - Interne',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'LYS',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm29',
    name: 'METIER PISTE - CHARGEMENT AVION SOUTE VRAC',
    formateur: 'Alyzia - Interne',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'MRS',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm30',
    name: 'METIER PISTE - DEPART AU CASQUE FR/GB',
    formateur: 'Alyzia - Interne',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'TLS',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm31',
    name: 'METIER PISTE - LOADER / PLATEFORME ELEVATRICE',
    formateur: 'Alyzia - Interne',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'TLS',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm32',
    name: 'METIER PISTE - PUSH',
    formateur: 'Alyzia - Interne',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'BOD',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm33',
    name: 'METIER PISTE - TRACTEUR DE MANUTENTION + CHARIOT',
    formateur: 'Alyzia - Interne',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'BOD',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm34',
    name: 'METIER TRAFIC - METIER AGENT DE TRAFIC',
    formateur: 'CAMAS',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'LYS',
    service: 'TRAFIC',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm35',
    name: 'QSE - CO ACTIVITE - SECURITE EN PISTE',
    formateur: 'Alyzia - Interne',
    type: 'E-learning',
    cycle: 'PER',
    escale: 'BOD',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm36',
    name: 'QSE - EPI INCENDIE - EQUIPIER 1ERE INTERVENTION',
    formateur: 'EA',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'LYS',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm37',
    name: 'QSE - GESTES ET POSTURES',
    formateur: 'Alyzia - Interne',
    type: 'E-learning',
    cycle: 'INI',
    escale: 'BOD',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm38',
    name: 'QSE - SGS',
    formateur: 'Alyzia - Interne',
    type: 'E-learning',
    cycle: 'INI',
    escale: 'BOD',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm39',
    name: 'QSE - SST - INITIAL',
    formateur: 'EA',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'LYS',
    service: 'ADMIN',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm40',
    name: 'REGLEMENTAIRE - 11.2.3.6',
    formateur: 'Butterfly Training',
    type: 'E-learning',
    cycle: 'PER',
    escale: 'BOD',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm41',
    name: 'REGLEMENTAIRE - 11.2.3.8',
    formateur: 'Butterfly Training',
    type: 'E-learning',
    cycle: 'PER',
    escale: 'TLS',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm42',
    name: 'REGLEMENTAIRE - 11.2.6.2',
    formateur: 'Butterfly Training',
    type: 'E-learning',
    cycle: 'PER',
    escale: 'BOD',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm43',
    name: 'REGLEMENTAIRE - 7.5 - DGR 09 - PASSAGE',
    formateur: 'CAMAS',
    type: 'Présentiel',
    cycle: 'PER',
    escale: 'NCE',
    service: 'PASSAGE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  },
  {
    id: 'm44',
    name: 'REGLEMENTAIRE - PERMIS PISTE TRV/TZ - THEORIQUE',
    formateur: 'Aéroport',
    type: 'Présentiel',
    cycle: 'INI',
    escale: 'BOD',
    service: 'PISTE',
    visa: 'Validée',
    resultat: 'Réussite',
    consigne: ''
  }
];

export const CATEGORIES = [
  'CACES / CARGO',
  'DEGIVRAGE',
  'DIVERS',
  'MANAGEMENT',
  'METIER BILLETTERIE',
  'METIER NETTOYAGE',
  'METIER PASSAGE',
  'METIER PHMR',
  'METIER PISTE',
  'METIER TRAFIC',
  'QSE',
  'REGLEMENTAIRE'
];

export const MODULE_CATEGORIES = [
  'Réglementaire',
  'QSE',
  'Divers',
  'Métier',
  'Dégivrage',
  'CACES',
  'Management',
  'Langue'
];

export const CATEGORY_COLORS: Record<string, { hex: string; bg: string; text: string; border: string }> = {
  'Réglementaire': { hex: '#0062ff', bg: 'bg-[#0062ff]/10', text: 'text-[#0062ff]', border: 'border-[#0062ff]/20' },
  'QSE': { hex: '#6d73db', bg: 'bg-[#6d73db]/10', text: 'text-[#6d73db]', border: 'border-[#6d73db]/20' },
  'Divers': { hex: '#082c66', bg: 'bg-[#082c66]/10', text: 'text-[#082c66]', border: 'border-[#082c66]/20' },
  'Métier': { hex: '#f08000', bg: 'bg-[#f08000]/10', text: 'text-[#f08000]', border: 'border-[#f08000]/20' },
  'Dégivrage': { hex: '#35ffd0', bg: 'bg-[#35ffd0]/10', text: 'text-[#1bbfa3]', border: 'border-[#35ffd0]/20' },
  'CACES': { hex: '#57aea5', bg: 'bg-[#57aea5]/10', text: 'text-[#3d8c83]', border: 'border-[#57aea5]/20' },
  'Management': { hex: '#ff66c4', bg: 'bg-[#ff66c4]/10', text: 'text-[#d63b9c]', border: 'border-[#ff66c4]/20' },
  'Langue': { hex: '#737373', bg: 'bg-[#737373]/10', text: 'text-[#555555]', border: 'border-[#737373]/20' }
};

export function getCategoryOfModule(mod: TrainingModule): string {
  if (mod.category) return mod.category;
  const nameCat = getCategoryFromName(mod.name);
  if (nameCat === 'CACES / CARGO') return 'CACES';
  if (nameCat === 'DEGIVRAGE') return 'Dégivrage';
  if (nameCat === 'MANAGEMENT') return 'Management';
  if (nameCat.startsWith('METIER')) return 'Métier';
  if (nameCat === 'QSE') return 'QSE';
  if (nameCat === 'REGLEMENTAIRE') return 'Réglementaire';
  return 'Divers';
}

export function getCategoryFromName(name: string): string {
  if (name.startsWith('CACES') || name.startsWith('CARGO')) return 'CACES / CARGO';
  if (name.startsWith('DEGIVRAGE')) return 'DEGIVRAGE';
  if (name.startsWith('DIVERS')) return 'DIVERS';
  if (name.startsWith('HUBJOB')) return 'DIVERS';
  if (name.startsWith('LANGUE')) return 'DIVERS';
  if (name.startsWith('MANAGEMENT')) return 'MANAGEMENT';
  if (name.startsWith('METIER BILLETTERIE')) return 'METIER BILLETTERIE';
  if (name.startsWith('METIER NETTOYAGE')) return 'METIER NETTOYAGE';
  if (name.startsWith('METIER PASSAGE')) return 'METIER PASSAGE';
  if (name.startsWith('METIER PHMR')) return 'METIER PHMR';
  if (name.startsWith('METIER PISTE')) return 'METIER PISTE';
  if (name.startsWith('METIER TRAFIC')) return 'METIER TRAFIC';
  if (name.startsWith('QSE')) return 'QSE';
  if (name.startsWith('REGLEMENTAIRE')) return 'REGLEMENTAIRE';
  return 'DIVERS';
}

export const ESCALES = ['Hubjob', 'BES', 'BOD', 'LYS', 'MPL', 'MRS', 'NCE', 'NTE', 'TLS'];

export const ESCALE_COLORS: Record<string, { hex: string; bg: string; text: string; border: string }> = {
  'BES': { hex: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200/50' },
  'BOD': { hex: '#EAB308', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200/50' },
  'LYS': { hex: '#8B5CF6', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200/50' },
  'MPL': { hex: '#78350F', bg: 'bg-amber-900/10', text: 'text-amber-900', border: 'border-amber-900/30' },
  'MRS': { hex: '#15803D', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200/50' },
  'NCE': { hex: '#0EA5E9', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200/50' },
  'NTE': { hex: '#0D9488', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200/50' },
  'TLS': { hex: '#EC4899', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200/50' },
  'HUBJOB': { hex: '#64748B', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200/50' }
};

export function getEscaleStyle(escale: string) {
  const norm = (escale || '').toUpperCase().trim();
  const def = { hex: '#64748B', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200/50' };
  return ESCALE_COLORS[norm] || def;
}
export const SERVICES = ['ADMIN', 'CARGO', 'CATERING', 'GALERIE', 'LITIGES', 'NETTOYAGE', 'PHMR', 'PISTE', 'TRAFIC', 'PASSAGE'];
export const VISAS = ['En attente', 'Validée', 'Refusée'];
export const RESULTATS = ['Absent', 'Annulée', 'Echouée', 'En cours', 'Rattrapage', 'Réussite', 'A traiter'];
export const CONSIGNES = ['A payer', 'Ne pas payer', 'Paye OK', 'Facturation client', 'A relancer', 'N/A'];
export const TYPES = ['Présentiel', 'E-learning', 'Distantiel'];
export const CYCLES = ['INI', 'PER', 'MDC'];
export const FORMATEURS = ['Aéroport', 'Hubjob - Interne', 'Butterfly Training', 'CAMAS', 'CDF Externe', 'EA', 'Pika Aéro'];
