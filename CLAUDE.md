# Shopify Remix App → Cloudflare Workers Deployment Strategy

## Project Overview
Enhance a Shopify Remix app to support deployment on Cloudflare Workers with D1 database while maintaining Shopify CLI for development.

## Current Tech Stack
- **Framework**: Remix v2.16.1
- **Runtime**: Node.js (^18.20 || ^20.10 || >=21.0.0)
- **Database**: SQLite with Prisma
- **Session Storage**: @shopify/shopify-app-session-storage-prisma
- **Shopify**: @shopify/shopify-app-remix v3.7.0
- **Build Tool**: Vite v6.2.2
- **Dev Server**: Shopify CLI (to be maintained)

## Target Architecture
- **Development**: Shopify CLI + Node.js runtime (unchanged)
- **Production**: Cloudflare Workers/Pages + D1 database
- **Build Strategy**: Dual-target configuration
- **Session Storage**: Adapter pattern (Prisma for dev, KV/D1 for prod)

## Migration Plan with Validation Gates

### Phase 1: Dependency Setup & Validation
**Goal**: Add Cloudflare dependencies without breaking Shopify CLI

**Steps**:
1. Install Cloudflare packages:
   ```bash
   npm install @remix-run/cloudflare @cloudflare/workers-types wrangler --save-dev
   npm install @cloudflare/pages-plugin-prisma --save-dev  # if using Prisma
   ```

2. Update `tsconfig.json` to include Cloudflare types:
   ```json
   {
     "compilerOptions": {
       "types": ["@cloudflare/workers-types", "@shopify/app-bridge-types"]
     }
   }
   ```

**Validation Gate**: 
- ✅ Run `npm run dev` - Shopify CLI should work unchanged
- ✅ Run `npm run build` - Current build should succeed
- ❌ If fails → Check for type conflicts, resolve before proceeding

### Phase 2: Vite Configuration for Dual Targets
**Goal**: Configure build system for both Node.js and Cloudflare

**Approach A: Environment-based Configuration**
```typescript
// vite.config.ts modification
const isCloudflare = process.env.BUILD_TARGET === 'cloudflare';

export default defineConfig({
  plugins: [
    remix({
      // Conditional configuration
      ...(isCloudflare ? {
        serverAdapter: '@remix-run/cloudflare',
        serverBuildFile: 'index.js',
        serverModuleFormat: 'esm',
        serverPlatform: 'neutral'
      } : {})
    })
  ]
});
```

**Approach B: Separate Config Files**
- `vite.config.ts` - for Shopify CLI development
- `vite.config.cloudflare.ts` - for Cloudflare production

**Validation Gate**:
- ✅ `npm run dev` works with Shopify CLI
- ✅ `BUILD_TARGET=cloudflare npm run build` creates Cloudflare-compatible bundle
- ❌ If fails → Try Approach B with separate configs

### Phase 3: Database Strategy Selection
**Goal**: Choose and implement database approach

**Option 1: Prisma + D1** (Preview Feature)
- **Pros**: Minimal code changes, familiar API
- **Cons**: Bundle size issues, preview status
- **Implementation**: Use service bindings pattern

**Option 2: Drizzle + D1** (Recommended)
- **Pros**: Native D1 support, smaller bundle
- **Cons**: Requires ORM migration
- **Implementation**: Direct integration

**Option 3: External Database** (PostgreSQL/MySQL)
- **Pros**: Full Prisma support, proven stability
- **Cons**: Additional service dependency
- **Implementation**: Use database proxy

**Validation Gate**:
- ✅ Test chosen solution with simple CRUD operations
- ✅ Verify bundle size < 1MB (or use service bindings)
- ❌ If Prisma + D1 fails → Fall back to Option 2 or 3

### Phase 4: Session Storage Adapter
**Goal**: Implement environment-aware session storage

```typescript
// app/session.server.ts
export function createSessionStorage() {
  if (process.env.NODE_ENV === 'production' && process.env.CF_PAGES) {
    // Cloudflare KV or D1 storage
    return createCloudflareSessionStorage();
  }
  // Default Prisma storage for development
  return createPrismaSessionStorage();
}
```

**Validation Gate**:
- ✅ Sessions work in development (Shopify CLI)
- ✅ Sessions persist in Cloudflare environment
- ❌ If fails → Check binding configuration

### Phase 5: Environment Variable Handling
**Goal**: Handle platform-specific environment variables

**Development**: Use `.env` file
**Production**: Use `wrangler.toml` bindings

```typescript
// app/shopify.server.ts
export const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY || context.env.SHOPIFY_API_KEY,
  // ... other config
});
```

**Validation Gate**:
- ✅ Environment variables accessible in both environments
- ❌ If fails → Use load-context pattern

### Phase 6: Build & Deployment Scripts
**Goal**: Create deployment pipeline maintaining Shopify CLI

```json
{
  "scripts": {
    "dev": "shopify app dev",
    "build": "remix vite:build",
    "build:cloudflare": "BUILD_TARGET=cloudflare remix vite:build && npm run postbuild:cloudflare",
    "postbuild:cloudflare": "wrangler pages functions build --outdir build/worker",
    "deploy:cloudflare": "wrangler pages deploy ./build/client",
    "preview:cloudflare": "wrangler pages dev ./build/client"
  }
}
```

**Validation Gate**:
- ✅ Development workflow unchanged
- ✅ Cloudflare deployment successful
- ✅ App functions correctly on Cloudflare

## Assumptions & Risk Mitigation

### Critical Assumptions:
1. **Shopify OAuth works on Cloudflare Workers**
   - Risk: OAuth callbacks might fail
   - Mitigation: Test auth flow early, prepare proxy solution

2. **Bundle size stays under limits**
   - Risk: Prisma client too large
   - Mitigation: Service bindings or alternative ORM

3. **Webhooks function correctly**
   - Risk: Different request handling
   - Mitigation: Test webhook endpoints thoroughly

4. **Session compatibility**
   - Risk: Session format differences
   - Mitigation: Adapter pattern with migration tools

### Fallback Strategies:
1. **If D1 doesn't work**: Use external database with connection pooling
2. **If bundle too large**: Split into multiple Workers with service bindings
3. **If OAuth fails**: Implement auth proxy on Node.js
4. **If performance issues**: Use Cloudflare Pages instead of Workers

## Success Criteria
- [ ] Shopify CLI `dev` command works unchanged
- [ ] App deploys to Cloudflare Workers/Pages
- [ ] All Shopify features functional (OAuth, GraphQL, Webhooks)
- [ ] Database operations work in both environments
- [ ] No regression in development experience

## Next Steps Priority
1. **Low Risk**: Start with Phase 1-2 (dependencies & build config)
2. **Test Critical Path**: Validate OAuth flow on Cloudflare
3. **Database Decision**: Based on bundle size testing
4. **Incremental Migration**: One feature at a time