# Analytics Claude Code Setup

This file documents the agent/skill/MCP/permissions setup for the
`analytics/` workspaces (Dagster + dbt + DuckDB/MotherDuck). Apply the
sections marked **TODO** manually.

## What's already in place (committed)

### Agents (`.claude/agents/`)
- **`data-engineer.md`** — Dagster, ingest, jobs, schedules, resources,
  Clever Cloud, BAN flows. Owns `analytics/dagster/`.
- **`analytics-engineer.md`** — dbt models, macros, sources, tests,
  MotherDuck exploration. Owns `analytics/dbt/`.

Invoke them via the Agent tool, e.g.
`Agent(subagent_type="data-engineer", prompt="Add a CEREMA 2026 source…")`.

### Skills (`.claude/skills/`)
- **`/dbt-model`** — TDD-first workflow for adding/modifying dbt models.
- **`/sql-explore`** — Explore the `dwh` warehouse via MotherDuck MCP.
- **`/dagster-asset`** — Create/modify a Dagster asset, job, schedule.
- **`/external-source-onboarding`** — End-to-end new external source flow.

### MCP servers
- **MotherDuck** — already wired (see existing
  `mcp__MotherDuck__list_columns`, `mcp__MotherDuck__query`, etc. allowed
  in `settings.local.json`). Uses your MotherDuck account; no token in
  the repo.
- **nx-mcp** — already enabled.
- **Notion** — see TODO below.

## TODO: extra Bash permissions to add to `.claude/settings.local.json`

Append these inside `permissions.allow`. Self-modification is locked, so
add them manually:

```jsonc
"Bash(dbt parse:*)",
"Bash(dbt run:*)",
"Bash(dbt test:*)",
"Bash(dbt build:*)",
"Bash(dbt docs:*)",
"Bash(dbt seed:*)",
"Bash(dbt deps:*)",
"Bash(dbt source:*)",
"Bash(dbt list:*)",
"Bash(dbt clean:*)",
"Bash(dagster definitions validate:*)",
"Bash(dagster asset materialize:*)",
"Bash(dagster job execute:*)",
"Bash(dagster dev:*)",
"Bash(uv sync:*)",
"Bash(uv pip:*)",
"Bash(curl -I:*)",
"Bash(curl -sI:*)",
"Bash(ls:*)",
"Bash(cat:*)",
"Bash(head:*)",
"Bash(tail:*)",
"Bash(wc:*)",
"Bash(file:*)",
"Bash(yarn nx test:*)",
"Bash(yarn nx build:*)",
"Bash(yarn nx typecheck:*)"
```

These are read-mostly: `dbt run/build/test` mutate MotherDuck via the
configured profile, which is the intended workflow. They do **not** allow
direct `duckdb` shell mutations or `query_rw` on MotherDuck.

## TODO: Optional hooks to add to `.claude/settings.local.json`

Hooks let the harness enforce things automatically. Two suggestions for
analytics:

```jsonc
"hooks": {
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "if echo \"$TOOL_INPUT\" | grep -qiE '\\b(drop|truncate|delete from)\\b'; then echo 'Destructive SQL detected — confirm intent.'; exit 2; fi"
        }
      ]
    }
  ],
  "PostToolUse": [
    {
      "matcher": "Edit|Write",
      "hooks": [
        {
          "type": "command",
          "command": "case \"$TOOL_FILE_PATH\" in *analytics/dbt/models/*.sql) (cd analytics/dbt && dbt parse --no-partial-parse 2>&1 | tail -20) ;; esac"
        }
      ]
    }
  ]
}
```

The PostToolUse `dbt parse` runs after any model edit so syntax errors
surface immediately. Costs ~2-5s per edit; remove if too noisy.

## TODO: Notion MCP server

When you have a Notion integration token:

```bash
# Add the Notion MCP server (project scope = recommended for repo-specific
# DBs; user scope if you want it everywhere).
claude mcp add notion --scope project \
  --env NOTION_TOKEN=ntn_… \
  -- npx -y @modelcontextprotocol/server-notion
```

This will create `.mcp.json` (or extend the existing one) at the repo
root. Then add to `.claude/settings.local.json`:

```jsonc
"enabledMcpjsonServers": ["nx-mcp", "notion"]
```

Useful for: pulling product/PO context from Notion docs into dbt model
descriptions, or syncing analytics changelog. Don't commit the token —
either let `claude mcp` store it in `~/.claude.json`, or reference an env
var your shell exports.

If you prefer the official Notion MCP via the `claude-ai_Notion` plugin
already listed in this session, those tools are already available
(`mcp__claude_ai_Notion__notion-search`, `notion-fetch`, etc.). They use
your authenticated Claude account, no token wiring needed. **Use those
unless you specifically need a project-scoped token.**

## Known gotchas

- `dbt run --full-refresh` can rebuild marts — they're set as
  `+materialized: table` and `+full_refresh: true` at project level.
  Don't run on production schemas without coordination.
- `USE_MOTHER_DUCK=False` in `.env` makes Dagster write to
  `db/dagster.duckdb` locally. dbt's `profiles.yml` is independent —
  keep them aligned when developing.
- Asset-key drift: if you rename a dbt model `int_foo` → `int_bar`, the
  Dagster asset key changes and any downstream selection in
  `daily_update_dwh_job` referencing the old name silently no-ops.
  `definitions.py` builds selections programmatically from
  `dwh_assets` + `dbt_analytics_assets`, so this is mostly safe — but
  verify after rename.
