import { QualityReport } from '../types/qualityReport';

const DB_NAME = 'MaquilaInspectionReportsDB';
const DB_VERSION = 1;
const STORE_NAME = 'reportsStore';
const RECORD_KEY = 'saved_reports_v1';

/**
 * Abre la conexión a IndexedDB nativa del navegador para los reportes de calidad.
 * IndexedDB ofrece cientos de megabytes de capacidad, eliminando el límite de 5MB de localStorage.
 */
function openReportsDatabase(): Promise<IDBDatabase> {
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
      reject(request.error || new Error('Error al abrir base de datos de reportes en IndexedDB'));
    };
  });
}

/**
 * Guarda la lista completa de reportes (incluyendo fotos de evidencia y firmas) en IndexedDB.
 */
export async function saveReportsToIndexedDB(reports: QualityReport[]): Promise<boolean> {
  try {
    const db = await openReportsDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(reports, RECORD_KEY);

      putRequest.onsuccess = () => {
        resolve(true);
      };

      putRequest.onerror = () => {
        console.warn('Error en putRequest IndexedDB para reportes:', putRequest.error);
        reject(putRequest.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('No se pudo guardar los reportes en IndexedDB:', error);
    return false;
  }
}

/**
 * Recupera la lista de reportes guardada desde IndexedDB.
 */
export async function loadReportsFromIndexedDB(): Promise<QualityReport[] | null> {
  try {
    const db = await openReportsDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(RECORD_KEY);

      getRequest.onsuccess = () => {
        const result = getRequest.result;
        if (Array.isArray(result) && result.length > 0) {
          resolve(result as QualityReport[]);
        } else {
          resolve(null);
        }
      };

      getRequest.onerror = () => {
        console.warn('Error en getRequest IndexedDB para reportes:', getRequest.error);
        reject(getRequest.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('No se pudo leer los reportes desde IndexedDB:', error);
    return null;
  }
}

/**
 * Limpia los reportes en IndexedDB.
 */
export async function clearReportsFromIndexedDB(): Promise<boolean> {
  try {
    const db = await openReportsDatabase();
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
    console.warn('Error al limpiar reportes en IndexedDB:', error);
    return false;
  }
}
