import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readApiPort(): number {
  const file = resolve(__dirname, "../.api-port");
  try {
    const raw = readFileSync(file, "utf8").trim();
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* file missing or invalid */
  }
  return 4000;
}

function apiProxyPlugin(): Plugin {
  return {
    name: "api-proxy-to-dev-server",
    configureServer(server) {
      server.middlewares.use("/api", (clientReq, clientRes) => {
        const port = readApiPort();
        const pathWithoutPrefix = clientReq.url ?? "/";
        const targetPath = `/api${pathWithoutPrefix.startsWith("/") ? pathWithoutPrefix : `/${pathWithoutPrefix}`}`;

        const proxyReq = http.request(
          {
            hostname: "127.0.0.1",
            port,
            path: targetPath,
            method: clientReq.method,
            headers: { ...clientReq.headers, host: `127.0.0.1:${port}` },
          },
          (proxyRes) => {
            clientRes.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
            proxyRes.pipe(clientRes);
          }
        );

        proxyReq.on("error", (err) => {
          clientRes.statusCode = 502;
          clientRes.setHeader("content-type", "text/plain; charset=utf-8");
          clientRes.end(
            `Cannot reach API on port ${port} (${err.message}). Is the server running?`
          );
        });

        clientReq.pipe(proxyReq);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiProxyPlugin()],
  server: {
    port: 5173,
  },
});
