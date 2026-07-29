"""Run and compare isolated Google Maps scraper diagnostics.

This module never changes the live catalog. It prepares fixed live listing
queries, records one scraper process per listing, and compares the returned
rating, review count, and weekly hours.
"""

from __future__ import annotations

import argparse
import csv
import json
import shlex
import subprocess
import sys
import time
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
WEEKDAYS = {
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
}
CANARY_FIELDS = [
    "venue_id",
    "name",
    "google_url",
    "rating",
    "review_count",
]
STATUS_FIELDS = [
    "venue_id",
    "name",
    "return_code",
    "timed_out",
    "result_rows",
    "result_file",
]
COMPARISON_FIELDS = [
    "variant",
    "venue_id",
    "name",
    "baseline_rating",
    "baseline_review_count",
    "source_commit",
    "build_exit_code",
    "run_exit_code",
    "timed_out",
    "raw_rows",
    "matched",
    "scraped_rating",
    "scraped_review_count",
    "valid_popularity",
    "hours_days",
    "complete_week",
    "scraped_title",
    "scraped_link",
]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fieldnames: list[str], rows: Iterable[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def read_canary_ids(path: Path) -> list[str]:
    venue_ids = []
    for line in path.read_text(encoding="utf-8").splitlines():
        value = line.strip()
        if value and not value.startswith("#"):
            venue_ids.append(value)
    if not venue_ids:
        raise ValueError(f"no canary venue ids found in {path}")
    if len(set(venue_ids)) != len(venue_ids):
        raise ValueError(f"duplicate canary venue ids found in {path}")
    return venue_ids


def prepare_canaries(live_path: Path, canary_path: Path, output_dir: Path) -> list[dict[str, str]]:
    live = {row["venue_id"]: row for row in read_csv(live_path)}
    rows = []
    for venue_id in read_canary_ids(canary_path):
        if venue_id not in live:
            raise ValueError(f"canary venue id is not live: {venue_id}")
        row = {field: live[venue_id].get(field, "") for field in CANARY_FIELDS}
        if not row["google_url"]:
            raise ValueError(f"canary listing has no Google Maps URL: {venue_id}")
        rows.append(row)

    output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(output_dir / "canaries.csv", CANARY_FIELDS, rows)
    (output_dir / "queries.txt").write_text(
        "".join(f"{row['google_url']}\n" for row in rows),
        encoding="utf-8",
    )
    return rows


def count_result_rows(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(1 for line in path.read_text(encoding="utf-8").splitlines() if line.strip())


def run_variant(
    binary: Path,
    canaries_path: Path,
    output_dir: Path,
    timeout_seconds: int = 120,
    pause_seconds: int = 5,
    geo: str = "24.8607,67.0011",
    depth: int = 1,
    zoom: int = 15,
    concurrency: int = 1,
) -> list[dict[str, str]]:
    canaries = read_csv(canaries_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    statuses = []

    for index, canary in enumerate(canaries, start=1):
        prefix = f"{index:02d}"
        query_path = output_dir / f"{prefix}.query.txt"
        result_path = output_dir / f"{prefix}.json"
        stdout_path = output_dir / f"{prefix}.stdout.log"
        stderr_path = output_dir / f"{prefix}.stderr.log"
        query_path.write_text(f"{canary['google_url']}\n", encoding="utf-8")

        command = [
            str(binary),
            "-input",
            str(query_path),
            "-results",
            str(result_path),
            "-json",
            "-lang",
            "en",
            "-geo",
            geo,
            "-depth",
            str(depth),
            "-zoom",
            str(zoom),
            "-c",
            str(concurrency),
        ]
        (output_dir / f"{prefix}.command.txt").write_text(
            shlex.join(command) + "\n",
            encoding="utf-8",
        )

        timed_out = False
        try:
            completed = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                check=False,
            )
            return_code = completed.returncode
            stdout = completed.stdout
            stderr = completed.stderr
        except subprocess.TimeoutExpired as exc:
            timed_out = True
            return_code = 124
            stdout = exc.stdout or ""
            stderr = exc.stderr or ""
            if isinstance(stdout, bytes):
                stdout = stdout.decode("utf-8", errors="replace")
            if isinstance(stderr, bytes):
                stderr = stderr.decode("utf-8", errors="replace")
            stderr += f"\ntimed out after {timeout_seconds} seconds\n"

        stdout_path.write_text(stdout, encoding="utf-8")
        stderr_path.write_text(stderr, encoding="utf-8")
        statuses.append(
            {
                "venue_id": canary["venue_id"],
                "name": canary["name"],
                "return_code": str(return_code),
                "timed_out": str(timed_out).lower(),
                "result_rows": str(count_result_rows(result_path)),
                "result_file": result_path.name,
            }
        )
        if index < len(canaries) and pause_seconds > 0:
            time.sleep(pause_seconds)

    write_csv(output_dir / "status.csv", STATUS_FIELDS, statuses)
    return statuses


def iter_json_lines(path: Path) -> Iterable[dict]:
    if not path.exists():
        return
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            yield json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path}:{line_number}: invalid JSON") from exc


def best_matching_row(path: Path, venue_id: str) -> dict | None:
    matches = [row for row in iter_json_lines(path) if str(row.get("place_id") or "") == venue_id]
    if not matches:
        return None

    def review_count(row: dict) -> int:
        try:
            return int(row.get("review_count") or 0)
        except (TypeError, ValueError):
            return 0

    return max(matches, key=review_count)


def valid_popularity(row: dict | None) -> bool:
    if row is None:
        return False
    try:
        rating = float(row.get("review_rating"))
        review_count = int(row.get("review_count"))
    except (TypeError, ValueError):
        return False
    return 0 < rating <= 5 and review_count >= 5


def hours_coverage(row: dict | None) -> tuple[int, bool]:
    if row is None or not isinstance(row.get("open_hours"), dict):
        return 0, False
    hours = row["open_hours"]
    covered = {day for day in WEEKDAYS if hours.get(day)}
    return len(covered), covered == WEEKDAYS


def read_exit_code(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip() if path.exists() else ""


def compare_variants(
    canaries_path: Path,
    variants: list[tuple[str, Path]],
    output_dir: Path,
) -> list[dict]:
    canaries = read_csv(canaries_path)
    comparison = []
    summary_lines = [
        "# Maps scraper diagnostic",
        "",
        "This run is read-only. It did not update the live catalog.",
        "",
    ]

    for variant_name, variant_dir in variants:
        statuses = {
            row["venue_id"]: row
            for row in read_csv(variant_dir / "status.csv")
        } if (variant_dir / "status.csv").exists() else {}
        source_commit = read_exit_code(variant_dir / "upstream_sha.txt")
        build_exit_code = read_exit_code(variant_dir / "build_exit_code.txt")
        variant_rows = []

        for canary in canaries:
            status = statuses.get(canary["venue_id"], {})
            result_file = status.get("result_file", "")
            result_path = variant_dir / result_file if result_file else variant_dir / "missing.json"
            matched = best_matching_row(result_path, canary["venue_id"])
            hours_days, complete_week = hours_coverage(matched)
            row = {
                "variant": variant_name,
                "venue_id": canary["venue_id"],
                "name": canary["name"],
                "baseline_rating": canary["rating"],
                "baseline_review_count": canary["review_count"],
                "source_commit": source_commit,
                "build_exit_code": build_exit_code,
                "run_exit_code": status.get("return_code", ""),
                "timed_out": status.get("timed_out", ""),
                "raw_rows": status.get("result_rows", "0"),
                "matched": str(matched is not None).lower(),
                "scraped_rating": matched.get("review_rating", "") if matched else "",
                "scraped_review_count": matched.get("review_count", "") if matched else "",
                "valid_popularity": str(valid_popularity(matched)).lower(),
                "hours_days": str(hours_days),
                "complete_week": str(complete_week).lower(),
                "scraped_title": matched.get("title", "") if matched else "",
                "scraped_link": matched.get("link", "") if matched else "",
            }
            comparison.append(row)
            variant_rows.append(row)

        matched_count = sum(row["matched"] == "true" for row in variant_rows)
        valid_count = sum(row["valid_popularity"] == "true" for row in variant_rows)
        full_week_count = sum(row["complete_week"] == "true" for row in variant_rows)
        summary_lines.extend(
            [
                f"## {variant_name}",
                "",
                f"- Upstream commit: {source_commit or 'not recorded'}",
                f"- Build exit code: {build_exit_code or 'not recorded'}",
                f"- Exact place IDs matched: {matched_count}/{len(canaries)}",
                f"- Valid ratings and review counts: {valid_count}/{len(canaries)}",
                f"- Complete seven-day hours: {full_week_count}/{len(canaries)}",
                "",
            ]
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(output_dir / "comparison.csv", COMPARISON_FIELDS, comparison)
    (output_dir / "summary.md").write_text("\n".join(summary_lines), encoding="utf-8")
    return comparison


def parse_variant(value: str) -> tuple[str, Path]:
    if "=" not in value:
        raise argparse.ArgumentTypeError("variant must use NAME=PATH")
    name, path = value.split("=", 1)
    if not name or not path:
        raise argparse.ArgumentTypeError("variant must use NAME=PATH")
    return name, Path(path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)

    prepare = commands.add_parser("prepare")
    prepare.add_argument("--live", type=Path, default=ROOT / "data" / "live_listings.csv")
    prepare.add_argument(
        "--canaries",
        type=Path,
        default=ROOT / "scraper" / "diagnostic_canaries.txt",
    )
    prepare.add_argument("--output", type=Path, required=True)

    run = commands.add_parser("run")
    run.add_argument("--binary", type=Path, required=True)
    run.add_argument("--canaries", type=Path, required=True)
    run.add_argument("--output", type=Path, required=True)
    run.add_argument("--timeout-seconds", type=int, default=120)
    run.add_argument("--pause-seconds", type=int, default=5)

    summarize = commands.add_parser("summarize")
    summarize.add_argument("--canaries", type=Path, required=True)
    summarize.add_argument("--variant", action="append", type=parse_variant, required=True)
    summarize.add_argument("--output", type=Path, required=True)

    args = parser.parse_args(argv)
    try:
        if args.command == "prepare":
            rows = prepare_canaries(args.live, args.canaries, args.output)
            print(f"prepared {len(rows)} fixed canaries in {args.output}")
        elif args.command == "run":
            statuses = run_variant(
                args.binary,
                args.canaries,
                args.output,
                timeout_seconds=args.timeout_seconds,
                pause_seconds=args.pause_seconds,
            )
            print(f"recorded {len(statuses)} scraper processes in {args.output}")
        else:
            rows = compare_variants(args.canaries, args.variant, args.output)
            print(f"wrote {len(rows)} comparison rows to {args.output}")
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
