// Cloudflare-specific Shopify server configuration
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { DrizzleSessionStorage } from "./db/session-storage";
import { createDatabaseClient } from "./db/client";

// Environment helper function to work with Cloudflare Workers
function getEnvVar(key: string, env?: any): string | undefined {
  return env?.[key] || (global as any).__CF_ENV__?.[key] || process.env[key];
}

// Create session storage for Cloudflare Workers
function createSessionStorage(env?: any) {
  console.log(`🗄️ Using Drizzle + D1 database for session storage`);
  const db = createDatabaseClient(env);
  return new DrizzleSessionStorage(db);
}

// Create shopify configuration function for Cloudflare Workers
export function createShopifyConfig(env?: any) {
  return {
    apiKey: getEnvVar('SHOPIFY_API_KEY', env),
    apiSecretKey: getEnvVar('SHOPIFY_API_SECRET', env) || "",
    apiVersion: ApiVersion.January25,
    scopes: getEnvVar('SCOPES', env)?.split(","),
    appUrl: getEnvVar('SHOPIFY_APP_URL', env) || "",
    authPathPrefix: "/auth",
    sessionStorage: createSessionStorage(env),
    distribution: AppDistribution.AppStore,
    future: {
      unstable_newEmbeddedAuthStrategy: true,
      removeRest: true,
    },
    ...(getEnvVar('SHOP_CUSTOM_DOMAIN', env)
      ? { customShopDomains: [getEnvVar('SHOP_CUSTOM_DOMAIN', env)] }
      : {}),
  };
}

// Create a factory function to create shopify instance with environment
export function createShopifyApp(env?: any) {
  return shopifyApp(createShopifyConfig(env));
}

// Export factory function as default
export default createShopifyApp;
export const apiVersion = ApiVersion.January25;