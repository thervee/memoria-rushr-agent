// Turns Rushr journal entries into Memoria memories, and saves each entry only once.
// Format: rushr-journal/1 (@rushr/mcp README, "Journal"). Guide: https://docs.rushr.trade/agents/memory
// This file has no network code: the Rushr and Memoria clients are passed in.

/** Journal kinds this saver handles: the outcomes the `journal` tool lists. */
export const OUTCOME_KINDS = ["position_closed", "call_result"];
export const TOPICS = ["rushr/trades", "rushr/calls", "rushr/lessons"];
export const CONFIDENCES = ["low", "medium", "high"];
export const SOURCE_MAX = 500;
export const DRY_RUN_TAG = "[DRY RUN: simulated, nothing signed or sent]";

const ID_MARKER = "rushr-journal-id:";
// Also recognise the older wording used for memories saved by hand in Phase 2.
const ID_PATTERNS = [/rushr-journal-id:\s*(rushr:\S+)/g, /journal id\s+(rushr:\S+)/g];

/** Why the agent keeps this outcome. Rushr leaves `reason` null for the agent to fill in. */
export function defaultReason(entry) {
  const symbol = entry.token?.symbol ? `$${entry.token.symbol}` : "this token";
  if (entry.kind === "position_closed") {
    return `Measured result of a closed Rushr position in ${symbol}, from the Rushr journal. Kept as a lesson: check it before trading ${symbol} or similar setups again.`;
  }
  if (entry.kind === "call_result") {
    return `Measured result of an earlier Rushr call on ${symbol}, from the Rushr journal. Kept so future calls can learn from how this one moved.`;
  }
  return "Saved from the Rushr journal.";
}

/**
 * How sure the agent is. Rushr leaves `confidence` null. Outcomes are measured by Rushr
 * (realized PnL, how a call moved), so they default to "high".
 */
export function defaultConfidence() {
  return "high";
}

/** Builds the `source` field: the journal id first (so duplicates can be found), then links. */
export function buildSource(entry) {
  const first = `${ID_MARKER} ${entry.id}`;
  const rest = [
    entry.links?.token ? `token ${entry.links.token}` : null,
    entry.links?.tx ? `tx ${entry.links.tx}` : null,
    entry.dryRun ? "dryRun: true (simulated, no transaction)" : null,
  ].filter(Boolean);
  let source = first;
  for (const part of rest) {
    const next = `${source} | ${part}`;
    if (next.length > SOURCE_MAX) continue; // drop only what doesn't fit, never the id
    source = next;
  }
  return source.slice(0, SOURCE_MAX);
}

/**
 * Maps one journal entry to save_memory arguments, using the entry's own memory block.
 * Throws if the entry doesn't look like rushr-journal/1.
 */
export function entryToMemory(entry, overrides = {}) {
  if (!entry || entry.v !== 1) throw new Error("not a rushr-journal/1 entry (v must be 1)");
  if (typeof entry.id !== "string" || !entry.id.startsWith("rushr:")) throw new Error("journal entry has no valid id");
  const m = entry.memory;
  if (!m || typeof m.note !== "string" || !m.note.trim()) throw new Error(`journal entry ${entry.id} has no memory.note`);
  if (!TOPICS.includes(m.topic)) throw new Error(`journal entry ${entry.id} has an unknown topic: ${m.topic}`);

  const reason = m.reason ?? overrides.reason ?? defaultReason(entry);
  const confidence = m.confidence ?? overrides.confidence ?? defaultConfidence(entry);
  if (!CONFIDENCES.includes(confidence)) throw new Error(`confidence must be low, medium or high (got ${confidence})`);

  return {
    note: entry.dryRun ? `${DRY_RUN_TAG} ${m.note}` : m.note,
    reason,
    topic: m.topic,
    confidence,
    visibility: "private",
    source: buildSource(entry),
  };
}

/** Journal ids already saved, read from the source (or note) of existing memories. */
export function savedIdsFrom(memories) {
  const ids = new Set();
  for (const mem of memories ?? []) {
    const text = `${mem?.source ?? ""}\n${mem?.note ?? ""}`;
    for (const re of ID_PATTERNS) for (const match of text.matchAll(re)) ids.add(match[1].replace(/[.,;|)]+$/, ""));
  }
  return ids;
}

/**
 * Reads the Rushr journal and saves new position_closed and call_result entries to Memoria.
 *
 * rushr.journal(limit)            -> { entries: [...] }
 * memoria.listMemories(args)      -> [memory, ...]
 * memoria.findMemory(args)        -> [memory, ...]
 * memoria.saveMemory(args)        -> { memory_id }
 *
 * Paid Memoria actions: 1 listing, plus 1 per new entry saved (plus 1 search per entry
 * only when the listing is full).
 */
export async function saveJournal({ rushr, memoria, limit = 30, listLimit = 100, log = () => {} }) {
  const result = { saved: [], skipped: [], ignored: [], failed: [] };
  const { entries = [] } = (await rushr.journal(limit)) ?? {};

  const candidates = [];
  for (const entry of entries) {
    if (OUTCOME_KINDS.includes(entry?.kind)) candidates.push(entry);
    else result.ignored.push({ id: entry?.id ?? null, kind: entry?.kind ?? null });
  }
  if (candidates.length === 0) return result;

  const listed = await memoria.listMemories({ topic: "rushr", limit: listLimit });
  const saved = savedIdsFrom(listed);
  const listingFull = (listed?.length ?? 0) >= listLimit;

  // The journal is newest first; save oldest first so memories line up in time order.
  for (const entry of [...candidates].reverse()) {
    if (!saved.has(entry.id) && listingFull) {
      const found = await memoria.findMemory({ query: entry.id, topic: entry.memory?.topic, limit: 5 });
      for (const id of savedIdsFrom(found)) saved.add(id);
    }
    if (saved.has(entry.id)) {
      result.skipped.push(entry.id);
      log(`skip  ${entry.id} (already in Memoria)`);
      continue;
    }
    try {
      const args = entryToMemory(entry);
      const res = await memoria.saveMemory(args);
      saved.add(entry.id);
      result.saved.push({ id: entry.id, memoryId: res?.memory_id ?? null, dryRun: Boolean(entry.dryRun) });
      log(`saved ${entry.id} -> ${res?.memory_id ?? "?"}${entry.dryRun ? " (dry run)" : ""}`);
    } catch (e) {
      result.failed.push({ id: entry.id, error: String(e?.message ?? e) });
      log(`fail  ${entry.id}: ${e?.message ?? e}`);
    }
  }
  return result;
}
