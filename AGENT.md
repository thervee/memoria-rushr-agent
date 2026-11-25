# AGENT.md — rules for the Rushr + Memoria example agent

Any Claude chat working on this project must read and follow this file.
Rushr = trading/callouts on Robinhood Chain (chainId 4663) via the `@rushr/mcp` server (0.2.0+).
Memoria = signed long-term memory via `https://www.memoriaagent.site/mcp`.

Tokens on Robinhood Chain are extremely risky. Nothing here is financial advice.

---

## 1. Hard rules (never break)

1. **Dry-run stays on.** `RUSHR_DRY_RUN=1` at all times. Only the owner can approve turning it off, and only for a named, single step.
2. **No `register` / `recoverKey`** without the owner's explicit yes in chat. `register` signs a Sign-In with Ethereum message (no gas, no transaction, but a real signature that creates a live Rushr account). It is disabled while dry-run is on.
3. **No funding.** Never send ETH, never fund a wallet, never ask the owner to send funds unless a later phase explicitly approves it.
4. **`buy`, `sell`, `post_callout`, `delete_callout`** may only be called when `my_status` shows `dryRun: true` **and** the wallet is registered in an approved phase. (Phase 1: never call them.)
5. **`quote`** only when `my_status` shows the wallet is registered. If it says not registered, skip it and log that.
6. **Never print, repeat, store or commit secrets:** API keys, private keys, wallet file contents, `.env` contents, or `claude_desktop_config.json` contents once a real key is in it. Use placeholders like `YOUR_MEMORIA_API_KEY`.
7. **Keys live only in** `.env` (gitignored) and Claude Desktop's config (outside the project). Never in README, AGENT.md, logs, memories or git.
8. **Never use public Memoria demo keys.** Only the owner's own key, which the owner pastes into the config themselves.
9. **One wallet, made on this laptop.** Rushr's `create_wallet` writes `%USERPROFILE%\.rushr\agent-wallet.json`. Never open, display or copy that file. Only the address may be shown.
10. **Conservative trading (later phases):** never buy a token with `blocked: true`; prefer `migrated`, low `riskLevel`, skip stock-ticker lookalikes; size about $1. Caps: `RUSHR_MAX_TRADE_USD=10`, `RUSHR_DAILY_USD=50`.
11. **No pushing to GitHub** without the owner's explicit yes.
12. **Memoria actions cost money.** Paid (1 action each): `save_memory`, `find_memory`, `list_memories`, `update_memory`, `get_outcomes`. Free: `get_balance`, `record_outcome`, `share_memory`, `delete_memory`. Never loop paid calls. Check `get_balance` first and stop if it is very low.
13. If a docs page does not match a tool, **stop that step, write the gap in `docs/phase1-log.md` (or the current phase log), and do not invent fields.**

---

## 2. The full loop (later phases)

### Step A — Look before deciding
- `find_memory` with `query` = token symbol/address and similar setups, optional `topic` (`rushr/trades`, `rushr/calls`, `rushr/lessons`), `limit` 1–20.
- Treat memories marked **NOT verified** with suspicion.
- Rushr research: `scan` (columns `new`, `almost`, `migrated`), then `token` for safety (`riskLevel`, `flags`, `blocked`). Agents can trade graduated Uniswap tokens and PONS curve tokens (`tradeVia`: `uniswap` or `pons-curve`).

### Step B — Act (dry-run first)
- `buy` / `sell` / `post_callout`. In dry-run they return `status: "dry_run"`, nothing is signed or sent, and the journal entry has `dryRun: true` and a summary starting with "Simulated…".
- The result includes a `journal` field. **Save it right away** — the `journal` tool does NOT list original trades or calls later.

### Step C — Save the journal entry to Memoria
Journal entry fields (v1): `v`, `kind`, `id` (stable), `at`, `agent`, `token` (`chainId` 4663, `address`, `symbol`), `context`, `action`, `outcome`, optional `dryRun`, `summary`, `memory` (`note`, `topic`, `reason`: null, `confidence`: null), `links`.

1. `find_memory` for the journal `id`. If already saved, **do not save again**.
2. `save_memory` with:
   - `note` = `journal.memory.note`
   - `topic` = `journal.memory.topic` (`rushr/trades` trades, `rushr/calls` calls and call results, `rushr/lessons` closed positions)
   - `reason` = our own reason for acting (required)
   - `confidence` = `low` | `medium` | `high` (Memoria does not accept numbers)
   - `source` = journal `id` + `links.token` + `links.tx` if present + `dryRun: true` if set. Under 500 characters. For dry-run say "simulated, no transaction hash".
   - `visibility` = `private`
3. Log the Memoria `memory_id` next to the journal `id` in the phase log (no keys).

### Step D — Outcomes
- Rushr `journal` (optional `limit` 1–100, default 30) lists outcomes only, newest first: `position_closed` and `call_result`.
- For each new outcome:
  1. `find_memory` for the earlier trade/call (journal `id` in `source` or note).
  2. `record_outcome` (free) on that memory: `memory_id`, `result`, optional `note` (max 500).
     - Closed position: profit → `success`, loss → `failure`, roughly flat → `mixed`.
     - Call result: `wentRight: true` → `success`, `false` → `failure`.
  3. `save_memory` the lesson / call-result entry (skip if that journal `id` is already saved).

---

## 3. Registration (later, only with explicit approval)
- Handle: 3–20 chars of `a-z`, `0-9`, `_`. Bio: one line, max 160 chars. `displayName` optional, max 40.
- Check availability: `https://api.rushr.trade/v1/handles/{handle}` (public, no key).
- Planned (not registered): handles in order `memoriaagent`, `memoria`, `memoria_bot`; display name `Memoria Agent`; bio `Example agent. Runs on Memoria: signed memory for Rushr trades and outcomes. Built in public. Not financial advice.`
- Profile URL to use in notes: `https://app.rushr.trade/u/{handle}` (the `https://rushr.trade/{handle}` form has returned 404).
- Plan for that phase: turn dry-run off only to `register`, turn it straight back on, confirm `my_status` shows `dryRun: true`, then one dry-run `buy` and save its journal entry.

---

## 4. Config shapes (placeholders only)

Claude Desktop config (`mcpServers`), merge — never delete other servers:

```json
{
  "mcpServers": {
    "rushr": {
      "command": "npx",
      "args": ["-y", "@rushr/mcp"],
      "env": { "RUSHR_DRY_RUN": "1", "RUSHR_MAX_TRADE_USD": "10", "RUSHR_DAILY_USD": "50" }
    },
    "memoria": {
      "url": "https://www.memoriaagent.site/mcp",
      "headers": { "Authorization": "Bearer YOUR_MEMORIA_API_KEY" }
    }
  }
}
```

Do not set `RUSHR_WALLET_FILE` to a path that does not exist. After any config change, fully Quit Claude Desktop (tray icon → Quit) and reopen.
