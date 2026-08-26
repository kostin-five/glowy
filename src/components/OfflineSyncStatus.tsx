import { useEffect, useState, useSyncExternalStore } from "react";
import { CloudOff, RefreshCw, RotateCw } from "lucide-react";
import {
  getTaskOfflineSyncState,
  subscribeTaskOfflineSync,
  syncOfflineTasks,
} from "../offline/taskOfflineSync";

const OfflineSyncStatus = () => {
  const syncState = useSyncExternalStore(
    subscribeTaskOfflineSync,
    getTaskOfflineSyncState,
    getTaskOfflineSyncState
  );
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isSyncing = syncState.phase === "syncing";
  const needsAttention = syncState.phase === "attention";
  if (isOnline && !isSyncing && !needsAttention) return null;

  const pendingLabel = syncState.pendingCount
    ? `Сохранено на устройстве: ${syncState.pendingCount}`
    : "Задачи доступны на этом устройстве";

  return (
    <div
      aria-live="polite"
      className={`flex min-h-11 shrink-0 items-center justify-center gap-3 border-b px-4 py-2 text-sm font-semibold ${
        needsAttention
          ? "border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-200"
          : "border-indigo-400/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200"
      }`}
    >
      {isSyncing ? (
        <RefreshCw aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : needsAttention ? (
        <RotateCw aria-hidden="true" className="h-4 w-4" />
      ) : (
        <CloudOff aria-hidden="true" className="h-4 w-4" />
      )}
      <span>
        {isSyncing
          ? `Синхронизирую изменения: ${syncState.pendingCount}`
          : needsAttention
            ? syncState.error
            : `Нет сети. ${pendingLabel}`}
      </span>
      {needsAttention && (
        <button
          type="button"
          className="border-l border-current/30 pl-3 underline decoration-current/40 underline-offset-4"
          onClick={() => void syncOfflineTasks()}
        >
          Повторить
        </button>
      )}
    </div>
  );
};

export default OfflineSyncStatus;
