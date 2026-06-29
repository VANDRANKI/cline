#!/usr/bin/env python3
"""Audit .proto files for complete service and RPC definitions.

Parses every .proto file under proto/, extracts service and RPC
definitions using a simple regex-based parser, and checks that each
RPC has non-empty request and response type names.

Usage:
    python scripts/audit_proto.py
    python scripts/audit_proto.py --proto-dir proto/
    python scripts/audit_proto.py --verbose
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

PROTO_DIR = Path("proto")

# Matches: rpc MethodName (RequestType) returns (ResponseType);
_RPC_RE = re.compile(
    r"rpc\s+(\w+)\s*\(\s*(\w*)\s*\)\s*returns\s*\(\s*(\w*)\s*\)",
    re.MULTILINE,
)
# Matches: service ServiceName {
_SERVICE_RE = re.compile(r"service\s+(\w+)\s*\{")
# Matches: message TypeName {
_MESSAGE_RE = re.compile(r"message\s+(\w+)\s*\{")


def parse_proto(content: str) -> dict:
    """Parse a .proto file and return service/rpc/message info."""
    services = _SERVICE_RE.findall(content)
    messages = set(_MESSAGE_RE.findall(content))
    rpcs = [
        {"method": m, "request": req, "response": resp}
        for m, req, resp in _RPC_RE.findall(content)
    ]
    return {"services": services, "messages": messages, "rpcs": rpcs}


def audit_file(proto_file: Path) -> list[str]:
    """Return issues found in a single .proto file."""
    content = proto_file.read_text(encoding="utf-8")
    info = parse_proto(content)
    issues: list[str] = []

    for rpc in info["rpcs"]:
        if not rpc["request"]:
            issues.append(f"rpc {rpc['method']}: empty request type")
        if not rpc["response"]:
            issues.append(f"rpc {rpc['method']}: empty response type")

    return issues


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--proto-dir", type=Path, default=PROTO_DIR,
        help=f"Directory containing .proto files (default: {PROTO_DIR})",
    )
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args(argv)

    proto_dir: Path = args.proto_dir
    if not proto_dir.exists():
        print(f"ERROR: {proto_dir} does not exist.", file=sys.stderr)
        return 1

    proto_files = sorted(proto_dir.rglob("*.proto"))
    if not proto_files:
        print(f"No .proto files found under {proto_dir}.")
        return 0

    all_issues: dict[str, list[str]] = {}
    rpc_totals = 0

    for proto_file in proto_files:
        content = proto_file.read_text(encoding="utf-8")
        info = parse_proto(content)
        rpc_totals += len(info["rpcs"])
        issues = audit_file(proto_file)
        if issues:
            all_issues[str(proto_file)] = issues
        elif args.verbose:
            service_names = ", ".join(info["services"]) or "(none)"
            print(f"OK  {proto_file}  services={service_names}  rpcs={len(info['rpcs'])}")

    if all_issues:
        print(f"\nProto issues in {len(all_issues)}/{len(proto_files)} file(s):\n")
        for filepath, issues in sorted(all_issues.items()):
            for issue in issues:
                print(f"  {filepath}: {issue}")
        return 1

    print(f"All {len(proto_files)} .proto file(s) OK ({rpc_totals} RPC(s) audited).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
