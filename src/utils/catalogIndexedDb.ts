import { ProductComboItem } from '../data/productCatalog';

const DB_NAME = 'MaquilaInspectionCatalogDB';
const DB_VERSION = 1;
const STORE_NAME = 'catalogStore';
const RECORD_KEY = 'active_catalog_v2';

/**
 * Abre la conexión a IndexedDB nativa del navegador.
 * Proporciona almacenamiento de cientos de Megabytes sin las limitaciones de cuota (5MB) de localStorage.
 */
function openCatalogDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Error al abrir base de datos IndexedDB'));
    };
  });
}

/**
 * Guarda el catálogo masivo completo (ej. 2,530+ productos con miles de componentes) en IndexedDB.
 */
export async function saveCatalogToIndexedDB(items: ProductComboItem[]): Promise<boolean> {
  try {
    const db = await openCatalogDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(items, RECORD_KEY);

      putRequest.onsuccess = () => {
        resolve(true);
      };

      putRequest.onerror = () => {
        console.error('Error en putRequest IndexedDB:', putRequest.error);
        reject(putRequest.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('No se pudo guardar el catálogo en IndexedDB:', error);
    return false;
  }
}

/**
 * Recupera el catálogo persistente desde IndexedDB.
 */
export async function loadCatalogFromIndexedDB(): Promise<ProductComboItem[] | null> {
  try {
    const db = await openCatalogDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(RECORD_KEY);

      getRequest.onsuccess = () => {
        const result = getRequest.result;
        if (Array.isArray(result) && result.length > 0) {
          resolve(result as ProductComboItem[]);
        } else {
          resolve(null);
        }
      };

      getRequest.onerror = () => {
        console.error('Error en getRequest IndexedDB:', getRequest.error);
        reject(getRequest.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('No se pudo leer el catálogo desde IndexedDB:', error);
    return null;
  }
}

/**
 * Elimina el catálogo persistente en IndexedDB (para vaciar y empezar de cero).
 */
export async function clearCatalogFromIndexedDB(): Promise<boolean> {
  try {
    const db = await openCatalogDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const deleteRequest = store.delete(RECORD_KEY);

      deleteRequest.onsuccess = () => {
        resolve(true);
      };

      deleteRequest.onerror = () => {
        reject(deleteRequest.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error al limpiar IndexedDB:', error);
    return false;
  }
}
