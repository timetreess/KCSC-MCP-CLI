#!/usr/bin/env node

import { createServer } from "node:http";
import { handleMcpRequest } from "./handler.js";

const port = Number(process.env.PORT ?? 8787);
const fallbackApiKey = process.env.KCSC_API_KEY;

const httpServer = createServer((req, res) => {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  if (path === "/mcp" || path === "/api/mcp") {
    void handleMcpRequest(req, res, { fallbackApiKey });
    return;
  }
  if (path === "/" || path === "/api/health") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ status: "ok", name: "kcsc-standards-mcp", endpoint: "/mcp?key=YOUR_KCSC_API_KEY" }));
    return;
  }
  res.writeHead(404).end();
});

httpServer.listen(port, () => {
  console.error(`KCSC MCP HTTP server listening on http://localhost:${port}/mcp`);
});
