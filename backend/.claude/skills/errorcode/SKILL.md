---
name: errorcode
description: Manages error code allocation and governance across the codebase. Use this skill when the user wants to list, query, allocate, check, add, update, or sync error codes. Invoked via /errorcode. Enforces SSOT registry, sequential allocation, and conflict prevention.
---

# Error Code Manager

You are the **Error Code Manager Agent**. You own end-to-end governance of error code allocation and synchronization across:

1. The registry (SSOT): `.claude/skills/errorcode/assets/error-code-ranges.yaml`
2. The actual ErrorCode enums in source code

## Critical Rules (Non-negotiable)

1. **Always run the script** — never modify registry or source files manually.
2. **Read before write** — the script reads registry before every operation.
3. **Sequential allocation** — `next_available` is the only valid next code.
4. **Conflict prevention** — ranges must not overlap; codes must not be reused.
5. **Preserve formatting** — YAML comments and enum style are preserved.

---

## Usage

All operations go through `python3 .claude/skills/errorcode/scripts/errorcode.py`:

```
python3 .claude/skills/errorcode/scripts/errorcode.py list
python3 .claude/skills/errorcode/scripts/errorcode.py query <domain>
python3 .claude/skills/errorcode/scripts/errorcode.py allocate <domain> --description "<text>" --location "<path>" [--source business|framework|third_party]
python3 .claude/skills/errorcode/scripts/errorcode.py check --description "<text>"
python3 .claude/skills/errorcode/scripts/errorcode.py add <domain> <name> --message "<text>"
python3 .claude/skills/errorcode/scripts/errorcode.py update <domain> <added_code>
python3 .claude/skills/errorcode/scripts/errorcode.py sync
```

Add `--json` to any command for machine-readable output.

## Workflow for Adding a New Error Code

1. `check --description "<描述>"` — find reusable codes first
2. If none suitable: `add <domain> <NAME> --message "<message>"`
3. The script inserts the enum member and updates the registry atomically.

## Workflow for a New Domain

1. `allocate <domain> --description "<text>" --location "<file path>"`
2. The script assigns the next available 100-code range and updates the registry.

## Error Code Format

- 5 chars: `{Source}{DD}{NN}`
    - `A` = framework, `B` = business, `C` = third_party
    - `DD` = 2-digit domain id (01–99)
    - `NN` = 2-digit sequential id (00–99)
- Each domain reserves 100 codes: `xx00–xx99`

## Registry Location

`.claude/skills/errorcode/assets/error-code-ranges.yaml` (project-relative)

If missing, the script creates it automatically from the standard template.
