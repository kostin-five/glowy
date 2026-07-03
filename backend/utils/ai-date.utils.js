export const formatDateDDMMYYYY = (date) =>
  new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

export const normalizeDate = (value, fallbackDate) => {
  const rawDate = typeof value === "string" ? value.trim() : "";
  const dottedDateMatch = rawDate.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/
  );

  if (dottedDateMatch) {
    const [, day, month, year] = dottedDateMatch;
    return `${day.padStart(2, "0")}.${month.padStart(2, "0")}.${year}`;
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(rawDate)) {
    return rawDate;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [year, month, day] = rawDate.split("-");
    return `${day}.${month}.${year}`;
  }

  return fallbackDate;
};

export const extractExactDateFromText = (value) => {
  const text = typeof value === "string" ? value : "";
  const match = text.match(
    /(?:^|\D)(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\D|$)/
  );

  if (!match) return null;

  const [, day, month, year] = match;
  return `${day.padStart(2, "0")}.${month.padStart(2, "0")}.${year}`;
};

export const stripExactDateFromTitle = (title) =>
  title
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
