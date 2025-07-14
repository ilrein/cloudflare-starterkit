#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

const serverFile = './build/server/index.js';

try {
  let content = readFileSync(serverFile, 'utf8');
  
  // Check if default export already exists
  if (!content.includes('export default {')) {
    // Add default export for Cloudflare Workers
    const exportMatch = content.match(/export \{[\s\S]*?\};?$/m);
    
    if (exportMatch) {
      const defaultExport = `
// Default export for Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    try {
      // Set global environment for the app
      global.__CF_ENV__ = env;
      
      // Call the entry point with the environment
      return await entry.module.default(request, 200, new Headers(), {
        manifest: { entry, routes },
        mode: 'production',
        env
      }, env);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};

`;
      content = content.replace(exportMatch[0], defaultExport + exportMatch[0]);
      writeFileSync(serverFile, content);
      console.log('✅ Added default export to server build');
    } else {
      console.log('❌ Could not find export statement to replace');
    }
  } else {
    console.log('✅ Default export already exists');
  }
} catch (error) {
  console.log('⚠️ Could not fix worker export:', error.message);
}