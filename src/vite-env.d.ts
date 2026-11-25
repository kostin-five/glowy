/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_PAYMENTS_ENABLED?: string;
  readonly VITE_REGISTRATION_ENABLED?: string;
  readonly VITE_ANALYTICS_AI_REPORT_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
