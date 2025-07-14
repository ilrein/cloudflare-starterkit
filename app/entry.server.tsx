import { RemixServer } from "@remix-run/react";
import { type EntryContext } from "@remix-run/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";

export const streamTimeout = 5000;

// Check if we're in a Cloudflare Workers environment
const isCloudflareWorkers = typeof globalThis.caches !== 'undefined' && 
  typeof globalThis.navigator !== 'undefined' && 
  globalThis.navigator.userAgent === 'Cloudflare-Workers';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");

  if (isCloudflareWorkers || process.env.BUILD_TARGET === 'cloudflare') {
    // Cloudflare Workers implementation
    const { renderToReadableStream } = await import("react-dom/server");
    
    const body = await renderToReadableStream(
      <RemixServer
        context={remixContext}
        url={request.url}
      />,
      {
        signal: AbortSignal.timeout(streamTimeout),
        onError(error) {
          console.error(error);
          responseStatusCode = 500;
        },
      }
    );

    // Wait for the stream to be ready for bots
    if (isbot(userAgent ?? '')) {
      await body.allReady;
    }

    responseHeaders.set("Content-Type", "text/html");
    
    return new Response(body, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  } else {
    // Node.js implementation
    const { PassThrough } = await import("stream");
    const { renderToPipeableStream } = await import("react-dom/server");
    const { createReadableStreamFromReadable } = await import("@remix-run/node");
    
    const callbackName = isbot(userAgent ?? '')
      ? "onAllReady"
      : "onShellReady";

    return new Promise((resolve, reject) => {
      const { pipe, abort } = renderToPipeableStream(
        <RemixServer
          context={remixContext}
          url={request.url}
        />,
        {
          [callbackName]: () => {
            const body = new PassThrough();
            const stream = createReadableStreamFromReadable(body);

            responseHeaders.set("Content-Type", "text/html");
            resolve(
              new Response(stream, {
                headers: responseHeaders,
                status: responseStatusCode,
              })
            );
            pipe(body);
          },
          onShellError(error) {
            reject(error);
          },
          onError(error) {
            responseStatusCode = 500;
            console.error(error);
          },
        }
      );

      // Automatically timeout the React renderer after 6 seconds, which ensures
      // React has enough time to flush down the rejected boundary contents
      setTimeout(abort, streamTimeout + 1000);
    });
  }
}
