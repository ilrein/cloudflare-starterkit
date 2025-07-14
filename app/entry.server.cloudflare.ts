import type { EntryContext } from "@remix-run/cloudflare";
import { RemixServer } from "@remix-run/react";
import { renderToReadableStream } from "react-dom/server";
import { isbot } from "isbot";

const ABORT_DELAY = 5000;

// Store environment globally so it can be accessed by the app
declare global {
  var __CF_ENV__: any;
}

// Initialize Shopify for Cloudflare Workers
async function initializeShopify(env: any) {
  // Make environment globally available
  global.__CF_ENV__ = env;
  
  // Initialize Shopify app for this environment
  const { createShopifyApp } = await import("./shopify.server.cloudflare");
  return createShopifyApp(env);
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  env: any
) {
  // Initialize Shopify for this request
  await initializeShopify(env);

  const userAgent = request.headers.get("User-Agent") || "";
  const callbackName = isbot(userAgent) ? "onAllReady" : "onShellReady";

  return new Promise((resolve, reject) => {
    let didError = false;

    const stream = renderToReadableStream(
      <RemixServer
        context={remixContext}
        url={request.url}
      />,
      {
        signal: AbortSignal.timeout(ABORT_DELAY),
        onError(error: unknown) {
          didError = true;
          console.error(error);
          responseStatusCode = 500;
        },
      }
    );

    // Wait for the stream to be ready
    if (callbackName === "onAllReady") {
      stream.allReady
        .then(() => {
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );
        })
        .catch(reject);
    } else {
      // For non-bot requests, resolve immediately
      responseHeaders.set("Content-Type", "text/html");
      resolve(
        new Response(stream, {
          headers: responseHeaders,
          status: responseStatusCode,
        })
      );
    }
  });
}