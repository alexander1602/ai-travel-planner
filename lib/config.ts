// lib/config.ts
// Re-export client-safe configuration. For server-only secrets, use @/lib/config.server.

export * from "./config.client";
export { clientConfig as appConfig } from "./config.client";
