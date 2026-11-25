# Phase 1 log — setup, dry-run only

Times are UTC. No keys in this file.

## 2026-11-24

**13:19 UTC — Node check.** Node.js v26.13.0, npx 11.20.0. Meets "Node 20 or later".

**13:19 UTC — Project folder created** at `C:\Users\hp\rushr-memoria-agent` (local git repo, nothing committed, nothing pushed): `.gitignore`, `.env.example`, `README.md`, `AGENT.md`, `docs/phase1-log.md`.

**13:20 UTC — Rushr MCP started** (`npx -y @rushr/mcp`) with `RUSHR_DRY_RUN=1`, `RUSHR_MAX_TRADE_USD=10`, `RUSHR_DAILY_USD=50`. Server reports `rushr 0.2.0`, `dryRun: true`. Tools listed match the docs: scan, token, leaderboard, feed, journal, my_status, create_wallet, register, quote, buy, sell, post_callout, delete_callout. (Tested from the Claude Code session by starting the server directly; Claude Desktop itself still needs a restart to load it.)

**13:20 UTC — Wallet.** No wallet existed. Called `create_wallet` once. It wrote `%USERPROFILE%\.rushr\agent-wallet.json` (file not opened).
- Address: `0x51CB4B0E07945aFdf9516443493E6A4f828d9d3C`

**13:22 UTC — `my_status`** (after restarting the Rushr server so it loads the wallet):
- `dryRun: true` ✔
- `registered: false` (expected), `handle: null`
- Balance 0 ETH (not funded — on purpose)
- Caps: maxTradeUsd 10, dailyUsd 50, left24hUsd 50
- Note: the first two `my_status` tries failed with "HTTP request failed … rpc.mainnet.chain.robinhood.com — fetch failed". This was the coding sandbox blocking the network, not Rushr. Worked once run outside the sandbox.

**13:21 UTC — `journal` (limit 10):** `format: rushr-journal/1`, `entries: []` (empty, as expected — no trades or calls yet).

**13:21 UTC — `scan` column `migrated`, limit 15.** 15 tokens, all `tradeVia: uniswap`. Low-risk ones: MEMORIA, MOTH, ANTC, INTP, MRHGA, CORBEL, AMC. Skipped AMC (stock-ticker lookalike) and MEMORIA (same name as our memory product — avoid looking biased).

**13:21 UTC — `token` on CORBEL** (`0xaa1f4de6b9f7cdf11fb8aa97ce163d35d731cdb1`, Corbel Finance):
- status `migrated`, launchpad `pons`, tradeVia `uniswap`
- safety: `riskLevel: low`, `flags: []`, `blocked: false`, verdict "Low risk: no red flags found in holders, bundles or dev history", not stale
- holders 269, mcap ≈ $14.7k, 24h volume ≈ $19.1k, liquidityUsd null (unknown), buy tax 3%, sell tax 3%

**Quote / buy skipped.** `my_status` says `registered: false`. Dry-run trades need a Rushr API key from `register`, and `register` is turned off while dry-run is on, so the practice buy is the next phase after the owner approves registration.

**13:23 UTC — Memoria.**
- `get_balance`: **not available** in the Memoria tool list this session offered, so it was not called. (Gap — see below.)
- `find_memory` "Rushr practice trades CORBEL <address>", topic `rushr/trades`: empty (combined with the token lookup to stay within the action budget).
- `save_memory` (private, topic `rushr/trades`, confidence `medium`): research note on CORBEL and why we would not buy yet.
  - **memory_id: `mem-564c13d8282687d5af262d513f4fdc51`** — no journal id (research only, not a Rushr trade).
- `find_memory` to confirm: found it, **verified** ("signed by claude-code, including its source").
- Paid Memoria actions used: 3 (find, save, find).

**13:24 UTC — Handle availability** (`https://api.rushr.trade/v1/handles/{handle}`):
- `memoriaagent` — available
- `memoria` — available
- `memoria_bot` — available
- Planned, **not registered**: display name `Memoria Agent`, bio `Open-source example agent. Runs on Memoria: signed memory for Rushr trades and outcomes. Built in public. Not financial advice.` Profile URL to use later: `https://app.rushr.trade/u/{handle}`.

**13:25 UTC — Claude Desktop config.** This laptop's Claude Desktop (Microsoft Store version) keeps its config at
`C:\Users\hp\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\claude_desktop_config.json` (not `%APPDATA%\Claude\…`, which is empty).
It had no MCP servers. Backed up to `claude_desktop_config.json.backup-before-rushr`, then added `rushr` (dry-run settings, no wallet path) and `memoria` (URL + header with the placeholder `YOUR_MEMORIA_API_KEY`). Existing settings kept. The owner still has to paste the real key there and fully Quit/reopen Claude Desktop.

## Not done (on purpose)
No `register`, no `recoverKey`, no funding, no signature, no `quote`, `buy`, `sell`, `post_callout`, `delete_callout`. Dry-run never turned off. Nothing pushed to GitHub.

## Gaps / unclear
1. **The Memoria save went to a local test copy of Memoria, not the hosted service.** The Claude Code session used for this setup is connected to `http://127.0.0.1:8765/mcp` (Memoria running on this laptop for development). The memory `mem-564c…` lives there, not in the hosted account at `www.memoriaagent.site`. To-do after the Claude Desktop restart: repeat one `find_memory` + `save_memory` + `find_memory` through the hosted Memoria in Claude Desktop.
2. `get_balance` was not offered by that Memoria connection, so the balance was not checked.
3. Rushr and Memoria inside Claude Desktop have not been checked yet — needs the key pasted and a full Quit/reopen. If Claude Desktop does not accept the `url` + `headers` form for Memoria, the fallback is `npx -y mcp-remote https://www.memoriaagent.site/mcp` with an Authorization header.

## 2026-11-24 — Code tab connections

**14:48 UTC — Code tab settings changed** (`C:\Users\hp\.claude.json`, backup at `C:\Users\hp\.claude.json.backup-before-hosted-memoria`):
- `memoria` now points at the hosted service `https://www.memoriaagent.site/mcp` with an `Authorization: Bearer YOUR_MEMORIA_API_KEY` placeholder (was the local test copy `http://127.0.0.1:8765/mcp`). The owner pastes the real key into that file themselves — never in chat.
- `rushr` added: `cmd /c npx -y @rushr/mcp` with `RUSHR_DRY_RUN=1`, `RUSHR_MAX_TRADE_USD=10`, `RUSHR_DAILY_USD=50`. No wallet path set (Rushr loads `%USERPROFILE%\.rushr\agent-wallet.json` by default).
- Not yet tested: needs the key pasted and a full Quit/reopen of Claude Desktop.

## 2026-11-25 — Checks through the Code tab (hosted Memoria)

**05:30 UTC — Both tools loaded** in the Code tab: `rushr` and `memoria` (now the hosted service, not the local copy).

**05:30 UTC — Rushr `my_status`:** `dryRun: true` ✔, `registered: false`, `handle: null`, address `0x51CB4B0E07945aFdf9516443493E6A4f828d9d3C`, balance 0 ETH, caps 10 / 50 (50 left today). No register, fund, quote, buy, sell or post.

**05:30 UTC — Memoria (hosted account, not "local"):**
- `get_balance`: billing on, 59 actions left before this test.
- `find_memory` "CORBEL Rushr practice", topic `rushr/trades`: empty.
- `save_memory` (private, topic `rushr/trades`, confidence `medium`, source = token address + `https://app.rushr.trade/token/0xaa1f4de6b9f7cdf11fb8aa97ce163d35d731cdb1`): CORBEL checked in Phase 1 practice, would not buy yet — wallet unfunded and unregistered.
  - **memory_id: `mem-9368ef7fb72477c0b40972d93ea69567`** (research only, no journal id)
- `find_memory` to confirm: found it, **verified** (signed by the hosted account's claude-code agent, including its source).
- Paid actions used: 3 (find, save, find) → about 56 left.

This closes gap 1 and gap 2 above: the memory is now in the hosted account, and the balance was checked.

## Phase 2 — registration and first dry-run practice buy (2026-11-25)

Times are UTC. No keys, names or locations.

**05:46 UTC — `my_status` check.** `dryRun: true`, wallet `0x51CB4B0E07945aFdf9516443493E6A4f828d9d3C` (matches), `registered: false`, 0 ETH.

**05:47 UTC — Login message previewed before signing.** Fetched a sample from `https://api.rushr.trade/v1/auth/nonce?address=…&purpose=register` (public, nothing signed). It is a Sign-In with Ethereum message: "Register this wallet on Rushr as an independent AI agent. I keep my own keys and sign my own transactions." URI `https://rushr.trade`, Chain ID 4663, 10-minute expiry, resource `https://rushr.trade/terms#agents`. Checked the `@rushr/mcp` 0.2.0 code: `register` only signs this message and posts it with the handle, display name and bio. No transaction, no gas, no token transfer. Approved in chat before signing.

**05:48 UTC — Registered.** Dry-run was turned off only inside a separate, one-off Rushr process that made the single `register` call and then exited; the normal Rushr connection stayed in dry-run throughout.
- Result: `status: registered`, handle `memoriaagent`, display name `Memoria Agent`, kind `agent`, not owned (independent).
- The new Rushr API key was stored by Rushr inside `%USERPROFILE%\.rushr\agent-wallet.json` (not opened, not shown).
- Public profile: `https://app.rushr.trade/u/memoriaagent` (works). The `https://rushr.trade/memoriaagent` link the tool prints returns 404, as expected.

**05:49 UTC — Dry-run proven back on.** A fresh Rushr process with `RUSHR_DRY_RUN=1`: `dryRun: true`, `registered: true`, handle `memoriaagent`, 0 ETH, Season 0 rank 45 (agent rank 18), score 0.
- Note: the Rushr connection that was already running in the app still showed `registered: false` until the app restarts (it read the wallet file before registration).

**05:54 UTC — Practice buy, dry-run only (token CORBEL `0xaa1f4de6b9f7cdf11fb8aa97ce163d35d731cdb1`).**
- Gap: the request asked for a token with locked liquidity. Rushr's tools, docs and public token data do not report liquidity locks, so this could not be checked for any token. Went ahead with CORBEL after approval in chat, with the lock marked "not verifiable".
- `token`: migrated, `tradeVia: uniswap`, riskLevel low, no flags, not blocked; ~306 holders, top 10 ~24%, dev 0% with no past rugs, ~444 trades/24h, 3% buy and 3% sell tax, liquidity not reported.
- `quote` ($1): ~0.000604 ETH in (ETH at $1,656), ~30,159 CORBEL out (min ~29,707), fee 25 bps, total impact ~401 bps (mostly the fixed tax), venue `uniswap-v4`. Live, it would be refused: wallet has 0 ETH.
- `buy` ($1): `status: dry_run`, simulation ok (swap gas ~174,062). "RUSHR_DRY_RUN=1: built and simulated, nothing signed or sent."
- Rushr warnings: live buy would be refused (0 ETH spendable after gas reserve); hooked Uniswap v4 pool, the hook may change fees or behaviour at swap time.
- Journal entry: id `rushr:dryrun:0xaa1f4de6b9f7cdf11fb8aa97ce163d35d731cdb1:buy:1795586040517`, kind `trade`, `dryRun: true`, `action.tx: null`, summary "Simulated a buy of $1 of $CORBEL at $31.6K market cap, risk low, on uniswap-v4.", topic `rushr/trades`.

**05:55 UTC — Saved to Memoria (hosted).**
- `find_memory` for the journal id first: not saved yet (only the Phase 1 CORBEL note came back).
- `save_memory`: private, topic `rushr/trades`, confidence `medium`. Note = Rushr's journal note plus the simulation result, registration, the hook warning; reason = why CORBEL, plus "liquidity lock could not be verified"; source = journal id + token link + `dryRun: true` + "simulated, no transaction hash" + profile link.

| Journal id | Memoria memory_id | Verified |
|---|---|---|
| `rushr:dryrun:0xaa1f4de6b9f7cdf11fb8aa97ce163d35d731cdb1:buy:1795586040517` | `mem-101965bf8ddfde9d16fd255e1df79078` | yes |

- `find_memory` to confirm: found it, **verified**. Paid Memoria actions this phase: 3.

**Not done (on purpose):** no funding, no real buy or sell, no callouts, no tokens sent. Dry-run is on. Nothing pushed.
