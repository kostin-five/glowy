import type { Preview } from "@storybook/react-vite";
import type { ReactNode } from "react";

import "../src/index.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Тема Glowy",
      defaultValue: "dark",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "dark", title: "Тёмная" },
          { value: "light", title: "Светлая" },
        ],
      },
    },
    viewport: {
      description: "Ширина каталога",
      defaultValue: "desktop",
      toolbar: {
        icon: "mobile",
        items: [
          { value: "desktop", title: "Desktop" },
          { value: "compact", title: "Компактный (390 px)" },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const isDark = context.globals.theme === "dark";
      const isCompact = context.globals.viewport === "compact";

      return (
        <CatalogFrame dark={isDark} compact={isCompact}>
          <Story />
        </CatalogFrame>
      );
    },
  ],
  parameters: {
    a11y: {
      test: "error",
    },
    controls: {
      expanded: true,
    },
  },
};

function CatalogFrame({
  children,
  compact,
  dark,
}: {
  children: ReactNode;
  compact: boolean;
  dark: boolean;
}) {
  return (
    <div className={dark ? "dark min-h-screen bg-glowy-canvas" : "min-h-screen bg-glowy-canvas"}>
      <main
        className="min-h-screen bg-glowy-canvas p-glowy-4 text-glowy-text-primary sm:p-glowy-8"
        style={compact ? { maxWidth: "390px" } : undefined}
      >
        {children}
      </main>
    </div>
  );
}

export default preview;
