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
});
