"""Apply safe daily facts to existing public listings.

The verifier is the gatekeeper. This module only consumes its known-place output,
so a fresh Maps result can never create a new public listing.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

try:
    from pipeline.export_catalog import export_catalog
    from pipeline.export_live_listings import export_live_listings
    from pipeline.export_to_d1 import COLUMNS, write_seed
    from pipeline.seed_checks import load_seed_database
except ModuleNotFoundError:
    from export_catalog import export_catalog
    from export_live_listings import export_live_listings
    from export_to_d1 import COLUMNS, write_seed
    from seed_checks import load_seed_database


ROOT = Path(__file__).resolve().parents[1]
WEEKDAYS = frozenset(
    {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}
)


@dataclass(frozen=True)
class DailyUpdateSummary:
    refreshed_count: int
    ignored_non_live_count: int
    applied_field_count: int
    review_field_count: int


def read_refreshed(path: Path) -> list[dict]:
    rows: dict[str, dict] = {}
    with path.open(encoding="utf-8") as f:
        for line_number, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{line_number}: invalid json") from exc
            place_id = text(row.get("place_id"))
            if place_id:
                rows[place_id] = row
    return [rows[place_id] for place_id in sorted(rows)]


def text(value: object) -> str:
    return str(value).strip() if value is not None else ""


def optional_rating(value: object) -> float | None:
    try:
        rating = float(value)
    except (TypeError, ValueError):
        return None
    return rating if 0 < rating <= 5 else None


def optional_review_count(value: object) -> int | None:
    try:
        count = int(value)
    except (TypeError, ValueError):
        return None
    return count if count >= 5 else None


def optional_coordinate(value: object) -> float | None:
    try:
        coordinate = float(value)
    except (TypeError, ValueError):
        return None
    return coordinate if -180 <= coordinate <= 180 else None


def optional_url(value: object) -> str | None:
    candidate = text(value)
    parsed = urlparse(candidate)
    return candidate if parsed.scheme in {"http", "https"} and parsed.netloc else None


def optional_hours(value: object) -> str | None:
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    candidate = text(value)
    if not candidate:
        return None
    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError:
        return None
    return json.dumps(parsed, ensure_ascii=False, separators=(",", ":")) if isinstance(parsed, (dict, list)) else None


def complete_week_hours(value: object) -> str | None:
    serialized = optional_hours(value)
    if serialized is None:
        return None
    parsed = json.loads(serialized)
    if not isinstance(parsed, dict) or set(parsed) != WEEKDAYS:
        return None
    if any(
        not isinstance(slots, list)
        or not slots
        or any(not isinstance(slot, str) or not slot.strip() for slot in slots)
        for slots in parsed.values()
    ):
        return None
    return json.dumps(parsed, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def normalized_hours(value: object) -> dict[str, list[str]] | None:
    serialized = optional_hours(value)
    if serialized is None:
        return None
    parsed = json.loads(serialized)
    if not isinstance(parsed, dict):
        return None

    normalized: dict[str, list[str]] = {}
    for day, slots in parsed.items():
        if not isinstance(day, str) or not isinstance(slots, list):
            return None
        normalized_slots: list[str] = []
        for slot in slots:
            if not isinstance(slot, str):
                return None
            label = unicodedata.normalize("NFKC", slot)
            label = re.sub(r"\s+", " ", label).strip().casefold()
            normalized_slots.append(re.sub(r"\s*(?:to|[-–—])\s*", "-", label))
        normalized[day] = normalized_slots
    return normalized


def hours_equivalent(current: object, refreshed: object) -> bool:
    current_hours = normalized_hours(current)
    refreshed_hours = normalized_hours(refreshed)
    return current_hours is not None and current_hours == refreshed_hours


def source_checked_at(row: dict, fallback: str) -> str:
    candidate = text(row.get("_loaded_at"))
    if not candidate:
        return fallback
    try:
        datetime.fromisoformat(candidate.replace("Z", "+00:00"))
    except ValueError:
        return fallback
    return candidate


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, object]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def record_change(
    changes: list[dict[str, object]],
    venue_id: str,
    field: str,
    old_value: object,
    new_value: object,
) -> None:
    changes.append(
        {
            "venue_id": venue_id,
            "field": field,
            "old_value": "" if old_value is None else old_value,
            "new_value": "" if new_value is None else new_value,
        }
    )


def apply_daily_updates(
    schema_path: Path,
    seed_path: Path,
    refreshed_path: Path,
    output_dir: Path,
    live_listings_path: Path,
    checked_at: str,
) -> DailyUpdateSummary:
    output_dir.mkdir(parents=True, exist_ok=True)
    conn = load_seed_database(schema_path, seed_path, output_dir / "daily-update.db")
    try:
        rows = [list(row) for row in conn.execute(f"select {', '.join(COLUMNS)} from venues").fetchall()]
    finally:
        conn.close()

    indexes = {column: index for index, column in enumerate(COLUMNS)}
    rows_by_id = {row[indexes["venue_id"]]: row for row in rows}
    applied: list[dict[str, object]] = []
    pending_review: list[dict[str, object]] = []
    ignored_non_live: list[dict[str, object]] = []
    refreshed_count = 0

    for fresh in read_refreshed(refreshed_path):
        venue_id = text(fresh.get("place_id"))
        current = rows_by_id.get(venue_id)
        if current is None:
            ignored_non_live.append(
                {"place_id": venue_id, "name": text(fresh.get("title") or fresh.get("name"))}
            )
            continue

        refreshed_count += 1
        refreshed_rating = optional_rating(fresh.get("review_rating"))
        refreshed_review_count = optional_review_count(fresh.get("review_count"))
        if refreshed_rating is not None and refreshed_review_count is not None:
            safe_values = {
                "rating": refreshed_rating,
                "review_count": refreshed_review_count,
                "phone": text(fresh.get("phone")) or None,
                "website": optional_url(fresh.get("web_site")),
                # A listing is verified only when Maps returned a usable
                # popularity pair for the exact place.
                "last_verified": source_checked_at(fresh, checked_at),
            }
        elif fresh.get("review_rating") is not None or fresh.get("review_count") is not None:
            safe_values = {}
            record_change(
                pending_review,
                venue_id,
                "popularity",
                f"rating={current[indexes['rating']]}; review_count={current[indexes['review_count']]}",
                f"rating={text(fresh.get('review_rating'))}; review_count={text(fresh.get('review_count'))}",
            )
        else:
            safe_values = {}

        reported_hours = optional_hours(fresh.get("open_hours"))
        refreshed_hours = complete_week_hours(fresh.get("open_hours"))
        current_hours = optional_hours(current[indexes["hours"]])
        if refreshed_hours is not None and safe_values:
            safe_values["hours"] = refreshed_hours
        elif reported_hours is not None and not hours_equivalent(current_hours, reported_hours):
            record_change(
                pending_review,
                venue_id,
                "hours",
                current[indexes["hours"]],
                reported_hours,
            )

        for field, new_value in safe_values.items():
            if new_value is None:
                continue
            index = indexes[field]
            is_unchanged_hours = field == "hours" and hours_equivalent(current[index], new_value)
            if current[index] != new_value and not is_unchanged_hours:
                record_change(applied, venue_id, field, current[index], new_value)
                current[index] = new_value

        risky_values = {
            "name": text(fresh.get("title") or fresh.get("name")) or None,
            "address": text(fresh.get("address")) or None,
            "latitude": optional_coordinate(fresh.get("latitude")),
            "longitude": optional_coordinate(fresh.get("longitude")),
            "google_category": text(fresh.get("category")) or None,
            "status": text(fresh.get("status")) or None,
        }
        for field, new_value in risky_values.items():
            if new_value is None:
                continue
            old_value = current[indexes[field]]
            if old_value != new_value:
                record_change(pending_review, venue_id, field, old_value, new_value)

    write_seed(rows, str(seed_path))
    export_live_listings(schema_path, seed_path, live_listings_path)
    if seed_path.resolve() == (ROOT / "infra" / "d1" / "seed.sql").resolve():
        export_catalog(
            schema_path,
            seed_path,
            ROOT / "web" / "data" / "catalog.json",
            ROOT / "web" / "public" / "catalog-client.json",
        )
    write_csv(
        output_dir / "applied_safe_updates.csv",
        ["venue_id", "field", "old_value", "new_value"],
        applied,
    )
    write_csv(
        output_dir / "pending_review_changes.csv",
        ["venue_id", "field", "old_value", "new_value"],
        pending_review,
    )
    write_csv(
        output_dir / "ignored_non_live_place_ids.csv",
        ["place_id", "name"],
        ignored_non_live,
    )

    summary = DailyUpdateSummary(
        refreshed_count=refreshed_count,
        ignored_non_live_count=len(ignored_non_live),
        applied_field_count=len(applied),
        review_field_count=len(pending_review),
    )
    (output_dir / "applied_summary.md").write_text(
        "\n".join(
            [
                "# Daily Existing Listing Updates",
                "",
                f"- Matched existing listings: {summary.refreshed_count}",
                f"- Safe fields applied: {summary.applied_field_count}",
                f"- Changes held for review: {summary.review_field_count}",
                f"- Non-live place ids ignored: {summary.ignored_non_live_count}",
                "",
                "Only matched existing place ids can update the public seed.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    return summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema", default=str(ROOT / "infra" / "d1" / "schema.sql"))
    parser.add_argument("--seed", default=str(ROOT / "infra" / "d1" / "seed.sql"))
    parser.add_argument("--refreshed", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--live-listings", default=str(ROOT / "data" / "live_listings.csv"))
    parser.add_argument("--checked-at", default=datetime.now().astimezone().isoformat(timespec="seconds"))
    args = parser.parse_args(argv)

    summary = apply_daily_updates(
        schema_path=Path(args.schema),
        seed_path=Path(args.seed),
        refreshed_path=Path(args.refreshed),
        output_dir=Path(args.output_dir),
        live_listings_path=Path(args.live_listings),
        checked_at=args.checked_at,
    )
    print(
        f"updated={summary.applied_field_count} review={summary.review_field_count} "
        f"matched={summary.refreshed_count} ignored={summary.ignored_non_live_count}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
