# Rushr + Memoria example agent

An open-source example of an AI agent that **remembers its own trading decisions**.

- **Rushr** ([docs](https://docs.rushr.trade/agents/mcp/), [memory guide](https://docs.rushr.trade/agents/memory), [journal format](https://github.com/rushr-dev/platform/blob/main/packages/mcp/README.md#journal)) lets an agent scan tokens on Robinhood Chain, check their safety, trade, and post callouts. Every trade or call returns a *journal entry*.
- **Memoria** ([docs](https://www.memoriaagent.site/docs)) is signed long-term memory. The agent saves each journal entry with its own reason and confidence, and later records whether it worked out.

Step-by-step guide: [Give your Rushr agent a memory](https://www.memoriaagent.site/docs/rushr).

## What the agent does (when all phases are done)

1. Before deciding, it searches Memoria (`find_memory`) for the token and similar setups.
2. If it acts, it uses Rushr to trade or post a callout — **dry-run (simulated) first**.
3. It saves Rushr's journal entry to Memoria (`save_memory`) with its own `reason` and `confidence`.
4. Later it reads Rushr's `journal` for closed positions and call results, saves the lessons, and marks the earlier memory with `record_outcome`.

The exact rules are in [AGENT.md](AGENT.md). Progress is logged in [docs/phase1-log.md](docs/phase1-log.md).

## Current status: Phase 2 done (registered, dry-run only)

- Rushr MCP 0.2.0 runs in **dry-run** mode.
- Agent wallet, made on this laptop: `0x51CB4B0E07945aFdf9516443493E6A4f828d9d3C`. It is **registered on Rushr as `memoriaagent`** and **not funded**.
- Registration only signed a login message (no transaction, no gas, no tokens).
- One $1 practice buy was **simulated** in dry-run and saved to Memoria. No real trades, no callouts, no tokens sent.

## Rushr profile (registered 2026-11-25)

- Handle: `memoriaagent`
- Display name: `Memoria Agent`
- Bio: `Open-source example agent. Runs on Memoria: signed memory for Rushr trades and outcomes. Built in public. Not financial advice.`
- Profile: https://app.rushr.trade/u/memoriaagent

## Setup (Claude Desktop on Windows)

Add both servers to Claude Desktop's config (placeholders only — put your real key in the config file yourself, never in this repo):

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

Needs Node.js 20 or later. After changing the config, fully Quit Claude Desktop (tray icon → Quit) and reopen it.

## Security

- **No keys in this repo.** API keys live only in `.env` (gitignored) and in Claude Desktop's config (outside the project). See `.env.example`.
- The Rushr wallet file (`%USERPROFILE%\.rushr\agent-wallet.json`) holds a private key. It is never copied here, opened, or shared.
- **Never fund the wallet or register on Rushr without a clear, deliberate decision.** Registering signs a message and creates a live account.
- Tokens on Robinhood Chain are extremely risky. **This is not financial advice.**

License: MIT (see [LICENSE](LICENSE))
