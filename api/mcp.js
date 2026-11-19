// Vercel serverless entry for the remote MCP endpoint. Built output comes from `npm run build`.
import { handleMcpRequest } from "../dist/src/http/handler.js";

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  // Every caller brings their own KCSC key via ?key=; set KCSC_API_KEY on the project only to allow keyless use.
  await handleMcpRequest(req, res, { fallbackApiKey: process.env.KCSC_API_KEY });
}
