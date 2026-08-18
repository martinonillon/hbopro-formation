import { supabase } from './supabase';

/**
 * Checks connection health to Supabase.
 * Returns { ok: true } if valid, or { ok: false, error: string } if unreachable or tables missing.
 */
export async function checkSupabaseHealth(): Promise<{ ok: boolean; error?: string }> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return { 
      ok: false, 
      error: "Variables d'environnement VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquantes dans la configuration." 
    };
  }

  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      return { 
        ok: false, 
        error: `Impossible d'accéder aux tables Supabase: ${error.message} (Code: ${error.code || 'INCONNU'}). Vérifiez que les tables et règles RLS sont créées.` 
      };
    }
    return { ok: true };
  } catch (err: any) {
    return { 
      ok: false, 
      error: `Erreur de connexion réseau Supabase: ${err?.message || String(err)}` 
    };
  }
}

/**
 * Automatically checks localStorage for existing offline data (collaborators, logs, modules, users).
 * If Supabase tables are empty and local data exists, migrates local data to Supabase and calls onMigrated.
 */
export async function checkAndMigrateLocalStorage(_onMigrated?: (message: string) => void): Promise<void> {
  // Seeding automatique et migration désactivés conformément au nettoyage strict
  return;
}

/**
 * Synchronizes a Supabase table with React state in real-time.
 * Fetches initial rows and listens to real-time INSERT/UPDATE/DELETE changes. No automatic seeding.
 */
export function syncSupabaseTable<T extends { id: string }>(
  tableName: string,
  onDataUpdate: (data: T[]) => void,
  _initialData: T[] = [],
  onError?: (errorMessage: string) => void
): () => void {
  let currentItems: T[] = [];

  // Function to load initial data
  const loadInitialData = async () => {
    try {
      if (tableName === 'training_logs') {
        const { data, error } = await supabase.from('training_logs').select('*');
        if (error) {
          console.warn(`Supabase select error on training_logs:`, error.message);
          if (onError && !isNonFatalSupabaseError(error)) {
            onError(`Impossible de lire la table Supabase 'training_logs': ${error.message}`);
          }
          return;
        }

        const logs = (data || []).map((item: any) => {
          if (item && item.data && typeof item.data === 'object' && Object.keys(item.data).length > 0) {
            return { id: item.id, ...item.data };
          }
          return item;
        }).filter(Boolean) as T[];

        currentItems = logs;
        onDataUpdate(currentItems);
        return;
      }

      const { data, error } = await supabase.from(tableName).select('*');
      if (error) {
        console.warn(`Supabase select error on ${tableName}:`, error.message);
        if (onError && !isNonFatalSupabaseError(error)) {
          onError(`Impossible de lire la table Supabase '${tableName}': ${error.message}`);
        }
        return;
      }

      currentItems = (data || []) as T[];
      onDataUpdate(currentItems);
    } catch (err: any) {
      console.error(`Error loading Supabase table ${tableName}:`, err);
      if (onError) {
        onError(`Erreur réseau Supabase lors de l'accès à la table '${tableName}': ${err?.message || String(err)}`);
      }
    }
  };

  loadInitialData();

  // Subscribe to real-time Postgres changes for this table
  const channel = supabase
    .channel(`realtime:${tableName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      (payload) => {
        if (tableName === 'training_logs') {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            const logItem = (row && row.data ? row.data : row) as T;
            if (logItem && logItem.id) {
              currentItems = [logItem, ...currentItems.filter((item) => item.id !== logItem.id)];
              onDataUpdate([...currentItems]);
            }
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as { id: string };
            currentItems = currentItems.filter((item) => item.id !== oldRow.id);
            onDataUpdate([...currentItems]);
          }
          return;
        }

        if (payload.eventType === 'INSERT') {
          const newRow = payload.new as T;
          currentItems = [newRow, ...currentItems.filter((item) => item.id !== newRow.id)];
          onDataUpdate([...currentItems]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedRow = payload.new as T;
          currentItems = currentItems.map((item) =>
            item.id === updatedRow.id ? { ...item, ...updatedRow } : item
          );
          onDataUpdate([...currentItems]);
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as { id: string };
          currentItems = currentItems.filter((item) => item.id !== oldRow.id);
          onDataUpdate([...currentItems]);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Supabase Realtime subscribed to ${tableName}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.warn(`Supabase Realtime channel error on ${tableName}`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Helper to validate and convert date strings into ISO/SQL YYYY-MM-DD or null
 */
function toSqlDateOrNull(val: any): string | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'NaN') return null;

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    if (/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}$/.test(trimmed)) {
      const parts = trimmed.split(/[\/.-]/);
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      const mNum = parseInt(month, 10);
      const dNum = parseInt(day, 10);
      if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
        return `${year}-${month}-${day}`;
      }
      return null;
    }

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const isoPart = trimmed.substring(0, 10);
      if (!isNaN(Date.parse(isoPart))) {
        return isoPart;
      }
      return null;
    }

    // Try standard Date parsing
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } else if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
  }
  return null;
}

/**
 * Helper to convert numeric fields like montantFacture into number or null
 */
function toNumericOrNull(val: any): number | null {
  if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') return null;
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? null : val;
  if (typeof val === 'string') {
    const cleanedStr = val.replace(',', '.').replace(/[^0-9.-]/g, '');
    if (!cleanedStr) return null;
    const cleaned = parseFloat(cleanedStr);
    return isNaN(cleaned) || !isFinite(cleaned) ? null : cleaned;
  }
  return null;
}

/**
 * Helper to extract missing column name from Supabase/PostgREST error messages
 */
export function extractMissingColumnFromError(error: any): string | null {
  if (!error) return null;
  const str = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
  
  // Pattern 1: Could not find the 'column_name' column of 'table_name' in the schema cache
  const match1 = str.match(/Could not find the ['"]([^'"]+)['"] column/i);
  if (match1 && match1[1]) return match1[1];

  // Pattern 2: column "column_name" of relation "table_name" does not exist
  const match2 = str.match(/column ['"]?([a-zA-Z0-9_]+)['"]? (?:of relation .*)?does not exist/i);
  if (match2 && match2[1]) return match2[1];

  // Pattern 3: relation "table_name" has no column "column_name"
  const match3 = str.match(/has no column ['"]?([a-zA-Z0-9_]+)['"]?/i);
  if (match3 && match3[1]) return match3[1];

  // Pattern 4: 'column_name' column missing
  const match4 = str.match(/['"]([a-zA-Z0-9_]+)['"] column/i);
  if (match4 && match4[1]) return match4[1];

  return null;
}

/**
 * Checks if a Supabase error is non-fatal (e.g. table missing from schema cache, permission denied / RLS policy).
 * In those cases, the app continues using primary local / Firestore storage without popping alarming error banners.
 */
export function isNonFatalSupabaseError(error: any): boolean {
  if (!error) return false;
  const str = `${error.message || ''} ${error.details || ''} ${error.hint || ''} ${error.code || ''}`.toLowerCase();
  
  if (
    str.includes("could not find the table") ||
    str.includes("schema cache") ||
    str.includes("relation") && str.includes("does not exist") ||
    error.code === 'PGRST204' ||
    error.code === '42P01'
  ) {
    return true;
  }

  if (
    str.includes("permission denied") ||
    str.includes("row-level security") ||
    str.includes("rls") ||
    error.code === '42501' ||
    error.status === 403
  ) {
    return true;
  }

  return false;
}

/**
 * Sanitizes items specifically for each Supabase table to match table columns exactly
 * and prevent HTTP 400 / 404 / column mismatch errors.
 * Includes dual camelCase / snake_case mapping for maximum compatibility.
 */
export function sanitizeItemForTable(tableName: string, item: any): Record<string, any> {
  if (!item || typeof item !== 'object') return {};

  const strOrNull = (val: any): string | null => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    }
    return String(val);
  };

  const strOrEmpty = (val: any): string => {
    if (val === undefined || val === null) return '';
    if (typeof val === 'string') return val.trim();
    return String(val);
  };

  if (tableName === 'training_logs') {
    const logId = item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'l-' + Math.random().toString(36).substring(2, 9));
    
    // Clean data payload for JSONB column without undefined values
    const jsonPayload = JSON.parse(JSON.stringify(item, (_key, val) => (val === undefined ? null : val)));

    const clean: Record<string, any> = {
      id: logId,
      data: jsonPayload
    };

    // String fields - non null
    const collabId = strOrEmpty(item.collaboratorId || item.collaborator_id);
    clean.collaboratorId = collabId;
    clean.collaborator_id = collabId;

    const collabName = strOrEmpty(item.collaboratorName || item.collaborator_name);
    clean.collaboratorName = collabName;
    clean.collaborator_name = collabName;

    const modName = strOrEmpty(item.moduleName || item.module_name);
    clean.moduleName = modName;
    clean.module_name = modName;

    clean.formateur = strOrEmpty(item.formateur);
    clean.type = strOrEmpty(item.type);
    clean.cycle = strOrEmpty(item.cycle);
    clean.escale = strOrEmpty(item.escale);
    clean.service = strOrEmpty(item.service);
    clean.resultat = strOrEmpty(item.resultat);
    clean.consigne = strOrEmpty(item.consigne);

    // Dates
    const dInsc = toSqlDateOrNull(item.dateInscription || item.date_inscription);
    clean.dateInscription = dInsc;
    clean.date_inscription = dInsc;

    const dDeb = toSqlDateOrNull(item.dateDebut || item.date_debut);
    clean.dateDebut = dDeb;
    clean.date_debut = dDeb;

    const dFin = toSqlDateOrNull(item.dateFin || item.date_fin);
    clean.dateFin = dFin;
    clean.date_fin = dFin;

    const dPaye = toSqlDateOrNull(item.datePaye || item.date_paye);
    clean.datePaye = dPaye;
    clean.date_paye = dPaye;

    // Numbers
    const montant = toNumericOrNull(item.montantFacture ?? item.montant_facture);
    clean.montantFacture = montant;
    clean.montant_facture = montant;

    // Booleans
    const mad = Boolean(item.madEa ?? item.mad_ea);
    clean.madEa = mad;
    clean.mad_ea = mad;

    const ctt = Boolean(item.cttHbo ?? item.ctt_hbo);
    clean.cttHbo = ctt;
    clean.ctt_hbo = ctt;

    clean.convoc = Boolean(item.convoc);
    clean.emrg = Boolean(item.emrg);
    clean.attest = Boolean(item.attest);

    // Nullable strings
    clean.visa = strOrNull(item.visa);
    clean.notes = strOrNull(item.notes);

    const idForm = strOrNull(item.idFormateur || item.id_formateur);
    clean.idFormateur = idForm;
    clean.id_formateur = idForm;

    const hDeb1 = strOrNull(item.heureDebut1 || item.heure_debut_1);
    clean.heureDebut1 = hDeb1;
    clean.heure_debut_1 = hDeb1;

    const hFin1 = strOrNull(item.heureFin1 || item.heure_fin_1);
    clean.heureFin1 = hFin1;
    clean.heure_fin_1 = hFin1;

    const hDeb2 = strOrNull(item.heureDebut2 || item.heure_debut_2);
    clean.heureDebut2 = hDeb2;
    clean.heure_debut_2 = hDeb2;

    const hFin2 = strOrNull(item.heureFin2 || item.heure_fin_2);
    clean.heureFin2 = hFin2;
    clean.heure_fin_2 = hFin2;

    clean.lieu = strOrNull(item.lieu);

    const nSess = strOrNull(item.numSession || item.num_session);
    clean.numSession = nSess;
    clean.num_session = nSess;

    const emrgUrl = strOrNull(item.emrgFileUrl || item.emrg_file_url);
    clean.emrgFileUrl = emrgUrl;
    clean.emrg_file_url = emrgUrl;

    const emrgName = strOrNull(item.emrgFileName || item.emrg_file_name);
    clean.emrgFileName = emrgName;
    clean.emrg_file_name = emrgName;

    const commPaye = strOrNull(item.commentairePaye || item.commentaire_paye);
    clean.commentairePaye = commPaye;
    clean.commentaire_paye = commPaye;

    const nFact = strOrNull(item.numFacture || item.num_facture);
    clean.numFacture = nFact;
    clean.num_facture = nFact;

    return clean;
  }

  if (tableName === 'collaborators') {
    const clean: Record<string, any> = {};
    const fName = strOrEmpty(item.firstName || item.first_name);
    const lName = strOrEmpty(item.lastName || item.last_name);
    const hDate = toSqlDateOrNull(item.hireDate || item.hire_date);

    clean.id = item.id;
    clean.firstName = fName;
    clean.first_name = fName;
    clean.lastName = lName;
    clean.last_name = lName;
    clean.email = strOrEmpty(item.email);
    clean.escale = strOrEmpty(item.escale);
    clean.service = strOrEmpty(item.service);
    clean.avatar = strOrNull(item.avatar);
    clean.hireDate = hDate;
    clean.hire_date = hDate;
    clean.matricule = strOrEmpty(item.matricule);
    clean.phone = strOrEmpty(item.phone);
    return clean;
  }

  if (tableName === 'modules_catalog') {
    const clean: Record<string, any> = {};
    clean.id = item.id;
    clean.name = strOrEmpty(item.name);
    clean.formateur = strOrEmpty(item.formateur);
    clean.type = strOrEmpty(item.type);
    clean.cycle = strOrEmpty(item.cycle);
    clean.escale = strOrEmpty(item.escale);
    clean.service = strOrEmpty(item.service);
    clean.visa = strOrNull(item.visa);
    clean.resultat = strOrEmpty(item.resultat);
    clean.consigne = strOrEmpty(item.consigne);
    clean.category = strOrEmpty(item.category);
    clean.code = strOrEmpty(item.code);
    return clean;
  }

  if (tableName === 'users' || tableName === 'profiles') {
    const clean: Record<string, any> = {};
    clean.id = item.id;
    clean.username = strOrEmpty(item.username || item.email);
    clean.email = strOrEmpty(item.email || item.username);
    const fName = strOrEmpty(item.firstName || item.first_name);
    const lName = strOrEmpty(item.lastName || item.last_name);
    clean.firstName = fName;
    clean.first_name = fName;
    clean.lastName = lName;
    clean.last_name = lName;
    clean.role = strOrEmpty(item.role || 'AGENT');
    clean.status = strOrEmpty(item.status || 'approved');
    if (item.authId || item.auth_id) {
      clean.authId = item.authId || item.auth_id;
      clean.auth_id = item.authId || item.auth_id;
    }
    clean.permissions = item.permissions || [];
    const cAt = item.createdAt || item.created_at || new Date().toISOString();
    clean.createdAt = cAt;
    clean.created_at = cAt;
    return clean;
  }

  if (tableName === 'registration_requests' || tableName === 'pending_users') {
    const clean: Record<string, any> = {};
    clean.id = item.id;
    const fName = strOrEmpty(item.firstName || item.first_name);
    const lName = strOrEmpty(item.lastName || item.last_name);
    clean.firstName = fName;
    clean.first_name = fName;
    clean.lastName = lName;
    clean.last_name = lName;
    clean.email = strOrEmpty(item.email);
    clean.role = strOrEmpty(item.role || 'AGENT');
    clean.status = strOrEmpty(item.status || 'pending');
    const cAt = item.createdAt || item.created_at || new Date().toISOString();
    clean.createdAt = cAt;
    clean.created_at = cAt;
    return clean;
  }

  if (tableName === 'contacts') {
    const clean: Record<string, any> = {};
    clean.id = item.id;
    clean.genre = strOrNull(item.genre);
    clean.lastName = strOrEmpty(item.lastName || item.last_name);
    clean.last_name = strOrEmpty(item.lastName || item.last_name);
    clean.firstName = strOrEmpty(item.firstName || item.first_name);
    clean.first_name = strOrEmpty(item.firstName || item.first_name);
    clean.escale = strOrEmpty(item.escale || 'BOD');
    clean.entity = strOrEmpty(item.entity || 'HUBJOB');
    clean.company = strOrNull(item.company);
    clean.service = strOrNull(item.service);
    clean.position = strOrNull(item.position);
    clean.comment = strOrNull(item.comment);
    clean.mobilePhone = strOrNull(item.mobilePhone || item.mobile_phone);
    clean.mobile_phone = strOrNull(item.mobilePhone || item.mobile_phone);
    clean.landlinePhone = strOrNull(item.landlinePhone || item.landline_phone);
    clean.landline_phone = strOrNull(item.landlinePhone || item.landline_phone);
    clean.email = strOrNull(item.email);
    clean.createdAt = item.createdAt || item.created_at || new Date().toISOString();
    clean.created_at = item.createdAt || item.created_at || new Date().toISOString();
    clean.updatedAt = item.updatedAt || item.updated_at || new Date().toISOString();
    clean.updated_at = item.updatedAt || item.updated_at || new Date().toISOString();
    return clean;
  }

  // General fallback: remove undefined and non-serializable fields
  const clean: Record<string, any> = {};
  Object.keys(item).forEach(key => {
    if (item[key] !== undefined && typeof item[key] !== 'function') {
      clean[key] = item[key];
    }
  });
  return clean;
}

/**
 * Saves/upserts a single item into a Supabase table
 */
export async function saveToSupabase<T extends { id: string }>(
  tableName: string,
  item: T,
  onError?: (errMessage: string) => void
): Promise<boolean> {
  return saveBulkToSupabase(tableName, [item], onError);
}

/**
 * Clears/Deletes all items from a Supabase table
 */
export async function clearSupabaseTable(
  tableName: string,
  onError?: (errMessage: string) => void
): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).delete().not('id', 'is', null);
    if (error) {
      console.warn(`Supabase clear error on ${tableName}:`, error.message);
      if (onError && !isNonFatalSupabaseError(error)) {
        const msg = `Erreur de vidage Supabase (table '${tableName}'): ${error.message}`;
        onError(msg);
      }
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`Exception clearing Supabase table ${tableName}:`, err);
    if (onError && !isNonFatalSupabaseError(err)) {
      const msg = `Exception réseau Supabase (table '${tableName}'): ${err?.message || String(err)}`;
      onError(msg);
    }
    return false;
  }
}

/**
 * Deletes an item from a Supabase table by ID
 */
export async function deleteFromSupabase(
  tableName: string,
  itemId: string,
  onError?: (errMessage: string) => void
): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).delete().eq('id', itemId);
    if (error) {
      console.warn(`Supabase delete error on ${tableName}:`, error.message);
      if (onError && !isNonFatalSupabaseError(error)) {
        const msg = `Erreur de suppression Supabase (table '${tableName}'): ${error.message}`;
        onError(msg);
      }
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`Exception deleting from Supabase ${tableName}:`, err);
    if (onError && !isNonFatalSupabaseError(err)) {
      const msg = `Exception réseau Supabase (table '${tableName}'): ${err?.message || String(err)}`;
      onError(msg);
    }
    return false;
  }
}

/**
 * Saves a list of items in bulk to a Supabase table
 * Features a fallback/degraded mode that detects missing schema columns,
 * strips them automatically, and retries the upsert to prevent complete blockage.
 */
export async function saveBulkToSupabase<T extends { id: string }>(
  tableName: string,
  items: T[],
  onError?: (errMessage: string) => void
): Promise<boolean> {
  if (!items || items.length === 0) return true;

  const sanitizedItems = items.map(item => sanitizeItemForTable(tableName, item));
  const knownMissingCols = new Set<string>();

  // Batch in chunks (100 for training_logs, 50 for other tables) to avoid payload limits & timeouts
  const CHUNK_SIZE = tableName === 'training_logs' ? 100 : 50;
  let allSuccessful = true;
  let firstErrorMessage = '';

  for (let i = 0; i < sanitizedItems.length; i += CHUNK_SIZE) {
    let chunk = sanitizedItems.slice(i, i + CHUNK_SIZE);

    // Strip known missing columns from this chunk before trying
    if (knownMissingCols.size > 0) {
      chunk = chunk.map(row => {
        const cleanRow = { ...row };
        knownMissingCols.forEach(col => delete cleanRow[col]);
        return cleanRow;
      });
    }

    let chunkSuccess = false;
    let retriesLeft = 20;

    while (!chunkSuccess && retriesLeft > 0) {
      retriesLeft--;
      try {
        const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'id' });

        if (!error) {
          chunkSuccess = true;
          break;
        }

        console.warn(`[Supabase Error] Bulk save on '${tableName}' (chunk ${Math.floor(i / CHUNK_SIZE) + 1}): ${error.message} (${error.details || ''})`);

        // Check if error is due to a missing/invalid column in the schema
        const missingCol = extractMissingColumnFromError(error);

        if (missingCol) {
          console.warn(`[Supabase Fallback] Column '${missingCol}' does not exist in table '${tableName}'. Stripping column and retrying chunk...`);
          knownMissingCols.add(missingCol);
          chunk = chunk.map(row => {
            const copy = { ...row };
            delete copy[missingCol];
            return copy;
          });
          // Retry loop with stripped chunk
          continue;
        }

        // Check if error is non-fatal (missing table / permissions)
        if (isNonFatalSupabaseError(error)) {
          console.warn(`[Supabase Fallback] Non-fatal Supabase error on table '${tableName}': ${error.message}. Skipping Supabase sync for this item.`);
          allSuccessful = false;
          break;
        }

        // If not a missing column error (e.g. auth error, constraint failure, connection issue):
        const errDetail = `${error.message}${error.details ? ` (${error.details})` : ''}${error.hint ? ` [Hint: ${error.hint}]` : ''}`;
        if (!firstErrorMessage && !isNonFatalSupabaseError(error)) {
          firstErrorMessage = errDetail;
        }
        allSuccessful = false;
        break;
      } catch (err: any) {
        console.error(`[Supabase Exception] Exception bulk saving to table '${tableName}':`, err);
        const excMsg = err?.message || String(err);
        if (!firstErrorMessage && !isNonFatalSupabaseError(err)) {
          firstErrorMessage = excMsg;
        }
        allSuccessful = false;
        break;
      }
    }

    if (!chunkSuccess && retriesLeft === 0) {
      if (!firstErrorMessage) {
        firstErrorMessage = `Échec après plusieurs essais pour la table '${tableName}'.`;
      }
      allSuccessful = false;
    }
  }

  if (!allSuccessful && onError && firstErrorMessage) {
    onError(firstErrorMessage);
  }

  return allSuccessful;
}

/**
 * Uploads a generated PDF file blob to Supabase Storage ('emargements' bucket)
 * Returns the public access URL if successful
 */
export async function uploadPdfToSupabaseStorage(
  fileName: string,
  blob: Blob
): Promise<string | null> {
  try {
    const bucketName = 'emargements';
    // Ensure file extension
    const fullFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fullFileName, blob, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (error) {
      console.warn(`Supabase storage upload error (${bucketName}):`, error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error(`Failed to upload PDF to Supabase storage:`, err);
    return null;
  }
}

/**
 * Fetches session details directly from Supabase for a given session number or log ID.
 */
export async function fetchSessionDetails(sessionId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('training_logs').select('*');
    if (error || !data) return [];

    const allLogs = data.map((item: any) => {
      if (item && item.data && typeof item.data === 'object' && Object.keys(item.data).length > 0) {
        return { id: item.id, ...item.data };
      }
      return item;
    }).filter(Boolean);

    const sessionLogs = allLogs.filter((log: any) => 
      log.numSession === sessionId ||
      log.num_session === sessionId ||
      log.id === sessionId
    );

    return sessionLogs;
  } catch (err) {
    console.error(`Error in fetchSessionDetails for session ${sessionId}:`, err);
    return [];
  }
}

/**
 * Fetches all training logs directly from Supabase.
 */
export async function fetchAllTrainingLogsFromSupabase(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('training_logs').select('*');
    if (error || !data) return [];

    const logs = data.map((item: any) => {
      if (item && item.data && typeof item.data === 'object' && Object.keys(item.data).length > 0) {
        return { id: item.id, ...item.data };
      }
      return item;
    }).filter(Boolean);

    return logs;
  } catch (err) {
    console.error('Error in fetchAllTrainingLogsFromSupabase:', err);
    return [];
  }
}

