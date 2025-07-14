import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { DrizzleSessionStorage } from "./db/session-storage";
import { createDatabaseClient } from "./db/client";
import prisma from "./db.server";

// Environment helper function to work with both Node.js and Cloudflare
function getEnvVar(key: string, env?: any): string | undefined {
  return env?.[key] || process.env[key];
}

// Create session storage based on environment
function createSessionStorage(env?: any) {
  // In Cloudflare Workers environment, always use Drizzle + D1
  if (env?.DB) {
    const db = createDatabaseClient(env);
    return new DrizzleSessionStorage(db);
  }

  // Development environment: Use Prisma until better-sqlite3 bindings are fixed
  // This maintains development workflow stability while keeping production on Drizzle+D1
  if (process.env.NODE_ENV !== 'production') {
    try {
      // Try Drizzle first (if better-sqlite3 works)
      const db = createDatabaseClient(env);
      return new DrizzleSessionStorage(db);
    } catch (error) {
      // Fall back to Prisma for development if better-sqlite3 fails
      console.log('📝 Using Prisma for development (better-sqlite3 bindings issue)');
      return new PrismaSessionStorage(prisma);
    }
  }

  // Production fallback: Use Drizzle
  const db = createDatabaseClient(env);
  return new DrizzleSessionStorage(db);
}

// Create shopify configuration function that accepts optional env parameter
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

const shopify = shopifyApp(createShopifyConfig());

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
