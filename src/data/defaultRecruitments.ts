import { RecruitmentRecord, RecruitmentChecklist } from '../types';

export const DEFAULT_CHECKLIST: RecruitmentChecklist = {
  ficheEntretienRemplie: 'N/A',
  vehicule: 'N/A',
  horaireDecale: 'N/A',
  verificationAntecedents: 'N/A',
  controleReferences: 'N/A',
  mailInscription: 'N/A',
  receptionDossier: 'N/A',
  envoiLivretAccueil: 'N/A',
  ficheHbo: 'N/A',
  fichePlanete: 'N/A',
  controleDossierFormation: 'N/A',
  commandeFormation: 'N/A',
  demandeTca: 'N/A',
  receptionTca: 'N/A',
  miseAuxNormesDossierRh: 'N/A'
};

export const INITIAL_RECRUITMENTS: RecruitmentRecord[] = [
  {
    id: 'rec-1',
    collaboratorId: 'c1',
    collaboratorName: 'Thomas BLANCHARD',
    recruteur: '',
    dateEntretien: '',
    dateIntegrationPrevue: '',
    checklist: {
      vehicule: 'N/A',
      horaireDecale: 'N/A',
      controleDossierFormation: 'N/A',
      mailInscription: 'N/A',
      ficheHbo: 'N/A',
      fichePlanete: 'N/A',
      demandeTca: 'N/A',
      commandeFormation: 'N/A',
      envoiLivretAccueil: 'N/A',
      miseAuxNormesDossierRh: 'N/A'
    },
    commentaires: 'Candidat très motivé. Expérience préalable sur piste aéroportuaire. Permis B. Dossier en cours de constitution.',
    status: 'en_cours',
    createdAt: '2025-02-10T09:30:00.000Z',
    updatedAt: '2025-02-10T09:30:00.000Z'
  },
  {
    id: 'rec-2',
    collaboratorId: 'c2',
    collaboratorName: 'Sarah KHELIFI',
    recruteur: '',
    dateEntretien: '',
    dateIntegrationPrevue: '',
    checklist: {
      vehicule: 'N/A',
      horaireDecale: 'N/A',
      controleDossierFormation: 'N/A',
      mailInscription: 'N/A',
      ficheHbo: 'N/A',
      fichePlanete: 'N/A',
      demandeTca: 'N/A',
      commandeFormation: 'N/A',
      envoiLivretAccueil: 'N/A',
      miseAuxNormesDossierRh: 'N/A'
    },
    commentaires: 'Entretien validé. En attente de finalisation de la fiche Planète et de la confirmation de commande session formation CACES.',
    status: 'en_cours',
    createdAt: '2025-02-12T14:15:00.000Z',
    updatedAt: '2025-02-12T14:15:00.000Z'
  },
  {
    id: 'rec-3',
    collaboratorId: 'c4',
    collaboratorName: 'Lucas MOREAU',
    recruteur: 'Martin ONILLON',
    dateEntretien: '2025-01-20',
    dateIntegrationPrevue: '2025-02-01',
    checklist: {
      vehicule: 'Oui',
      horaireDecale: 'Oui',
      controleDossierFormation: 'Oui',
      mailInscription: 'Oui',
      ficheHbo: 'Oui',
      fichePlanete: 'Oui',
      demandeTca: 'Oui',
      commandeFormation: 'Oui',
      envoiLivretAccueil: 'Oui',
      miseAuxNormesDossierRh: 'Oui'
    },
    commentaires: 'Recrutement finalisé avec succès. Mise en poste effectuée sur escale MRS au service PASSAGE.',
    status: 'mise_en_poste',
    createdAt: '2025-01-20T10:00:00.000Z',
    updatedAt: '2025-02-01T08:00:00.000Z',
    archivedAt: '2025-02-01T08:00:00.000Z'
  }
];
