/// <reference types="vite/client" />

// Augment ImportMeta in case IDE caching lags behind Vite types
interface ImportMetaEnv {
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  // Add other env vars here as needed: VITE_*
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

