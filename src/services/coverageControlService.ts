import * as XLSX from 'xlsx';

// ---- Liste des représentants (colonne REPRES_CH) à prendre en compte pour ORLY ----
export const REPRES_ORLY_A_GARDER = [
  "AXIA PINEAU",
  "BARBOSA José",
  "BERTHOU ANDREA",
  "DAVID DAVID",
  "DEBAS JACQUES",
  "DRAME Stéphane",
  "MAILLOT Christophe",
  "MAS LAURE",
  "MILANOVIC Dejan",
  "MOHAMED David",
  "PINEAU AXIA",
  "PUCH KARINE",
  "ROUSSEL CHRISTINE",
  "TRUILHE Florent",
  "ZEBBOUDJ Sisan",
].map(s => s.trim().toLowerCase());

/**
 * Normalise un matricule ORLY (int, float ".0", string)
 * en une chaîne de 5 chiffres avec zéros de tête.
 */
export function formatMat(val: any): string {
  if (val === null || val === undefined || val === "") return "";
  let s = String(val).trim().split('.')[0]; // enlève un éventuel ".0"
  const digits = s.replace(/\D/g, ''); // ne garde que les chiffres
  if (!digits) return "";
  return digits.padStart(5, '0');
}

/**
 * Normalise un matricule PROVINCE (int, float ".0", string)
 * en une chaîne de 9 chiffres avec zéros de tête.
 */
export function formatMatProvince(val: any): string {
  if (val === null || val === undefined || val === "") return "";
  let s = String(val).trim().split('.')[0]; // enlève un éventuel ".0"
  const digits = s.replace(/\D/g, ''); // ne garde que les chiffres
  if (!digits) return "";
  return digits.padStart(9, '0');
}

/**
 * Extrait le matricule ORLY (5 chiffres) situé entre parenthèses dans la colonne Agent.
 */
export function extractMatFromAgent(val: any): string {
  if (val === null || val === undefined) return "";
  const m = String(val).match(/\((\d+)\)/);
  if (!m) return "";
  return formatMat(m[1]);
}

/**
 * Extrait le matricule PROVINCE (9 chiffres) situé entre parenthèses dans la colonne Agent.
 */
export function extractMatFromAgentProvince(val: any): string {
  if (val === null || val === undefined) return "";
  const m = String(val).match(/\((\d+)\)/);
  if (!m) return "";
  return formatMatProvince(m[1]);
}

/**
 * Convertit une valeur de date (string, ou numéro de série Excel) en objet Date.
 */
export function parseDate(val: any): Date | null {
  if (val === null || val === undefined || val === "") return null;

  if (typeof val === 'number') {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
    return null;
  }

  const s = String(val).trim();

  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    const date = new Date(Number(y), Number(mo) - 1, Number(d));
    return isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function sameOrBetween(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

/** Trouve la première colonne (déjà en minuscules) qui contient un des motifs donnés. */
export function findCol(columns: string[], patterns: string[]): string | null {
  return columns.find(c => patterns.some(p => c.includes(p))) || null;
}

/** Lit un fichier (Buffer / Uint8Array / ArrayBuffer) xlsx ou csv et renvoie un tableau d'objets. */
export function readFileToRows(buffer: Buffer | Uint8Array | ArrayBuffer, skipRows?: number): any[] {
  const workbook = XLSX.read(buffer, { type: 'array', raw: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const options: any = { defval: null, raw: true };

  if (sheet && sheet['!ref']) {
    try {
      const decoded = XLSX.utils.decode_range(sheet['!ref']);
      decoded.s.r = 0; // Force à démarrer à la ligne absolue 1 (index 0)
      sheet['!ref'] = XLSX.utils.encode_range(decoded);
    } catch (e) {
      // Ignorer en cas d'erreur de parsing du ref
    }
  }

  if (skipRows !== undefined && skipRows > 0) {
    options.range = skipRows;
  }

  return XLSX.utils.sheet_to_json(sheet, options);
}

/** Met toutes les clés d'un objet en minuscules/trim. */
export function lowerKeys(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(row)) {
    out[String(k).trim().toLowerCase()] = row[k];
  }
  return out;
}

/** Formate une heure Excel (numérique fractionnaire ou chaîne). */
export function formatExcelTime(val: any): string {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === 'number' && val >= 0 && val < 1) {
    const totalSeconds = Math.round(val * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  return String(val).trim();
}

/**
 * Extrait les plages d'heures depuis la colonne "Vacations".
 * Format attendu : "04:30 - 11:00 (06:30)"
 * Gère également les vacations multiples séparées par des retours à la ligne ou des virgules.
 */
export function parseVacations(val: any): { debut: string; fin: string }[] {
  if (val === null || val === undefined || val === "") {
    return [];
  }
  const s = String(val).trim();
  const parts = s.split(/[\r\n,;]+/).map(p => p.trim()).filter(Boolean);
  const results: { debut: string; fin: string }[] = [];
  const regex = /(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/;

  for (const part of parts) {
    const match = part.match(regex);
    if (match) {
      results.push({
        debut: match[1],
        fin: match[2]
      });
    }
  }
  return results;
}

export interface Anomaly {
  Matricule: string;
  Agent: string;
  "Date Vacation": string;
  "Début": string;
  "Fin": string;
  Motif: string;
  "Remplacement de": string;
  Client: string;
  Statut: string;
}

export interface CoverageResult {
  anomalies: Anomaly[];
  warnings: string[];
  xlsxBase64: string | null;
}

/**
 * Fonction de contrôle pour ORLY
 */
export function controleCouvertureOrly(bufferContrats: Buffer | Uint8Array, bufferPlanning: Buffer | Uint8Array): CoverageResult {
  const warnings: string[] = [];

  let rowsC = readFileToRows(bufferContrats).map(lowerKeys);
  let rowsP = readFileToRows(bufferPlanning, 6).map(lowerKeys);

  if (rowsC.length === 0 || rowsP.length === 0) {
    return { anomalies: [], warnings: ["❌ Un des deux fichiers est vide ou illisible."], xlsxBase64: null };
  }

  const colsC = Object.keys(rowsC[0]);
  const colsP = Object.keys(rowsP[0]);

  const colCMat = colsC.includes('sal_ch') ? 'sal_ch' : findCol(colsC, ['sal_', 'matricule']);
  const colCDeb = findCol(colsC, ['date_d', 'debut']);
  const colCFin = findCol(colsC, ['date_f', 'fin']);
  const colCRepres = colsC.includes('repres_ch') ? 'repres_ch' : findCol(colsC, ['repres']);

  const colPAgent = findCol(colsP, ['agent']);
  const colPDate = findCol(colsP, ['date', 'jour']);

  if (!colCMat || !colCDeb || !colCFin || !colPAgent || !colPDate) {
    warnings.push(
      `❌ Erreur de détection :\n` +
      `- Contrats Mat: ${colCMat || 'Non trouvé'}, Début: ${colCDeb || 'Non trouvé'}, Fin: ${colCFin || 'Non trouvé'}\n` +
      `- Planning Agent: ${colPAgent || 'Non trouvé'}, Date: ${colPDate || 'Non trouvé'}`
    );
    return { anomalies: [], warnings, xlsxBase64: null };
  }

  // ---- Filtre représentants (REPRES_CH) sur le fichier Contrats ----
  if (colCRepres) {
    const nbAvant = rowsC.length;
    rowsC = rowsC.filter(r => {
      const v = r[colCRepres];
      return v !== null && v !== undefined && REPRES_ORLY_A_GARDER.includes(String(v).trim().toLowerCase());
    });
    warnings.push(`Filtre représentants appliqué : ${rowsC.length} ligne(s) conservée(s) sur ${nbAvant} dans le fichier Contrats (ORLY).`);
  } else {
    warnings.push("⚠️ Colonne REPRES_CH introuvable dans le fichier Contrats : aucun filtre représentant n'a été appliqué.");
  }

  // ---- Préparation des contrats ----
  const contrats = rowsC.map(r => ({
    mat: formatMat(r[colCMat]),
    dtDeb: parseDate(r[colCDeb]),
    dtFin: parseDate(r[colCFin]),
  }));

  const matsContrats = new Set(contrats.map(c => c.mat).filter(m => m !== ""));

  // ---- Préparation du planning ----
  let nbSansMatricule = 0;
  const planning: any[] = [];
  for (const r of rowsP) {
    const mat = extractMatFromAgent(r[colPAgent]);
    if (mat === "") nbSansMatricule++;
    const vStr = r['vacations'] ?? "";
    const vacs = parseVacations(vStr);
    if (vacs.length > 0) {
      for (const vac of vacs) {
        planning.push({
          mat,
          dateVac: parseDate(r[colPDate]),
          agent: r[colPAgent] ?? "",
          lieu: r['lieu de la commande'] ?? r['lieu'] ?? "",
          motif: r['motif'] ?? "",
          client: r['activité'] ?? r['activite'] ?? "",
          remplacementDe: r['remplacement de'] ?? "",
          debut: vac.debut,
          fin: vac.fin,
        });
      }
    } else {
      planning.push({
        mat,
        dateVac: parseDate(r[colPDate]),
        agent: r[colPAgent] ?? "",
        lieu: r['lieu de la commande'] ?? r['lieu'] ?? "",
        motif: r['motif'] ?? "",
        client: r['activité'] ?? r['activite'] ?? "",
        remplacementDe: r['remplacement de'] ?? "",
        debut: "",
        fin: "",
      });
    }
  }

  if (nbSansMatricule > 0) {
    warnings.push(`⚠️ ${nbSansMatricule} ligne(s) du planning n'ont pas de matricule extractible dans la colonne Agent (format attendu : 'NOM (00000)') et ont été ignorées du contrôle.`);
  }

  const matsPlanningAbsents = [...new Set(
    planning.map(p => p.mat).filter(m => m !== "" && !matsContrats.has(m))
  )].sort();

  if (matsPlanningAbsents.length > 0) {
    warnings.push(`ℹ️ ${matsPlanningAbsents.length} matricule(s) du planning n'apparaissent dans AUCUN contrat (à vérifier s'ils sont bien censés être sous contrat) : ${matsPlanningAbsents.slice(0, 30).join(', ')}`);
  }

  // ---- Détection des anomalies ----
  const anomalies: Anomaly[] = [];
  for (const p of planning) {
    if (!p.dateVac || !p.mat) continue;

    const sousContrats = contrats.filter(c => c.mat === p.mat);
    const couvert = sousContrats.some(c =>
      c.dtDeb && c.dtFin && sameOrBetween(p.dateVac!, c.dtDeb!, c.dtFin!)
    );

    if (!couvert) {
      anomalies.push({
        Matricule: p.mat,
        Agent: p.agent,
        "Date Vacation": p.dateVac.toLocaleDateString('fr-FR'),
        "Début": p.debut,
        "Fin": p.fin,
        Motif: p.motif,
        "Remplacement de": p.remplacementDe,
        Client: p.client,
        Statut: "Non couvert",
      });
    }
  }

  // ---- Génération du fichier xlsx de sortie ----
  let xlsxBase64: string | null = null;
  if (anomalies.length > 0) {
    const ws = XLSX.utils.json_to_sheet(anomalies);

    const cols = Object.keys(anomalies[0]);
    ws['!cols'] = cols.map(col => {
      const maxLen = Math.max(
        col.length,
        ...anomalies.map(row => String((row as any)[col] ?? "").length)
      );
      return { wch: maxLen + 2 };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Non couvertes");
    xlsxBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  }

  return { anomalies, warnings, xlsxBase64 };
}

/**
 * Fonction de contrôle pour PROVINCE
 * (Règles spécifiques PROVINCE : matricule à 9 chiffres, pas de filtre représentant)
 */
export function controleCouvertureProvince(bufferContrats: Buffer | Uint8Array, bufferPlanning: Buffer | Uint8Array): CoverageResult {
  const warnings: string[] = [];

  let rowsC = readFileToRows(bufferContrats).map(lowerKeys);
  let rowsP = readFileToRows(bufferPlanning, 6).map(lowerKeys);

  if (rowsC.length === 0 || rowsP.length === 0) {
    return { anomalies: [], warnings: ["❌ Un des deux fichiers est vide ou illisible."], xlsxBase64: null };
  }

  const colsC = Object.keys(rowsC[0]);
  const colsP = Object.keys(rowsP[0]);

  const colCMat = colsC.includes('sal_ch') ? 'sal_ch' : findCol(colsC, ['sal_', 'matricule']);
  const colCDeb = findCol(colsC, ['date_d', 'debut']);
  const colCFin = findCol(colsC, ['date_f', 'fin']);

  const colPAgent = findCol(colsP, ['agent']);
  const colPDate = findCol(colsP, ['date', 'jour']);

  if (!colCMat || !colCDeb || !colCFin || !colPAgent || !colPDate) {
    warnings.push(
      `❌ Erreur de détection :\n` +
      `- Contrats Mat: ${colCMat || 'Non trouvé'}, Début: ${colCDeb || 'Non trouvé'}, Fin: ${colCFin || 'Non trouvé'}\n` +
      `- Planning Agent: ${colPAgent || 'Non trouvé'}, Date: ${colPDate || 'Non trouvé'}`
    );
    return { anomalies: [], warnings, xlsxBase64: null };
  }

  // ---- Préparation des contrats (pas de filtre représentants côté PROVINCE) ----
  const contrats = rowsC.map(r => ({
    mat: formatMatProvince(r[colCMat]),
    dtDeb: parseDate(r[colCDeb]),
    dtFin: parseDate(r[colCFin]),
  }));

  const matsContrats = new Set(contrats.map(c => c.mat).filter(m => m !== ""));

  // ---- Préparation du planning ----
  let nbSansMatricule = 0;
  const planning: any[] = [];
  for (const r of rowsP) {
    const mat = extractMatFromAgentProvince(r[colPAgent]);
    if (mat === "") nbSansMatricule++;
    const vStr = r['vacations'] ?? "";
    const vacs = parseVacations(vStr);
    if (vacs.length > 0) {
      for (const vac of vacs) {
        planning.push({
          mat,
          dateVac: parseDate(r[colPDate]),
          agent: r[colPAgent] ?? "",
          lieu: r['lieu de la commande'] ?? r['lieu'] ?? "",
          motif: r['motif'] ?? "",
          client: r['activité'] ?? r['activite'] ?? "",
          remplacementDe: r['remplacement de'] ?? "",
          debut: vac.debut,
          fin: vac.fin,
        });
      }
    } else {
      planning.push({
        mat,
        dateVac: parseDate(r[colPDate]),
        agent: r[colPAgent] ?? "",
        lieu: r['lieu de la commande'] ?? r['lieu'] ?? "",
        motif: r['motif'] ?? "",
        client: r['activité'] ?? r['activite'] ?? "",
        remplacementDe: r['remplacement de'] ?? "",
        debut: "",
        fin: "",
      });
    }
  }

  if (nbSansMatricule > 0) {
    warnings.push(`⚠️ ${nbSansMatricule} ligne(s) du planning n'ont pas de matricule extractible dans la colonne Agent (format attendu : 'NOM (000000000)') et ont été ignorées du contrôle.`);
  }

  const matsPlanningAbsents = [...new Set(
    planning.map(p => p.mat).filter(m => m !== "" && !matsContrats.has(m))
  )].sort();

  if (matsPlanningAbsents.length > 0) {
    warnings.push(`ℹ️ ${matsPlanningAbsents.length} matricule(s) du planning n'apparaissent dans AUCUN contrat (à vérifier s'ils sont bien censés être sous contrat) : ${matsPlanningAbsents.slice(0, 30).join(', ')}`);
  }

  // ---- Détection des anomalies ----
  const anomalies: Anomaly[] = [];
  for (const p of planning) {
    if (!p.dateVac || !p.mat) continue;

    const sousContrats = contrats.filter(c => c.mat === p.mat);
    const couvert = sousContrats.some(c =>
      c.dtDeb && c.dtFin && sameOrBetween(p.dateVac!, c.dtDeb!, c.dtFin!)
    );

    if (!couvert) {
      anomalies.push({
        Matricule: p.mat,
        Agent: p.agent,
        "Date Vacation": p.dateVac.toLocaleDateString('fr-FR'),
        "Début": p.debut,
        "Fin": p.fin,
        Motif: p.motif,
        "Remplacement de": p.remplacementDe,
        Client: p.client,
        Statut: "Non couvert",
      });
    }
  }

  // ---- Génération du fichier xlsx de sortie ----
  let xlsxBase64: string | null = null;
  if (anomalies.length > 0) {
    const ws = XLSX.utils.json_to_sheet(anomalies);

    const cols = Object.keys(anomalies[0]);
    ws['!cols'] = cols.map(col => {
      const maxLen = Math.max(
        col.length,
        ...anomalies.map(row => String((row as any)[col] ?? "").length)
      );
      return { wch: maxLen + 2 };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Non couvertes");
    xlsxBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  }

  return { anomalies, warnings, xlsxBase64 };
}
