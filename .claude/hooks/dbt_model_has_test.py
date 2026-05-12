#!/usr/bin/env python3
"""PostToolUse hook: after Write/Edit of a dbt model SQL file, warn if the
sibling schema.yml has no `tests:` entry for the model.

Reads tool_input JSON on stdin. Exits 0 always (non-blocking nudge).
Emits a `systemMessage` via JSON output when test coverage is missing so the
warning shows up in the Claude Code UI.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_DBT_MODELS = "analytics/dbt/models"


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    file_path = (
        (payload.get("tool_input") or {}).get("file_path")
        or (payload.get("tool_response") or {}).get("filePath")
    )
    if not file_path:
        return 0

    p = Path(file_path)
    if REPO_DBT_MODELS not in str(p) or p.suffix != ".sql":
        return 0
    if not p.exists():
        return 0

    model_name = p.stem
    schema_yml = p.parent / "schema.yml"

    msg: str | None = None
    if not schema_yml.exists():
        msg = (
            f"⚠️  dbt model `{model_name}` has no `schema.yml` in {p.parent}. "
            f"Add one with a description and at least one test on the primary "
            f"key (unique + not_null, or "
            f"dbt_utils.unique_combination_of_columns). CI gate "
            f"`dbt-test-coverage.yml` will reject the PR otherwise."
        )
    else:
        text = schema_yml.read_text()
        # Crude but effective: find `name: <model_name>` and look for `tests:`
        # within the following ~80 lines. Avoids requiring PyYAML.
        lines = text.splitlines()
        model_idx = None
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped == f"- name: {model_name}" or stripped == f"name: {model_name}":
                model_idx = i
                break

        if model_idx is None:
            msg = (
                f"⚠️  dbt model `{model_name}` is not declared in "
                f"{schema_yml}. Add a `- name: {model_name}` block with a "
                f"description and at least one test."
            )
        else:
            # Look ahead until next top-level model entry or EOF.
            block = []
            for line in lines[model_idx + 1:]:
                if line.startswith("  - name:"):
                    break
                block.append(line)
            block_text = "\n".join(block)
            if "tests:" not in block_text:
                msg = (
                    f"⚠️  dbt model `{model_name}` has a schema.yml entry but "
                    f"no `tests:` block. Add at least one test "
                    f"(unique/not_null on PK, dbt_utils.unique_combination_of_columns, "
                    f"or a relationships test). CI gate will reject the PR otherwise."
                )

    if msg:
        json.dump({"systemMessage": msg}, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
