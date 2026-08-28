import type { AnalyticsPeriodKind } from "../api/AnalyticsApi";

export interface StoredAnalyticsReportV1 {
  version: 1;
  ownerId: number;
  period: AnalyticsPeriodKind;
  from: string;
  to: string;
  text: string;
  createdAt: string;
}

interface ReportIdentity {
  ownerId: number;
  period: AnalyticsPeriodKind;
  from: string;
  to: string;
}

const REPORT_PREFIX = "glowy-analytics-report-v1";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const reportKey = ({ ownerId, period, from, to }: ReportIdentity) =>
  `${REPORT_PREFIX}:${ownerId}:${period}:${from}:${to}`;

const isStoredReport = (
  value: unknown,
  identity: ReportIdentity
): value is StoredAnalyticsReportV1 => {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<StoredAnalyticsReportV1>;
  return report.version === 1 &&
    report.ownerId === identity.ownerId &&
    report.period === identity.period &&
    report.from === identity.from &&
    report.to === identity.to &&
    DATE_ONLY.test(report.from ?? "") &&
    DATE_ONLY.test(report.to ?? "") &&
    typeof report.text === "string" &&
    Boolean(report.text.trim()) &&
    typeof report.createdAt === "string" &&
    !Number.isNaN(Date.parse(report.createdAt));
};

export const readAnalyticsReport = (
  identity: ReportIdentity,
  storage: Pick<Storage, "getItem"> = localStorage
) => {
  try {
    const raw = storage.getItem(reportKey(identity));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStoredReport(parsed, identity) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveAnalyticsReport = (
  identity: ReportIdentity,
  text: string,
  storage: Pick<Storage, "setItem"> = localStorage,
  now = new Date()
) => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const report: StoredAnalyticsReportV1 = {
    version: 1,
    ...identity,
    text: trimmed,
    createdAt: now.toISOString(),
  };
  storage.setItem(reportKey(identity), JSON.stringify(report));
  return report;
};

export const deleteAnalyticsReport = (
  identity: ReportIdentity,
  storage: Pick<Storage, "removeItem"> = localStorage
) => storage.removeItem(reportKey(identity));

