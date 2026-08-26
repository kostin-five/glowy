import type { Task } from "../types";
import type {
  OfflineTaskOperation,
  OfflineTaskSnapshot,
} from "./taskOfflineTypes";

const DATABASE_NAME = "glowy-offline";
const DATABASE_VERSION = 1;
const SNAPSHOTS = "task-snapshots";
const OPERATIONS = "task-operations";

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SNAPSHOTS)) {
        database.createObjectStore(SNAPSHOTS, { keyPath: "ownerKey" });
      }
      if (!database.objectStoreNames.contains(OPERATIONS)) {
        const store = database.createObjectStore(OPERATIONS, {
          keyPath: "id",
        });
        store.createIndex("ownerKey", "ownerKey", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const transactionDone = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

const snapshotRevision = (snapshot: OfflineTaskSnapshot | undefined) =>
  snapshot?.revision ?? snapshot?.updatedAt ?? null;

const createSnapshot = (
  ownerKey: string,
  tasks: Task[]
) => ({
  ownerKey,
  tasks,
  updatedAt: new Date().toISOString(),
  revision:
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`,
} satisfies OfflineTaskSnapshot);

export const supportsTaskOfflineStorage = () =>
  typeof window !== "undefined" && "indexedDB" in window;

export const readTaskSnapshot = async (
  ownerKey: string
): Promise<Task[] | null> => {
  if (!supportsTaskOfflineStorage()) return null;
  const database = await openDatabase();
  const transaction = database.transaction(SNAPSHOTS, "readonly");
  const snapshot = await requestResult<OfflineTaskSnapshot | undefined>(
    transaction.objectStore(SNAPSHOTS).get(ownerKey)
  );
  database.close();
  return snapshot?.tasks ?? null;
};

export const readTaskSnapshotRevision = async (ownerKey: string) => {
  if (!supportsTaskOfflineStorage()) return null;
  const database = await openDatabase();
  const transaction = database.transaction(SNAPSHOTS, "readonly");
  const snapshot = await requestResult<OfflineTaskSnapshot | undefined>(
    transaction.objectStore(SNAPSHOTS).get(ownerKey)
  );
  database.close();
  return snapshotRevision(snapshot);
};

export const writeTaskSnapshot = async (ownerKey: string, tasks: Task[]) => {
  if (!supportsTaskOfflineStorage()) return;
  const database = await openDatabase();
  const transaction = database.transaction(SNAPSHOTS, "readwrite");
  transaction.objectStore(SNAPSHOTS).put(createSnapshot(ownerKey, tasks));
  await transactionDone(transaction);
  database.close();
};

export const writeTaskSnapshotIfUnchanged = async (
  ownerKey: string,
  tasks: Task[],
  expectedRevision: string | null
) => {
  if (!supportsTaskOfflineStorage()) return true;
  const database = await openDatabase();
  const transaction = database.transaction(SNAPSHOTS, "readwrite");
  const store = transaction.objectStore(SNAPSHOTS);
  const current = await requestResult<OfflineTaskSnapshot | undefined>(
    store.get(ownerKey)
  );
  const unchanged = snapshotRevision(current) === expectedRevision;
  if (unchanged) store.put(createSnapshot(ownerKey, tasks));
  await transactionDone(transaction);
  database.close();
  return unchanged;
};

export const listTaskOperations = async (ownerKey: string) => {
  if (!supportsTaskOfflineStorage()) return [];
  const database = await openDatabase();
  const transaction = database.transaction(OPERATIONS, "readonly");
  const operations = await requestResult<OfflineTaskOperation[]>(
    transaction.objectStore(OPERATIONS).index("ownerKey").getAll(ownerKey)
  );
  database.close();
  return operations.sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
};

export const putTaskOperation = async (operation: OfflineTaskOperation) => {
  if (!supportsTaskOfflineStorage()) return;
  const database = await openDatabase();
  const transaction = database.transaction(OPERATIONS, "readwrite");
  transaction.objectStore(OPERATIONS).put(operation);
  await transactionDone(transaction);
  database.close();
};

export const deleteTaskOperation = async (id: string) => {
  if (!supportsTaskOfflineStorage()) return;
  const database = await openDatabase();
  const transaction = database.transaction(OPERATIONS, "readwrite");
  transaction.objectStore(OPERATIONS).delete(id);
  await transactionDone(transaction);
  database.close();
};

export const replaceTaskOperations = async (
  ownerKey: string,
  operations: OfflineTaskOperation[]
) => {
  if (!supportsTaskOfflineStorage()) return;
  const current = await listTaskOperations(ownerKey);
  const database = await openDatabase();
  const transaction = database.transaction(OPERATIONS, "readwrite");
  const store = transaction.objectStore(OPERATIONS);
  current.forEach((operation) => store.delete(operation.id));
  operations.forEach((operation) => store.put(operation));
  await transactionDone(transaction);
  database.close();
};
