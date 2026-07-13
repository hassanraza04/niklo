"""Create a bounded, deterministic batch for the safe daily refresh workflow."""

from __future__ import annotations

import argparse
import csv
import math
from dataclasses import dataclass
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class DailyRefreshPlan:
    run_date: date
    live_count: int
    batch_count: int
    batch_index: int
    listings: list[dict[str, str]]


def read_live(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        return sorted(csv.DictReader(f), key=lambda row: row["venue_id"])


def build_plan(live_listings_path: Path, run_date: date, batch_size: int) -> DailyRefreshPlan:
    if batch_size < 1:
        raise ValueError("batch_size must be at least 1")
    live = read_live(live_listings_path)
    if not live:
        raise ValueError("live listings cannot be empty")
    batch_count = math.ceil(len(live) / batch_size)
    batch_index = run_date.toordinal() % batch_count
    start = batch_index * batch_size
    return DailyRefreshPlan(
        run_date=run_date,
        live_count=len(live),
        batch_count=batch_count,
        batch_index=batch_index,
        listings=live[start : start + batch_size],
    )


def search_query(listing: dict[str, str]) -> str:
    # The place id remains the safety boundary. This query is just a focused way to
    # retrieve current public Maps facts for that existing venue.
    return f'{listing["name"]}, Karachi'


def write_plan(plan: DailyRefreshPlan, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    with (output_dir / "queries.txt").open("w", encoding="utf-8") as f:
        for listing in plan.listings:
            f.write(search_query(listing) + "\n")

    with (output_dir / "batch.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["venue_id", "name", "query"])
        writer.writeheader()
        for listing in plan.listings:
            writer.writerow(
                {
                    "venue_id": listing["venue_id"],
                    "name": listing["name"],
                    "query": search_query(listing),
                }
            )

    (output_dir / "plan.md").write_text(
        "\n".join(
            [
                "# Daily Existing Listings Refresh",
                "",
                f"- Date: {plan.run_date.isoformat()}",
                f"- Live listings: {plan.live_count}",
                f"- Batch: {plan.batch_index + 1} of {plan.batch_count}",
                f"- Listings in this batch: {len(plan.listings)}",
                "",
                "This plan only queries existing listings. Any new place id returned by Maps is quarantined by the verifier.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live-listings", default=str(ROOT / "data" / "live_listings.csv"))
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--date", default=date.today().isoformat())
    parser.add_argument("--batch-size", type=int, default=50)
    args = parser.parse_args(argv)

    plan = build_plan(Path(args.live_listings), date.fromisoformat(args.date), args.batch_size)
    write_plan(plan, Path(args.output_dir))
    print(
        f"planned {len(plan.listings)} existing listings "
        f"(batch {plan.batch_index + 1}/{plan.batch_count}) -> {args.output_dir}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
