/**
 * Minimal typed IndexedDB wrapper for the single device-identity record.
 *
 * We deliberately avoid the `idb` package: one object store, one record,
 * three operations. The record holds the non-extractable ECDSA private key
 * (via structured clone), the exported public JWK, and — once registered —
 * the device id and device-scoped refresh token. Keys and refresh token
 * live and die together, so clearing browser storage forces a clean
 * re-registration.
 */
import type { EcPublicJwk } from "@/features/devices/types";

export interface DeviceIdentityRecord {
  privateKey: CryptoKey;
  publicJwk: EcPublicJwk;
  deviceId?: string;
  refreshToken?: string;
}

const DB_NAME = "syncwarden";
const DB_VERSION = 1;
const STORE_NAME = "device-identity";
const RECORD_KEY = "self";

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = run(tx.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });
  } finally {
    db.close();
  }
};

export const getDeviceRecord = (): Promise<DeviceIdentityRecord | null> =>
  withStore<DeviceIdentityRecord | undefined>(
    "readonly",
    (store) => store.get(RECORD_KEY) as IDBRequest<DeviceIdentityRecord | undefined>,
  ).then((record) => record ?? null);

export const putDeviceRecord = async (record: DeviceIdentityRecord): Promise<void> => {
  await withStore("readwrite", (store) => store.put(record, RECORD_KEY));
};

export const deleteDeviceRecord = async (): Promise<void> => {
  await withStore("readwrite", (store) => store.delete(RECORD_KEY));
};
