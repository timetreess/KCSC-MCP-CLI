#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createKcscMcpServer } from "./create-server.js";

const server = createKcscMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
