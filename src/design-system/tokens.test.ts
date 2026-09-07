import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  foundationColorCssProperties,
  foundationColorTokens,
  foundationColorValues,
  foundationRequiredCssProperties,
  foundationThemes,
  foundationTokenPairings,
  type FoundationTheme,
} from "./tokens";

const designTokensCss = readFileSync(
  new URL("../styles/design-tokens.css", import.meta.url),
  "utf8",
);

const getCssBlock = (selector: ":root" | ".dark") => {
  const match = designTokensCss.match(
    new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([\\s\\S]*?)\\}`),
  );

  if (!match) throw new Error(`Token block ${selector} was not found.`);
  return match[1];
};

const getCssProperty = (block: string, property: string) => {
  const match = block.match(new RegExp(`${property}:\\s*([^;]+);`));
  return match?.[1]?.trim();
};

const getRelativeLuminance = (hex: string) => {
  const channels = hex.slice(1).match(/.{2}/g)?.map((value) => Number.parseInt(value, 16));
  if (!channels || channels.length !== 3) throw new Error(`Unsupported colour ${hex}`);

  const [red, green, blue] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
};

const contrastRatio = (foreground: string, background: string) => {
  const [lighter, darker] = [
    getRelativeLuminance(foreground),
    getRelativeLuminance(background),
  ].sort((first, second) => second - first);

  return (lighter + 0.05) / (darker + 0.05);
};

describe("Glowy design tokens", () => {
  it.each(foundationThemes)("keeps the %s colour catalog aligned with CSS", (theme) => {
    const block = getCssBlock(theme === "light" ? ":root" : ".dark");

    for (const token of foundationColorTokens) {
      expect(getCssProperty(block, foundationColorCssProperties[token])).toBe(
        foundationColorValues[theme][token],
      );
    }
  });

  it("publishes every documented foundation custom property", () => {
    const rootBlock = getCssBlock(":root");

    for (const property of foundationRequiredCssProperties) {
      expect(getCssProperty(rootBlock, property)).toBeTruthy();
    }
  });

  it.each(foundationThemes)("keeps %s contrast pairings accessible", (theme: FoundationTheme) => {
    for (const pairing of foundationTokenPairings) {
      const ratio = contrastRatio(
        foundationColorValues[theme][pairing.foreground],
        foundationColorValues[theme][pairing.background],
      );

      expect(ratio, `${pairing.name}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        pairing.minimumContrast,
      );
    }
  });
});
