import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDocs,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Helper to safely sync a Firestore collection with local state in real-time.
 * If the collection is empty on initial load, it seeds Firestore with initialData.
 */
export function syncCollection<T extends { id: string }>(
  collectionName: string,
  onDataUpdate: (data: T[]) => void,
  _initialData: T[] = []
): () => void {
  const colRef = collection(db, collectionName);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot: QuerySnapshot<DocumentData>) => {
      if (snapshot.empty) {
        onDataUpdate([]);
      } else {
        const items: T[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as T),
          id: docSnap.id,
        }));
        onDataUpdate(items);
      }
    },
    (error) => {
      console.warn(`Firestore real-time subscription error on ${collectionName}:`, error);
    }
  );

  return unsubscribe;
}

/**
 * Saves or updates a single item in a Firestore collection
 */
export async function saveItemToFirestore<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, item.id);
    await setDoc(docRef, item, { merge: true });
  } catch (err) {
    console.error(`Error saving item to Firestore (${collectionName}/${item.id}):`, err);
  }
}

/**
 * Deletes an item from a Firestore collection
 */
export async function deleteItemFromFirestore(
  collectionName: string,
  itemId: string
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, itemId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Error deleting item from Firestore (${collectionName}/${itemId}):`, err);
  }
}

/**
 * Saves a whole list of items to Firestore (e.g. bulk import)
 */
export async function saveBulkToFirestore<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(db, collectionName, item.id);
      batch.set(docRef, item, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error(`Bulk save error on ${collectionName}:`, err);
  }
}
