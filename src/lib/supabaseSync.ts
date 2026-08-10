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
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) {
        console.warn(`Supabase select error on ${tableName}:`, error.message);
        if (onError) {
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
  if (!val || typeof val !== 'string') {
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
    return null;
  }
  const trimmed = val.trim();
  if (!trimmed) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[\/.-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }

  // Try Date.parse
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Helper to convert numeric fields like montantFacture into number or null
 */
function toNumericOrNull(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const cleaned = parseFloat(val.replace(',', '.').replace(/[^0-9.-]/g, ''));
    return isNaN(cleaned) ? null : cleaned;
  }
  return null;
}

/**
 * Sanitizes items specifically for each Supabase table to match table columns exactly
 * and prevent HTTP 404 / column mismatch errors.
 */
export function sanitizeItemForTable(tableName: string, item: any): Record<string, any> {
  if (!item || typeof item !== 'object') return {};

  if (tableName === 'training_logs') {
    const clean: Record<string, any> = {};
    const allowedColumns = [
      'id', 'collaboratorId', 'collaboratorName', 'moduleName', 'formateur',
      'type', 'cycle', 'escale', 'service', 'visa', 'resultat', 'consigne',
      'dateInscription', 'dateValidation', 'dateDebut', 'dateFin', 'notes',
      'idFormateur', 'heureDebut1', 'heureFin1', 'heureDebut2', 'heureFin2',
      'madEa', 'cttHbo', 'convoc', 'lieu', 'numSession', 'emrg', 'attest',
      'emrgFileUrl', 'emrgFileName', 'datePaye', 'commentairePaye',
      'numFacture', 'montantFacture'
    ];

    allowedColumns.forEach(col => {
      if (item[col] !== undefined) {
        clean[col] = item[col];
      }
    });

    if (!clean.id) clean.id = item.id || ('l-' + Math.random().toString(36).substring(2, 9));

    // Dates
    ['dateInscription', 'dateValidation', 'dateDebut', 'dateFin', 'datePaye'].forEach(dateCol => {
      if (clean[dateCol] !== undefined) {
        clean[dateCol] = toSqlDateOrNull(clean[dateCol]);
      }
    });

    // Numbers
    clean.montantFacture = toNumericOrNull(clean.montantFacture);

    // Booleans
    ['madEa', 'cttHbo', 'convoc', 'emrg', 'attest'].forEach(boolCol => {
      if (clean[boolCol] !== undefined) {
        clean[boolCol] = Boolean(clean[boolCol]);
      }
    });

    // String nullability
    ['visa', 'notes', 'idFormateur', 'heureDebut1', 'heureFin1', 'heureDebut2', 'heureFin2',
     'lieu', 'numSession', 'emrgFileUrl', 'emrgFileName', 'commentairePaye', 'numFacture'].forEach(strCol => {
      if (clean[strCol] === '' || clean[strCol] === undefined) {
        clean[strCol] = null;
      }
    });

    return clean;
  }

  if (tableName === 'collaborators') {
    const clean: Record<string, any> = {};
    const allowedColumns = ['id', 'firstName', 'lastName', 'email', 'escale', 'service', 'avatar', 'hireDate', 'matricule', 'phone'];
    allowedColumns.forEach(col => {
      if (item[col] !== undefined) clean[col] = item[col];
    });
    if (clean.hireDate !== undefined) clean.hireDate = toSqlDateOrNull(clean.hireDate);
    return clean;
  }

  if (tableName === 'modules_catalog') {
    const clean: Record<string, any> = {};
    const allowedColumns = ['id', 'name', 'formateur', 'type', 'cycle', 'escale', 'service', 'visa', 'resultat', 'consigne', 'category', 'code'];
    allowedColumns.forEach(col => {
      if (item[col] !== undefined) clean[col] = item[col];
    });
    return clean;
  }

  if (tableName === 'users') {
    const clean: Record<string, any> = {};
    const allowedColumns = ['id', 'username', 'lastName', 'firstName', 'role', 'permissions', 'createdAt'];
    allowedColumns.forEach(col => {
      if (item[col] !== undefined) clean[col] = item[col];
    });
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
  try {
    const sanitizedItem = sanitizeItemForTable(tableName, item);
    const { error } = await supabase.from(tableName).upsert(sanitizedItem, { onConflict: 'id' });
    if (error) {
      console.error(`Supabase save error on '${tableName}':`, error.message, error.details, error.hint, error.code);
      const msg = `Erreur d'enregistrement Supabase (table '${tableName}'): ${error.message}${error.details ? ` (${error.details})` : ''}`;
      if (onError) onError(msg);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`Exception saving to Supabase ${tableName}:`, err);
    const msg = `Exception réseau Supabase (table '${tableName}'): ${err?.message || String(err)}`;
    if (onError) onError(msg);
    return false;
  }
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
      console.error(`Supabase clear error on ${tableName}:`, error.message);
      const msg = `Erreur de vidage Supabase (table '${tableName}'): ${error.message}`;
      if (onError) onError(msg);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`Exception clearing Supabase table ${tableName}:`, err);
    const msg = `Exception réseau Supabase (table '${tableName}'): ${err?.message || String(err)}`;
    if (onError) onError(msg);
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
      console.error(`Supabase delete error on ${tableName}:`, error.message);
      const msg = `Erreur de suppression Supabase (table '${tableName}'): ${error.message}`;
      if (onError) onError(msg);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`Exception deleting from Supabase ${tableName}:`, err);
    const msg = `Exception réseau Supabase (table '${tableName}'): ${err?.message || String(err)}`;
    if (onError) onError(msg);
    return false;
  }
}

/**
 * Saves a list of items in bulk to a Supabase table
 */
export async function saveBulkToSupabase<T extends { id: string }>(
  tableName: string,
  items: T[],
  onError?: (errMessage: string) => void
): Promise<boolean> {
  if (!items || items.length === 0) return true;

  const sanitizedItems = items.map(item => sanitizeItemForTable(tableName, item));

  // Batch in chunks of 50 items to avoid payload limits & timeouts
  const CHUNK_SIZE = 50;
  let allSuccessful = true;
  let firstErrorMessage = '';

  for (let i = 0; i < sanitizedItems.length; i += CHUNK_SIZE) {
    const chunk = sanitizedItems.slice(i, i + CHUNK_SIZE);
    try {
      const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.error(`[Supabase Error] Bulk save failed on '${tableName}' (chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(sanitizedItems.length / CHUNK_SIZE)}):`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        const errDetail = `${error.message}${error.details ? ` (${error.details})` : ''}${error.hint ? ` [Hint: ${error.hint}]` : ''}`;
        if (!firstErrorMessage) {
          firstErrorMessage = errDetail;
        }
        allSuccessful = false;
      }
    } catch (err: any) {
      console.error(`[Supabase Exception] Exception bulk saving to table '${tableName}':`, err);
      const excMsg = err?.message || String(err);
      if (!firstErrorMessage) {
        firstErrorMessage = excMsg;
      }
      allSuccessful = false;
    }
  }

  if (!allSuccessful && onError) {
    onError(`Erreur d'enregistrement Supabase (table '${tableName}'): ${firstErrorMessage}`);
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

