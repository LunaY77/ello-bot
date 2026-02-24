#!/usr/bin/env python3
"""Error Code Manager - SSOT governance for error codes.

Usage:
    python errorcode.py list
    python errorcode.py query <domain>
    python errorcode.py allocate <domain> --description "<text>" --location "<path>"
    python errorcode.py check --description "<text>"
    python errorcode.py add <domain> <name> --message "<text>"
    python errorcode.py update <domain> <added_code>
    python errorcode.py sync
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Optional

try:
    from ruamel.yaml import YAML # pyright: ignore[reportMissingImports]
    _yaml = YAML()
    _yaml.preserve_quotes = True
    _yaml.default_flow_style = False
    _yaml.width = 4096
except ImportError:
    print(
        "ERROR: ruamel.yaml is required.\n"
        "Install with: pip install ruamel.yaml",
        file=sys.stderr,
    )
    sys.exit(1)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

REGISTRY_RELATIVE = Path(".claude/skills/errorcode/assets/error-code-ranges.yaml")
CODE_IN_PARENS_RE = re.compile(r'\(\s*["\']([ABC]\d{4})["\']\s*(,|\))')
SOURCE_PREFIX = {"framework": "A", "business": "B", "third_party": "C"}
PREFIX_SOURCE = {v: k for k, v in SOURCE_PREFIX.items()}

INITIAL_REGISTRY = """\
# Error Code Registry - Single Source of Truth
# Format: {Source}{DD}{NN}  Source=A(framework)/B(business)/C(third_party)
# Each domain reserves 100 codes (xx00-xx99), step=1

framework:
  # A = framework / infrastructure errors

business:
  # B = business logic errors

third_party:
  # C = third-party / external system errors
"""

# ---------------------------------------------------------------------------
# Registry helpers
# ---------------------------------------------------------------------------

def _registry_path() -> Path:
    return Path.cwd() / REGISTRY_RELATIVE


def load_registry() -> dict:
    path = _registry_path()
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(INITIAL_REGISTRY, encoding="utf-8")
    with path.open("r", encoding="utf-8") as f:
        data = _yaml.load(f)
    if data is None:
        data = {}
    for src in ("framework", "business", "third_party"):
        if src not in data or data[src] is None:
            data[src] = {}
    return data


def save_registry(data: dict) -> None:
    path = _registry_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".yaml.tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            _yaml.dump(data, f)
        shutil.move(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


# ---------------------------------------------------------------------------
# Code / range helpers
# ---------------------------------------------------------------------------

def parse_range(range_str: str) -> tuple[str, str]:
    """Parse 'B0100-B0199' -> ('B0100', 'B0199')."""
    parts = range_str.split("-")
    if len(parts) != 2:
        raise ValueError(f"Invalid range: {range_str!r}")
    return parts[0].strip(), parts[1].strip()


def code_to_int(code: str) -> int:
    return int(code[1:])


def int_to_code(prefix: str, n: int) -> str:
    return f"{prefix}{n:04d}"


def increment_code(code: str) -> str:
    prefix = code[0]
    n = code_to_int(code)
    return int_to_code(prefix, n + 1)


def code_in_range(code: str, start: str, end: str) -> bool:
    return code_to_int(start) <= code_to_int(code) <= code_to_int(end)


def find_next_free_range(registry: dict, source: str) -> tuple[str, str]:
    """Find the smallest unused 100-code range for the given source."""
    prefix = SOURCE_PREFIX[source]
    used_starts: set[int] = set()
    src_data = registry.get(source) or {}
    for domain_data in src_data.values():
        if not isinstance(domain_data, dict) or "range" not in domain_data:
            continue
        start, _ = parse_range(domain_data["range"])
        if start[0] == prefix:
            used_starts.add(code_to_int(start) // 100)
    for slot in range(1, 100):
        if slot not in used_starts:
            base = slot * 100
            start = int_to_code(prefix, base)
            end = int_to_code(prefix, base + 99)
            return start, end
    raise RuntimeError("No free 100-code range available")


def validate_no_overlaps(registry: dict) -> list[str]:
    errors = []
    for source, src_data in registry.items():
        if not isinstance(src_data, dict):
            continue
        ranges: list[tuple[int, int, str]] = []
        for domain, domain_data in src_data.items():
            if not isinstance(domain_data, dict) or "range" not in domain_data:
                continue
            start, end = parse_range(domain_data["range"])
            ranges.append((code_to_int(start), code_to_int(end), domain))
        ranges.sort()
        for i in range(len(ranges) - 1):
            if ranges[i][1] >= ranges[i + 1][0]:
                errors.append(
                    f"[{source}] Range overlap: {ranges[i][2]} and {ranges[i+1][2]}"
                )
    return errors


# ---------------------------------------------------------------------------
# Repo scanning
# ---------------------------------------------------------------------------

def scan_codes_in_paths(paths: list[Path]) -> dict[str, list[dict]]:
    """Return {code: [{file, line, text}, ...]} for all error codes found.

    NOTE: Only counts codes in a *closed parentheses* tuple-style literal, e.g.
      PARAM_ERROR = ("A0000", "...")
    """
    results: dict[str, list[dict]] = {}
    use_rg = shutil.which("rg") is not None

    if use_rg:
        path_args = [str(p) for p in paths if p.exists()]
        if not path_args:
            return results
        # Match: ("A0000", ...) or ('A0000', ...) or ("A0000")
        rg_pat = r'\(\s*["\'][ABC]\d{4}["\']\s*(,|\))'
        try:
            proc = subprocess.run(
                ["rg", "-n", rg_pat] + path_args,
                capture_output=True, text=True
            )
            for line in proc.stdout.splitlines():
                parts = line.split(":", 2)
                if len(parts) < 3:
                    continue
                file_path, lineno, text = parts[0], parts[1], parts[2]
                for m in CODE_IN_PARENS_RE.finditer(text):
                    code = m.group(1)
                    results.setdefault(code, []).append(
                        {"file": file_path, "line": int(lineno), "text": text.strip()}
                    )
        except Exception:
            pass
        return results

    # Python fallback
    for root in paths:
        if not root.exists():
            continue
        for fpath in root.rglob("*"):
            if not fpath.is_file():
                continue
            try:
                content = fpath.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            for i, text in enumerate(content.splitlines(), 1):
                for m in CODE_IN_PARENS_RE.finditer(text):
                    code = m.group(1)
                    results.setdefault(code, []).append(
                        {"file": str(fpath), "line": i, "text": text.strip()}
                    )
    return results

def scan_all_codes() -> dict[str, list[dict]]:
    roots = []
    for candidate in ["app", "src"]:
        p = Path.cwd() / candidate
        if p.exists():
            roots.append(p)
    if not roots:
        roots = [Path.cwd()]
    return scan_codes_in_paths(roots)


def resolve_domain(registry: dict, domain: str, source: Optional[str] = None):
    """Return (source, domain_key, domain_data) or raise ValueError."""
    if "." in domain:
        src, key = domain.split(".", 1)
    else:
        src = source or "business"
        key = domain

    src_data = registry.get(src)
    if not isinstance(src_data, dict) or key not in src_data:
        raise ValueError(
            f"Domain '{src}.{key}' not found in registry. "
            f"Run: allocate {key} --description '...' --location '...'"
        )
    return src, key, src_data[key]


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

def _out(args, text: str, data: dict) -> None:
    if getattr(args, "json", False):
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        print(text)


def _fail(args, message: str, errors: Optional[list[str]] = None) -> None:
    errors = errors or [message]
    if getattr(args, "json", False):
        print(json.dumps({"ok": False, "action": "", "errors": errors, "data": {}},
                         ensure_ascii=False, indent=2))
    else:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(2)


# ---------------------------------------------------------------------------
# cmd: list
# ---------------------------------------------------------------------------

def cmd_list(args) -> None:
    registry = load_registry()
    overlap_errors = validate_no_overlaps(registry)
    all_codes = scan_all_codes()

    rows = []
    for source in ("framework", "business", "third_party"):
        src_data = registry.get(source) or {}
        for domain, domain_data in src_data.items():
            if not isinstance(domain_data, dict):
                continue
            rng = domain_data.get("range", "?")
            nxt = domain_data.get("next_available", "?")
            loc = domain_data.get("location", "?")
            if rng != "?":
                start, end = parse_range(rng)
                used = [c for c in all_codes if code_in_range(c, start, end)]
                used_count = len(used)
                max_used = max((c for c in used), key=code_to_int, default=None)
                drift = (
                    "DRIFT" if max_used and nxt != "?" and
                    code_to_int(nxt) <= code_to_int(max_used) else "OK"
                )
            else:
                used_count, drift = 0, "?"
            rows.append({
                "source": source, "domain": domain, "range": rng,
                "next_available": nxt, "location": loc,
                "used_count": used_count, "drift": drift,
            })

    lines = ["## Error Code Registry\n"]
    if overlap_errors:
        lines.append("### ⚠ Overlap Errors")
        for e in overlap_errors:
            lines.append(f"  - {e}")
        lines.append("")
    lines.append(f"{'Source':<12} {'Domain':<20} {'Range':<14} {'Next':<8} {'Used':<6} {'Drift':<6} Location")
    lines.append("-" * 90)
    for r in rows:
        lines.append(
            f"{r['source']:<12} {r['domain']:<20} {r['range']:<14} "
            f"{r['next_available']:<8} {r['used_count']:<6} {r['drift']:<6} {r['location']}"
        )
    _out(args, "\n".join(lines), {"ok": True, "action": "list",
                                   "errors": overlap_errors, "data": {"domains": rows}})


# ---------------------------------------------------------------------------
# cmd: query
# ---------------------------------------------------------------------------

def cmd_query(args) -> None:
    registry = load_registry()
    try:
        src, key, domain_data = resolve_domain(registry, args.domain)
    except ValueError as e:
        _fail(args, str(e))
        return

    rng = domain_data.get("range", "?")
    nxt = domain_data.get("next_available", "?")
    loc = domain_data.get("location", "?")
    all_codes = scan_all_codes()

    used = {}
    if rng != "?":
        start, end = parse_range(rng)
        used = {c: v for c, v in all_codes.items() if code_in_range(c, start, end)}

    lines = [
        f"## Domain: {src}.{key}",
        f"Range:          {rng}",
        f"Next available: {nxt}",
        f"Location:       {loc}",
        f"Used codes:     {len(used)}",
    ]
    if used:
        lines.append("\nExisting codes:")
        for code in sorted(used, key=code_to_int):
            sample = used[code][0]
            lines.append(f"  {code}  {sample['file']}:{sample['line']}  {sample['text'][:60]}")

    _out(args, "\n".join(lines), {
        "ok": True, "action": "query", "errors": [],
        "data": {"source": src, "domain": key, "range": rng,
                 "next_available": nxt, "location": loc,
                 "used": {c: v[0] for c, v in used.items()}},
    })


# ---------------------------------------------------------------------------
# cmd: allocate
# ---------------------------------------------------------------------------

def cmd_allocate(args) -> None:
    registry = load_registry()
    source = getattr(args, "source", None) or "business"
    domain = args.domain

    if source not in SOURCE_PREFIX:
        _fail(args, f"Unknown source '{source}'. Choose: business, framework, third_party")
        return

    src_data = registry.get(source) or {}
    if domain in src_data:
        _fail(args, f"Domain '{source}.{domain}' already exists in registry.")
        return

    start, end = find_next_free_range(registry, source)
    entry = {
        "range": f"{start}-{end}",
        "description": args.description,
        "location": args.location,
        "next_available": start,
    }
    registry[source][domain] = entry

    overlap_errors = validate_no_overlaps(registry)
    if overlap_errors:
        _fail(args, "Range overlap detected after allocation", overlap_errors)
        return

    save_registry(registry)
    msg = f"Allocated {source}.{domain}: {start}-{end} (next: {start})"
    _out(args, msg, {"ok": True, "action": "allocate", "errors": [],
                     "data": {"source": source, "domain": domain,
                              "range": f"{start}-{end}", "next_available": start}})


# ---------------------------------------------------------------------------
# cmd: check
# ---------------------------------------------------------------------------

def cmd_check(args) -> None:
    description = args.description.lower()
    all_codes = scan_all_codes()
    candidates = []

    for code, occurrences in all_codes.items():
        for occ in occurrences:
            text = occ["text"].lower()
            score = 0
            if description in text:
                score = 3
            elif any(w in text for w in description.split() if len(w) > 2):
                score = 1
            if score:
                candidates.append({
                    "code": code, "score": score,
                    "file": occ["file"], "line": occ["line"], "text": occ["text"],
                })

    candidates.sort(key=lambda x: -x["score"])
    top = candidates[:5]

    if top:
        lines = [f"## Top matches for: {args.description}\n"]
        for c in top:
            lines.append(f"  {c['code']}  {c['file']}:{c['line']}")
            lines.append(f"    {c['text']}")
    else:
        lines = [f"No existing codes match '{args.description}'. Safe to add new."]

    _out(args, "\n".join(lines), {"ok": True, "action": "check", "errors": [],
                                   "data": {"candidates": top}})


# ---------------------------------------------------------------------------
# cmd: add
# ---------------------------------------------------------------------------

def _detect_enum_style(content: str) -> Optional[str]:
    """Detect enum member pattern. Returns a format hint or None."""
    # Python: MEMBER = ("CODE", "message")
    m = re.search(r'(\w+)\s*=\s*\(\s*"([ABC]\d{4})"\s*,\s*"([^"]+)"\s*\)', content)
    if m:
        return "python_tuple"
    # Python: MEMBER = "CODE"
    m = re.search(r'(\w+)\s*=\s*"([ABC]\d{4})"', content)
    if m:
        return "python_str"
    return None


def _insert_enum_member(content: str, name: str, code: str, message: str,
                        style: str) -> str:
    """Insert a new enum member before the last non-empty line of the enum body."""
    if style == "python_tuple":
        new_member = f'    {name} = ("{code}", "{message}")\n'
    elif style == "python_str":
        new_member = f'    {name} = "{code}"\n'
    else:
        raise ValueError(f"Unknown enum style: {style}")

    # Insert before the last closing line (class end or last member)
    lines = content.splitlines(keepends=True)
    # Find last line that has an enum member
    last_member_idx = -1
    for i, line in enumerate(lines):
        if re.search(r'^\s+\w+\s*=\s*[("\']', line):
            last_member_idx = i
    if last_member_idx == -1:
        return content + new_member
    lines.insert(last_member_idx + 1, new_member)
    return "".join(lines)


def cmd_add(args) -> None:
    registry = load_registry()
    try:
        src, key, domain_data = resolve_domain(registry, args.domain)
    except ValueError as e:
        _fail(args, str(e))
        return

    nxt = domain_data.get("next_available")
    rng = domain_data.get("range")
    loc = domain_data.get("location")

    if not nxt or not rng or not loc:
        _fail(args, f"Domain '{src}.{key}' is missing range/next_available/location.")
        return

    start, end = parse_range(rng)
    if not code_in_range(nxt, start, end):
        _fail(args, f"next_available '{nxt}' is outside range {rng}.")
        return

    # Check code not already used
    all_codes = scan_all_codes()
    if nxt in all_codes:
        _fail(args, f"Code '{nxt}' already exists in repo: {all_codes[nxt][0]}")
        return

    loc_path = Path.cwd() / loc
    if not loc_path.exists():
        _fail(args, f"Location file not found: {loc_path}")
        return

    content = loc_path.read_text(encoding="utf-8")
    style = _detect_enum_style(content)
    if style is None:
        snippet = "\n".join(content.splitlines()[:10])
        _fail(args, (
            f"Cannot detect enum style in {loc}.\n"
            f"First 10 lines:\n{snippet}\n"
            f"What is the enum member format? (e.g. NAME = (\"CODE\", \"message\"))"
        ))
        return

    new_content = _insert_enum_member(content, args.name, nxt, args.message, style)
    new_next = increment_code(nxt)
    if not code_in_range(new_next, start, end):
        _fail(args, f"Range exhausted: incrementing '{nxt}' exceeds range end '{end}'.")
        return

    # Atomic write
    fd, tmp = tempfile.mkstemp(dir=loc_path.parent, suffix=".py.tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(new_content)
        shutil.move(tmp, loc_path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise

    domain_data["next_available"] = new_next
    save_registry(registry)

    msg = f"Added {args.name} = {nxt} to {loc}\nRegistry next_available: {new_next}"
    _out(args, msg, {"ok": True, "action": "add", "errors": [],
                     "data": {"code": nxt, "name": args.name, "message": args.message,
                              "file": loc, "new_next_available": new_next}})


# ---------------------------------------------------------------------------
# cmd: update
# ---------------------------------------------------------------------------

def cmd_update(args) -> None:
    registry = load_registry()
    try:
        src, key, domain_data = resolve_domain(registry, args.domain)
    except ValueError as e:
        _fail(args, str(e))
        return

    nxt = domain_data.get("next_available")
    if args.added_code != nxt:
        _fail(args, f"added_code '{args.added_code}' != next_available '{nxt}'. "
                    "Only the current next_available can be confirmed.")
        return

    loc = domain_data.get("location", "")
    loc_path = Path.cwd() / loc
    if loc_path.exists():
        content = loc_path.read_text(encoding="utf-8")
        if args.added_code not in content:
            _fail(args, f"Code '{args.added_code}' not found in {loc}. "
                        "Add it to the enum file first.")
            return

    rng = domain_data.get("range", "")
    start, end = parse_range(rng)
    new_next = increment_code(nxt)
    if not code_in_range(new_next, start, end):
        _fail(args, f"Range exhausted after '{nxt}' (end: '{end}').")
        return

    domain_data["next_available"] = new_next
    save_registry(registry)
    msg = f"Updated {src}.{key}: confirmed {args.added_code}, next_available -> {new_next}"
    _out(args, msg, {"ok": True, "action": "update", "errors": [],
                     "data": {"confirmed": args.added_code, "new_next_available": new_next}})


# ---------------------------------------------------------------------------
# cmd: sync
# ---------------------------------------------------------------------------

def cmd_sync(args) -> None:
    registry = load_registry()
    all_codes = scan_all_codes()
    changes = []

    for source in ("framework", "business", "third_party"):
        src_data = registry.get(source) or {}
        for domain, domain_data in src_data.items():
            if not isinstance(domain_data, dict) or "range" not in domain_data:
                continue
            rng = domain_data["range"]
            start, end = parse_range(rng)
            used_in_range = [c for c in all_codes if code_in_range(c, start, end)]
            if not used_in_range:
                continue
            max_used = max(used_in_range, key=code_to_int)
            nxt = domain_data.get("next_available", start)
            if code_to_int(nxt) <= code_to_int(max_used):
                new_next = increment_code(max_used)
                if code_in_range(new_next, start, end):
                    domain_data["next_available"] = new_next
                    changes.append(f"{source}.{domain}: {nxt} -> {new_next}")

    if changes:
        save_registry(registry)
        msg = "Synced:\n" + "\n".join(f"  {c}" for c in changes)
    else:
        msg = "Registry is already in sync. No changes."

    _out(args, msg, {"ok": True, "action": "sync", "errors": [],
                     "data": {"changes": changes}})


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="errorcode",
        description="Error Code Manager - SSOT governance for error codes",
    )
    p.add_argument("--json", action="store_true", help="Output JSON")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="List all domains and their status")

    q = sub.add_parser("query", help="Query a specific domain")
    q.add_argument("domain", help="Domain name (e.g. user or business.user)")
    q.add_argument("--json", action="store_true")

    al = sub.add_parser("allocate", help="Register a new domain")
    al.add_argument("domain")
    al.add_argument("--description", required=True)
    al.add_argument("--location", required=True)
    al.add_argument("--source", default="business",
                    choices=["business", "framework", "third_party"])
    al.add_argument("--json", action="store_true")

    ch = sub.add_parser("check", help="Check for reusable codes")
    ch.add_argument("--description", required=True)
    ch.add_argument("--json", action="store_true")

    add = sub.add_parser("add", help="Add a new error code")
    add.add_argument("domain")
    add.add_argument("name", help="Enum member name (e.g. USER_NOT_FOUND)")
    add.add_argument("--message", required=True)
    add.add_argument("--json", action="store_true")

    upd = sub.add_parser("update", help="Confirm a manually added code")
    upd.add_argument("domain")
    upd.add_argument("added_code")
    upd.add_argument("--json", action="store_true")

    sy = sub.add_parser("sync", help="Sync registry with actual code")
    sy.add_argument("--json", action="store_true")

    return p


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    try:
        dispatch = {
            "list": cmd_list,
            "query": cmd_query,
            "allocate": cmd_allocate,
            "check": cmd_check,
            "add": cmd_add,
            "update": cmd_update,
            "sync": cmd_sync,
        }
        dispatch[args.command](args)
    except SystemExit:
        raise
    except Exception as e:
        if getattr(args, "json", False):
            print(json.dumps({"ok": False, "action": args.command,
                              "errors": [str(e)], "data": {}}))
        else:
            print(f"UNEXPECTED ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
