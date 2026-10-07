import {
  Cloud,
  Leaf,
  MoonStar,
  Orbit,
  Sparkles,
  SunMedium,
  User,
} from "lucide-react";
import { avatarCatalog, defaultAvatarId } from "../../constants/profile";
import type { AvatarId } from "../../types";

const avatarIcons = {
  cloud: Cloud,
  leaf: Leaf,
  moon: MoonStar,
  orbit: Orbit,
  sparkles: Sparkles,
  sun: SunMedium,
};

const getAvatar = (avatarId: AvatarId | null | undefined) =>
  avatarCatalog.find((avatar) => avatar.id === avatarId) ??
  avatarCatalog.find((avatar) => avatar.id === defaultAvatarId);

export const ProfileAvatar = ({
  avatarId,
  size = "md",
}: {
  avatarId?: AvatarId | null;
  size?: "sm" | "md" | "lg";
}) => {
  const avatar = getAvatar(avatarId);
  if (!avatar) return <User size={18} />;

  const Icon = avatarIcons[avatar.icon];
  const sizeClass =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-7 w-7" : "h-10 w-10";
  const iconSize = size === "lg" ? 25 : size === "sm" ? 14 : 19;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${avatar.colors} ${sizeClass}`}
      aria-label={`Аватар: ${avatar.label}`}
    >
      <Icon size={iconSize} strokeWidth={2.2} />
    </span>
  );
};

interface AvatarPickerProps {
  value: AvatarId;
  onChange: (avatarId: AvatarId) => void;
  disabled?: boolean;
}

const AvatarPicker = ({ value, onChange, disabled = false }: AvatarPickerProps) => (
  <fieldset disabled={disabled}>
    <legend className="text-sm font-bold text-slate-800 dark:text-slate-200">
      Аватар
    </legend>
    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
      {avatarCatalog.map((avatar) => {
        const selected = avatar.id === value;

        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onChange(avatar.id)}
            aria-label={avatar.label}
            className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                : "border-slate-200 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-500/50"
            }`}
            aria-pressed={selected}
          >
            <ProfileAvatar avatarId={avatar.id} />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {avatar.label}
            </span>
          </button>
        );
      })}
    </div>
  </fieldset>
);

export default AvatarPicker;
