const DATABASE_NAME = "glowy-personalization";
const DATABASE_VERSION = 1;
const STORE_NAME = "wallpapers";
const CUSTOM_WALLPAPER_KEY = "custom";

export const MAX_CUSTOM_WALLPAPER_BYTES = 5 * 1024 * 1024;
export const CUSTOM_WALLPAPER_ACCEPT = "image/png,image/jpeg,image/webp";

const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export class CustomWallpaperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomWallpaperError";
  }
}

export const validateCustomWallpaperFile = (file: File): void => {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new CustomWallpaperError(
      "Выбери изображение PNG, JPEG или WebP."
    );
  }

  if (file.size > MAX_CUSTOM_WALLPAPER_BYTES) {
    throw new CustomWallpaperError("Файл должен быть не больше 5 МБ.");
  }

  if (file.size === 0) {
    throw new CustomWallpaperError("Не удалось прочитать пустой файл.");
  }
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new CustomWallpaperError("Локальное хранилище недоступно."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new CustomWallpaperError("Не удалось открыть локальное хранилище."));
  });

const runTransaction = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () =>
      reject(new CustomWallpaperError("Не удалось обновить локальные обои."));
    transaction.oncomplete = () => {
      database.close();
      resolve(result);
    };
    transaction.onabort = () => {
      database.close();
      reject(new CustomWallpaperError("Не удалось обновить локальные обои."));
    };
  });
};

export const getCustomWallpaper = async (): Promise<Blob | null> => {
  const value = await runTransaction<Blob | undefined>("readonly", (store) =>
    store.get(CUSTOM_WALLPAPER_KEY)
  );
  return value instanceof Blob ? value : null;
};

export const saveCustomWallpaper = async (file: File): Promise<void> => {
  validateCustomWallpaperFile(file);
  await runTransaction<IDBValidKey>("readwrite", (store) =>
    store.put(file, CUSTOM_WALLPAPER_KEY)
  );
};

export const deleteCustomWallpaper = async (): Promise<void> => {
  await runTransaction<undefined>("readwrite", (store) =>
    store.delete(CUSTOM_WALLPAPER_KEY)
  );
};
