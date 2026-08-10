import { TrainingLog } from '../types';

export interface DeduplicateResult {
  uniqueLogs: TrainingLog[];
  removedLogs: TrainingLog[];
  duplicateCount: number;
}

/**
 * Normalizes text for robust comparisons
 */
function norm(str?: string | number | null): string {
  if (str === null || str === undefined) return '';
  return String(str).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Deduplicates training logs by building a composite signature key
 * for each log based on collaborator, module, dates, session, cycle, type, result, and formateur.
 */
export function deduplicateTrainingLogs(logs: TrainingLog[]): DeduplicateResult {
  if (!logs || logs.length === 0) {
    return { uniqueLogs: [], removedLogs: [], duplicateCount: 0 };
  }

  const seenSignatures = new Set<string>();
  const seenIds = new Set<string>();
  const uniqueLogs: TrainingLog[] = [];
  const removedLogs: TrainingLog[] = [];

  for (const log of logs) {
    if (!log) continue;

    // First check exact ID match if present
    if (log.id && seenIds.has(log.id)) {
      removedLogs.push(log);
      continue;
    }

    // Extract core attributes
    const collab = norm(log.collaboratorId) || norm(log.collaboratorName);
    const mod = norm(log.moduleName);
    const dStart = norm(log.dateDebut) || norm(log.dateInscription);
    const dEnd = norm(log.dateFin) || norm(log.dateValidation);
    const cycle = norm(log.cycle);
    const type = norm(log.type);
    const session = norm(log.numSession);
    const formateur = norm(log.formateur);
    const resultat = norm(log.resultat);

    // Composite signature
    const signature = `${collab}|${mod}|${dStart}|${dEnd}|${cycle}|${type}|${session}|${formateur}|${resultat}`;

    if (seenSignatures.has(signature)) {
      removedLogs.push(log);
    } else {
      seenSignatures.add(signature);
      if (log.id) seenIds.add(log.id);
      uniqueLogs.push(log);
    }
  }

  return {
    uniqueLogs,
    removedLogs,
    duplicateCount: removedLogs.length
  };
}
