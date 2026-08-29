import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserApi } from "../../api/UserApi";
import { toneCatalog } from "../../constants/profile";
import { useAuthStore } from "../../store/useAuthStore";
import type { AiTone, AvatarId, UserPreferences } from "../../types";
import AvatarPicker from "./AvatarPicker";

interface ProfilePreferencesPanelProps {
  isGuest: boolean;
  onSaved: () => void;
}

const ProfilePreferencesPanel = ({
  isGuest,
  onSaved,
}: ProfilePreferencesPanelProps) => {
  const storedAvatarId = useAuthStore((state) => state.avatarId);
  const storedAiTone = useAuthStore((state) => state.aiTone);
  const setProfilePreferences = useAuthStore(
    (state) => state.setProfilePreferences
  );
  const [preferences, setPreferences] = useState<UserPreferences | null>(() =>
    isGuest
      ? {
          avatarId: storedAvatarId,
          aiTone: storedAiTone,
          focusBetaEnabled: false,
          canUseFocusFeatures: false,
          focusBetaAvailable: false,
        }
      : null
  );
  const [isLoading, setIsLoading] = useState(!isGuest);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isGuest) return;

    let active = true;
    UserApi.getPreferences()
      .then((loaded) => {
        if (!active) return;
        setPreferences(loaded);
        setProfilePreferences(loaded.avatarId, loaded.aiTone);
        setError(null);
      })
      .catch(() => {
        if (active) setError("Не удалось загрузить настройки профиля.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isGuest, setProfilePreferences]);

  const updatePreference = async (
    patch: { avatarId: AvatarId } | { aiTone: AiTone }
  ) => {
    if (!preferences || isGuest || isSaving) return;

    const previous = preferences;
    const optimistic = { ...preferences, ...patch };
    setPreferences(optimistic);
    setProfilePreferences(optimistic.avatarId, optimistic.aiTone);
    setIsSaving(true);
    setError(null);

    try {
      const saved = await UserApi.updatePreferences(patch);
      setPreferences(saved);
      setProfilePreferences(saved.avatarId, saved.aiTone);
      onSaved();
    } catch {
      setPreferences(previous);
      setProfilePreferences(previous.avatarId, previous.aiTone);
      setError("Не удалось сохранить настройку. Попробуй ещё раз.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
        Загружаем настройки профиля...
      </p>
    );
  }

  if (!preferences) {
    return (
      <p className="mt-5 text-sm font-semibold text-rose-600 dark:text-rose-300">
        {error || "Настройки профиля недоступны."}
      </p>
    );
  }

  return (
    <div className="mt-6 min-w-0 space-y-6 border-t border-slate-200 pt-6 dark:border-slate-800">
      <AvatarPicker
        value={preferences.avatarId}
        onChange={(avatarId) => updatePreference({ avatarId })}
        disabled={isGuest || isSaving}
      />

      <fieldset disabled={isGuest || isSaving || !preferences.canUseFocusFeatures}>
        <legend className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Как Glowy помогает мне действовать
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {toneCatalog.map((tone) => {
            const selected = preferences.aiTone === tone.id;

            return (
              <button
                key={tone.id}
                type="button"
                onClick={() => updatePreference({ aiTone: tone.id })}
                className={`min-h-28 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                    : "border-slate-200 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-500/50"
                }`}
                aria-pressed={selected}
              >
                <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {tone.label}
                  {tone.badge && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                      {tone.badge}
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-400">
                  {tone.description}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {!isGuest && !preferences.canUseFocusFeatures && (
        <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Lock className="mt-0.5 shrink-0 text-indigo-400" size={19} />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Режим поведения Glowy</p>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">Спокойный режим остаётся базовым. Умеренный и жёсткий доступны в Focus и Forever.</p>
            </div>
          </div>
          <Link to="/pricing" className="inline-flex w-full shrink-0 justify-center rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-500 sm:w-auto">Тарифы</Link>
        </div>
      )}

      {isGuest && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          В демо-режиме выбор показан для знакомства. После регистрации он
          будет сохраняться между устройствами.
        </p>
      )}
      {error && (
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
};

export default ProfilePreferencesPanel;
