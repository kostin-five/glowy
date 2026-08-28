export const avatarIds = [
  "orbit-indigo",
  "orbit-mint",
  "orbit-coral",
  "orbit-sun",
  "orbit-sky",
  "orbit-rose",
] as const;

export const aiTones = ["calm", "moderate", "strict"] as const;

export const avatarCatalog = [
  { id: "orbit-indigo", label: "Индиго", icon: "orbit", colors: "bg-indigo-500 text-white" },
  { id: "orbit-mint", label: "Мята", icon: "leaf", colors: "bg-emerald-400 text-emerald-950" },
  { id: "orbit-coral", label: "Коралл", icon: "sparkles", colors: "bg-rose-400 text-rose-950" },
  { id: "orbit-sun", label: "Солнце", icon: "sun", colors: "bg-amber-300 text-amber-950" },
  { id: "orbit-sky", label: "Небо", icon: "cloud", colors: "bg-sky-400 text-sky-950" },
  { id: "orbit-rose", label: "Роза", icon: "moon", colors: "bg-fuchsia-400 text-fuchsia-950" },
] as const;

export const defaultAvatarId = "orbit-indigo" as const;

export const toneCatalog = [
  {
    id: "calm",
    label: "Спокойный",
    badge: "По умолчанию",
    description: "Бережно поддерживает, предлагает небольшой шаг и всегда начисляет обычный XP.",
  },
  {
    id: "moderate",
    label: "Умеренный",
    badge: null,
    description: "Говорит нейтрально и прямо. Пока есть просрочка, не начисляет XP за другую задачу.",
  },
  {
    id: "strict",
    label: "Жёсткий",
    badge: null,
    description: "Требует дисциплины: выделяет просрочку и вычитает XP за другую задачу, пока долг не закрыт.",
  },
] as const;
