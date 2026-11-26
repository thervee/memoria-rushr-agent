import { test } from "node:test";
import assert from "node:assert/strict";
import { entryToMemory, buildSource, savedIdsFrom, saveJournal, DRY_RUN_TAG, SOURCE_MAX } from "../src/journal.js";
import { rushrEnv, toolJson } from "../src/save-journal.js";

const TOKEN = "0xaa1f4de6b9f7cdf11fb8aa97ce163d35d731cdb1";

// Entries shaped like rushr-journal/1 from @rushr/mcp 0.2.0.
function closed(n, extra = {}) {
  return {
    v: 1,
    kind: "position_closed",
    id: `rushr:closed:${TOKEN}:${n}`,
    at: "2026-11-26T08:00:00.000Z",
    agent: { handle: "memoriaagent", wallet: "0x51cb4b0e07945afdf9516443493e6a4f828d9d3c" },
    token: { chainId: 4663, address: TOKEN, symbol: "CORBEL" },
    context: {},
    action: null,
    outcome: { realizedUsd: 0.18, pnlPct: 18, boughtUsd: 1, soldUsd: 1.18, holdMinutes: 180 },
    summary: "Closed $CORBEL: made $0.18 (+18.0%), held 3h.",
    memory: { note: "Closed $CORBEL: made $0.18 (+18.0%), held 3h.", topic: "rushr/lessons", reason: null, confidence: null },
    links: { token: `https://app.rushr.trade/token/${TOKEN}` },
    ...extra,
  };
}

function callResult(n, extra = {}) {
  return {
    v: 1,
    kind: "call_result",
    id: `rushr:call:c_abc${n}:result`,
    at: "2026-11-26T09:00:00.000Z",
    agent: { handle: "memoriaagent", wallet: "0x51cb4b0e07945afdf9516443493e6a4f828d9d3c" },
    token: { chainId: 4663, address: TOKEN, symbol: "CORBEL" },
    context: {},
    action: null,
    outcome: { movePct: 40, peakPct: 55, ageHours: 24, wentRight: true },
    summary: "Bullish call on $CORBEL at $31.6K: +40.0% after 24h (peak +55.0%), went my way.",
    memory: { note: "Bullish call on $CORBEL at $31.6K: +40.0% after 24h (peak +55.0%), went my way.", topic: "rushr/calls", reason: null, confidence: null },
    links: { token: `https://app.rushr.trade/token/${TOKEN}` },
    ...extra,
  };
}

function trade(n) {
  return { ...closed(n), kind: "trade", id: `rushr:trade:0x${n}`, memory: { note: "Bought $1 of $CORBEL", topic: "rushr/trades", reason: null, confidence: null } };
}

/** A fake Memoria that records every call and stores what is saved. */
function fakeMemoria(existing = []) {
  const store = [...existing];
  const calls = [];
  return {
    store,
    calls,
    async listMemories(args) {
      calls.push(["list_memories", args]);
      return store.slice(0, args.limit);
    },
    async findMemory(args) {
      calls.push(["find_memory", args]);
      return store.filter((m) => `${m.source} ${m.note}`.includes(args.query));
    },
    async saveMemory(args) {
      calls.push(["save_memory", args]);
      const memory_id = `mem-${store.length + 1}`;
      store.unshift({ ...args, memory_id });
      return { memory_id };
    },
  };
}

const fakeRushr = (entries) => ({ calls: [], async journal(limit) { this.calls.push(limit); return { format: "rushr-journal/1", entries }; } });
const saves = (memoria) => memoria.calls.filter(([name]) => name === "save_memory").map(([, args]) => args);

test("position_closed uses its own memory block, with reason and confidence filled in", () => {
  const m = entryToMemory(closed(1));
  assert.equal(m.note, "Closed $CORBEL: made $0.18 (+18.0%), held 3h.");
  assert.equal(m.topic, "rushr/lessons");
  assert.equal(m.confidence, "high");
  assert.match(m.reason, /closed Rushr position in \$CORBEL/);
  assert.equal(m.visibility, "private");
  assert.match(m.source, /^rushr-journal-id: rushr:closed:/);
  assert.ok(m.source.includes(`https://app.rushr.trade/token/${TOKEN}`));
});

test("call_result keeps the rushr/calls topic", () => {
  const m = entryToMemory(callResult(1));
  assert.equal(m.topic, "rushr/calls");
  assert.match(m.reason, /earlier Rushr call/);
});

test("a reason and confidence set on the entry are kept", () => {
  const e = closed(1);
  e.memory = { ...e.memory, reason: "Bought because volume was rising.", confidence: "medium" };
  const m = entryToMemory(e);
  assert.equal(m.reason, "Bought because volume was rising.");
  assert.equal(m.confidence, "medium");
});

test("dryRun entries are saved and clearly marked as dry run", () => {
  const m = entryToMemory(closed(1, { dryRun: true }));
  assert.ok(m.note.startsWith(DRY_RUN_TAG));
  assert.match(m.note, /DRY RUN/);
  assert.match(m.source, /dryRun: true \(simulated, no transaction\)/);
  const live = entryToMemory(closed(2));
  assert.ok(!live.note.includes("DRY RUN"));
  assert.ok(!live.source.includes("dryRun"));
});

test("bad entries are refused: wrong version, unknown topic, bad confidence", () => {
  assert.throws(() => entryToMemory({ ...closed(1), v: 2 }), /rushr-journal\/1/);
  assert.throws(() => entryToMemory({ ...closed(1), memory: { note: "x", topic: "other" } }), /unknown topic/);
  assert.throws(() => entryToMemory(closed(1), { confidence: 0.8 }), /low, medium or high/);
});

test("source stays within 500 characters and always keeps the journal id", () => {
  const e = closed(1, { links: { token: `https://app.rushr.trade/token/${"x".repeat(600)}`, tx: "https://robinhoodchain.blockscout.com/tx/0x1" } });
  const s = buildSource(e);
  assert.ok(s.length <= SOURCE_MAX);
  assert.ok(s.startsWith(`rushr-journal-id: ${e.id}`));
  assert.ok(s.includes("tx https://robinhoodchain.blockscout.com/tx/0x1"));
});

test("saved ids are found in sources, including the older 'journal id' wording", () => {
  const ids = savedIdsFrom([
    { source: "rushr-journal-id: rushr:closed:a:1 | token https://x" },
    { source: "journal id rushr:dryrun:0xaa:buy:1795586040517 | token https://y" },
    { source: "no source", note: "nothing here" },
  ]);
  assert.deepEqual([...ids].sort(), ["rushr:closed:a:1", "rushr:dryrun:0xaa:buy:1795586040517"]);
});

test("saves new outcomes, oldest first, and ignores trades and calls", async () => {
  const rushr = fakeRushr([callResult(2), trade(9), closed(1)]); // newest first, like the journal tool
  const memoria = fakeMemoria();
  const r = await saveJournal({ rushr, memoria, limit: 30 });
  assert.deepEqual(rushr.calls, [30]);
  assert.deepEqual(r.saved.map((s) => s.id), [closed(1).id, callResult(2).id]);
  assert.deepEqual(r.ignored, [{ id: "rushr:trade:0x9", kind: "trade" }]);
  assert.equal(saves(memoria).length, 2);
  assert.deepEqual(memoria.calls[0], ["list_memories", { topic: "rushr", limit: 100 }]);
});

test("entries already in Memoria are skipped, and running twice saves nothing new", async () => {
  const memoria = fakeMemoria([{ source: `rushr-journal-id: ${closed(1).id} | token x`, note: "old" }]);
  const entries = [callResult(2), closed(1)];
  const first = await saveJournal({ rushr: fakeRushr(entries), memoria });
  assert.deepEqual(first.skipped, [closed(1).id]);
  assert.deepEqual(first.saved.map((s) => s.id), [callResult(2).id]);
  const second = await saveJournal({ rushr: fakeRushr(entries), memoria });
  assert.equal(second.saved.length, 0);
  assert.deepEqual(second.skipped.sort(), [closed(1).id, callResult(2).id].sort());
  assert.equal(saves(memoria).length, 1);
});

test("the same id twice in one batch is saved once", async () => {
  const memoria = fakeMemoria();
  const r = await saveJournal({ rushr: fakeRushr([closed(1), closed(1)]), memoria });
  assert.equal(r.saved.length, 1);
  assert.deepEqual(r.skipped, [closed(1).id]);
});

test("when the listing is full it also searches by id before saving", async () => {
  const filler = Array.from({ length: 3 }, (_, i) => ({ source: `rushr-journal-id: rushr:closed:other:${i}`, note: "x" }));
  const old = { source: `rushr-journal-id: ${closed(1).id}`, note: "saved long ago" };
  const memoria = fakeMemoria([...filler, old]); // listLimit 3 means `old` isn't in the listing
  const r = await saveJournal({ rushr: fakeRushr([closed(1)]), memoria, listLimit: 3 });
  assert.deepEqual(r.skipped, [closed(1).id]);
  assert.equal(r.saved.length, 0);
  assert.ok(memoria.calls.some(([name, args]) => name === "find_memory" && args.query === closed(1).id));
});

test("a dry-run outcome goes through the whole save, marked as dry run", async () => {
  const memoria = fakeMemoria();
  const r = await saveJournal({ rushr: fakeRushr([closed(1, { dryRun: true })]), memoria });
  assert.equal(r.saved[0].dryRun, true);
  const [args] = saves(memoria);
  assert.ok(args.note.startsWith(DRY_RUN_TAG));
  assert.match(args.source, /dryRun: true/);
});

test("nothing is listed or saved when there are no outcomes", async () => {
  const memoria = fakeMemoria();
  const r = await saveJournal({ rushr: fakeRushr([trade(1)]), memoria });
  assert.equal(memoria.calls.length, 0);
  assert.equal(r.saved.length, 0);
});

test("one failed save is reported and the rest still go through", async () => {
  const memoria = fakeMemoria();
  const real = memoria.saveMemory.bind(memoria);
  memoria.saveMemory = async (args) => {
    if (args.topic === "rushr/calls") throw new Error("Memoria said no");
    return real(args);
  };
  const r = await saveJournal({ rushr: fakeRushr([callResult(2), closed(1)]), memoria });
  assert.deepEqual(r.failed, [{ id: callResult(2).id, error: "Memoria said no" }]);
  assert.equal(r.saved.length, 1);
});

test("Rushr runs in dry-run with caps by default, and keys are not passed to it", () => {
  const env = rushrEnv({ MEMORIA_API_KEY: "secret-value", AGENT_WALLET_KEY: "secret-value" });
  assert.equal(env.RUSHR_DRY_RUN, "1");
  assert.equal(env.RUSHR_MAX_TRADE_USD, "10");
  assert.equal(env.RUSHR_DAILY_USD, "50");
  assert.ok(!Object.values(env).includes("secret-value"));
});

test("tool results are read as JSON, and tool errors become errors", () => {
  assert.deepEqual(toolJson({ content: [{ type: "text", text: '{"entries":[]}' }] }, "journal"), { entries: [] });
  assert.deepEqual(toolJson({ structuredContent: { entries: [1] }, content: [] }, "journal"), { entries: [1] });
  assert.throws(() => toolJson({ isError: true, content: [{ type: "text", text: "nope" }] }, "journal"), /journal failed: nope/);
});
