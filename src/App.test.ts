import { describe, expect, it } from "vitest";
import appSource from "./App.tsx?raw";

describe("application routes", () => {
  it("keeps Glowy AI behind the existing protected layout", () => {
    expect(appSource).toContain(
      'const GlowyAiPage = lazy(() => import("./pages/GlowyAiPage"))'
    );
    expect(appSource).toMatch(
      /path="\/ai"[\s\S]*?<ProtectedLayoutRoute>[\s\S]*?<GlowyAiPage \/>[\s\S]*?<\/ProtectedLayoutRoute>/
    );
  });

  it("maps every Mini App target to an existing protected Glowy route", () => {
    for (const [path, page] of [
      ["/dashboard", "DashboardPage"],
      ["/tasks", "TaskPage"],
      ["/notes/:noteId?", "NotesPage"],
      ["/ai", "GlowyAiPage"],
      ["/progress", "SuccessStairsPage"],
      ["/analytics", "AnalyticsPage"],
      ["/settings", "SettingsPage"],
    ]) {
      expect(appSource).toContain(`path="${path}"`);
      expect(appSource).toContain(`<${page} />`);
    }
    expect(appSource).toContain('path="/telegram"');
    expect(appSource).toContain("<TelegramMiniAppBootstrap />");
    expect(appSource).toContain(
      'path="/stairs" element={<Navigate to="/progress" replace />}'
    );
  });
});
