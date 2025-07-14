// Only import Node.js adapter for non-Cloudflare builds
if (process.env.BUILD_TARGET !== 'cloudflare') {
  require("@shopify/shopify-app-remix/adapters/node");
}
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { DrizzleSessionStorage } from "./db/session-storage";
import { createDatabaseClient } from "./db/client";

// Environment helper function to work with both Node.js and Cloudflare
function getEnvVar(key: string, env?: any): string | undefined {
  return env?.[key] || (global as any).__CF_ENV__?.[key] || process.env[key];
}

// Create session storage based on environment
function createSessionStorage(env?: any) {
  // Always use Drizzle + D1 for all environments
  // - Development: Local D1 database via wrangler
  // - Production: Remote D1 database via Cloudflare Workers
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const dbType = isDevelopment ? 'local D1' : 'remote D1';
  
  console.log(`🗄️ Using Drizzle + ${dbType} database for session storage`);
  
  // Use lazy initialization - don't create database client until first use
  return new DrizzleSessionStorage(() => createDatabaseClient(env));
}

// Create shopify configuration function that accepts optional env parameter
export function createShopifyConfig(env?: any) {
  const appUrl = getEnvVar('SHOPIFY_APP_URL', env) || "";
  console.log('🔧 Shopify config debug:', {
    env,
    global: (global as any).__CF_ENV__,
    appUrl,
    apiKey: getEnvVar('SHOPIFY_API_KEY', env),
    scopes: getEnvVar('SCOPES', env)
  });
  
  return {
    apiKey: getEnvVar('SHOPIFY_API_KEY', env),
    apiSecretKey: getEnvVar('SHOPIFY_API_SECRET', env) || "",
    apiVersion: ApiVersion.January25,
    scopes: getEnvVar('SCOPES', env)?.split(","),
    appUrl,
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

// For Cloudflare Workers, we need to initialize shopify per request
// Global variable to store the shopify instance
let shopifyInstance: ReturnType<typeof createShopifyApp> | null = null;

// Function to get or create shopify instance
function getShopifyInstance(env?: any) {
  if (!shopifyInstance) {
    // First time initialization with environment context
    shopifyInstance = createShopifyApp(env);
  }
  return shopifyInstance;
}

// Helper function to get shopify instance with current environment context
function getShopify(env?: any) {
  // Always try to get the current environment context
  const currentEnv = env || (global as any).__CF_ENV__;
  
  // If we're in Cloudflare Workers and have environment, recreate instance
  if (currentEnv && typeof currentEnv === 'object') {
    return createShopifyApp(currentEnv);
  }
  
  // Fallback to cached instance or create new one
  return getShopifyInstance(currentEnv);
}

// Create a proxy that always gets the current shopify instance
const shopifyProxy = new Proxy({} as any, {
  get(target, prop) {
    const currentShopify = getShopify();
    const value = currentShopify[prop as keyof typeof currentShopify];
    return typeof value === 'function' ? value.bind(currentShopify) : value;
  }
});

export default shopifyProxy;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = (req: Request, headers: Headers) => 
  getShopify().addDocumentResponseHeaders(req, headers);
export const authenticate = new Proxy({} as any, {
  get(target, prop) {
    const shopify = getShopify();
    return shopify.authenticate[prop as keyof typeof shopify.authenticate];
  }
});
export const unauthenticated = new Proxy({} as any, {
  get(target, prop) {
    const shopify = getShopify();
    return shopify.unauthenticated[prop as keyof typeof shopify.unauthenticated];
  }
});
export const login = (req: Request) => getShopify().login(req);
export const registerWebhooks = (options: any) => getShopify().registerWebhooks(options);
export const sessionStorage = new Proxy({} as any, {
  get(target, prop) {
    const shopify = getShopify();
    return shopify.sessionStorage[prop as keyof typeof shopify.sessionStorage];
  }
});

// Export the helper function for routes that need to explicitly pass environment
export { getShopify };
