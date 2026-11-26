#!/usr/bin/env node
// Saves new Rushr journal outcomes (position_closed, call_result) to Memoria.
//
//   npm run save-journal            (reads up to 30 journal entries)
//   npm run save-journal -- --limit 50
//
// Needs MEMORIA_API_KEY (in .env or the environment). Never prints it.
// Rushr only gets the read-only `journal` call, with RUSHR_DRY_RUN=1 unless you set it yourself.
// Nothing is traded, signed or sent.
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { saveJournal } from "./journal.js";

/** Environment for the Rushr server: dry-run and caps on by default, nothing else passed through. */
export function rushrEnv(env = process.env) {
  const out = { ...getDefaultEnvironment() };
  out.RUSHR_DRY_RUN = env.RUSHR_DRY_RUN ?? "1";
  out.RUSHR_MAX_TRADE_USD = env.RUSHR_MAX_TRADE_USD ?? "10";
  out.RUSHR_DAILY_USD = env.RUSHR_DAILY_USD ?? "50";
  for (const k of ["RUSHR_WALLET_FILE", "RUSHR_STATE_DIR"]) if (env[k]) out[k] = env[k];
  return out;
}

/** Reads a tool result as JSON (structured content first, then the text). */
export function toolJson(res, name) {
  const text = (res?.content ?? []).map((c) => c.text ?? "").join("\n");
  if (res?.isError) throw new Error(`${name} failed: ${text.slice(0, 300)}`);
  if (res?.structuredContent) return res.structuredContent;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${name} returned something that isn't JSON`);
  }
}

const asList = (v) => (Array.isArray(v) ? v : Array.isArray(v?.result) ? v.result : Array.isArray(v?.memories) ? v.memories : []);

async function connectRushr() {
  const require = createRequire(import.meta.url);
  const server = join(dirname(require.resolve("@rushr/mcp/package.json")), "dist", "index.js");
  const client = new Client({ name: "memoria-rushr-agent", version: "0.1.0" });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [server], env: rushrEnv(), stderr: "ignore" }));
  return {
    client,
    async journal(limit) {
      return toolJson(await client.callTool({ name: "journal", arguments: { limit } }), "journal");
    },
  };
}

async function connectMemoria() {
  const key = process.env.MEMORIA_API_KEY?.trim();
  if (!key) throw new Error("MEMORIA_API_KEY is not set. Put it in .env (gitignored), never in the code.");
  const base = (process.env.MEMORIA_URL || "https://www.memoriaagent.site").replace(/\/+$/, "").replace(/\/mcp$/, "");
  const client = new Client({ name: "memoria-rushr-agent", version: "0.1.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${key}` } } }));
  const call = async (name, args) => toolJson(await client.callTool({ name, arguments: args }), name);
  return {
    client,
    listMemories: async (args) => asList(await call("list_memories", args)),
    findMemory: async (args) => asList(await call("find_memory", args)),
    saveMemory: (args) => call("save_memory", args),
  };
}

function parseLimit(argv) {
  const i = argv.indexOf("--limit");
  const n = i >= 0 ? Number(argv[i + 1]) : 30;
  if (!Number.isInteger(n) || n < 1 || n > 100) throw new Error("--limit must be a whole number from 1 to 100");
  return n;
}

async function main() {
  try {
    process.loadEnvFile?.(".env");
  } catch {
    // no .env file: use the environment as it is
  }
  const limit = parseLimit(process.argv.slice(2));
  console.log(`${new Date().toISOString()}  reading up to ${limit} Rushr journal entries (dry-run ${rushrEnv().RUSHR_DRY_RUN === "1" ? "on" : "OFF"})`);
  let rushr, memoria;
  try {
    rushr = await connectRushr();
    memoria = await connectMemoria();
    const r = await saveJournal({ rushr, memoria, limit, log: (line) => console.log(`  ${line}`) });
    console.log(`done: ${r.saved.length} saved, ${r.skipped.length} already saved, ${r.ignored.length} not outcomes, ${r.failed.length} failed`);
    if (r.failed.length) process.exitCode = 1;
  } finally {
    await rushr?.client.close().catch(() => {});
    await memoria?.client.close().catch(() => {});
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(`error: ${e?.message ?? e}`);
    process.exit(1);
  });
}
