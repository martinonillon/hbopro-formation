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
 * Saves/upserts a single item into a Supabase table
 */
export async function saveToSupabase<T extends { id: string }>(
  tableName: string,
  item: T,
  onError?: (errMessage: string) => void
): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).upsert(item, { onConflict: 'id' });
    if (error) {
      console.error(`Supabase save error on ${tableName}:`, error.message);
      const msg = `Erreur d'enregistrement Supabase (table '${tableName}'): ${error.message}`;
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
  try {
    const { error } = await supabase.from(tableName).upsert(items, { onConflict: 'id' });
    if (error) {
      console.error(`Supabase bulk save error on ${tableName}:`, error.message);
      const msg = `Erreur d'enregistrement en masse Supabase (table '${tableName}'): ${error.message}`;
      if (onError) onError(msg);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`Exception bulk saving to Supabase ${tableName}:`, err);
    const msg = `Exception réseau Supabase (table '${tableName}'): ${err?.message || String(err)}`;
    if (onError) onError(msg);
    return false;
  }
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

