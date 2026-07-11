"""Seed-based smoke checks for the public browse, search, map, and saved flows."""

from __future__ import annotations

import argparse
import csv
import re
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

try:
    from pipeline.seed_checks import load_seed_database
except ModuleNotFoundError:
    from seed_checks import load_seed_database


ROOT = Path(__file__).resolve().parents[1]
STRONG_FIELDS = ["name", "area", "subcategory_name", "category_name", "subcategories"]


@dataclass(frozen=True)
class FlowCheck:
    name: str
    passed: bool
    detail: str


def search_rows(conn, query: str) -> list[str]:
    tokens = [token.replace("%", "").replace("_", "") for token in query.split()]
    tokens = [token for token in tokens if token][:6]
    phrase = " ".join(tokens).lower()

    def run(fields: list[str]) -> list[str]:
        where = " and ".join(
            "(" + " or ".join(f"{field} like ?" for field in fields) + ")"
            for _ in tokens
        )
        binds: list[str] = []
        for token in tokens:
            binds.extend([f"%{token}%"] * len(fields))
        binds.extend(
            [phrase, f"{phrase}%", f"%{phrase}%", phrase, phrase, phrase, f"%{phrase}%"]
        )
        rows = conn.execute(
            f"""
            select slug from venues where {where}
            order by case
              when lower(name) = ? then 0
              when lower(name) like ? then 1
              when lower(name) like ? then 2
              when lower(subcategory_name) = ? then 3
              when lower(category_name) = ? then 4
              when lower(area) = ? then 5
              when lower(address) like ? then 7
              else 6
            end,
            review_count desc, rating desc, name
            """,
            binds,
        ).fetchall()
        return [row[0] for row in rows]

    strong = run(STRONG_FIELDS)
    return strong or run([*STRONG_FIELDS, "address"])


def run_customer_flow_checks(
    schema_path: Path,
    seed_path: Path,
    regression_path: Path,
) -> list[FlowCheck]:
    with tempfile.TemporaryDirectory() as tmp:
        conn = load_seed_database(schema_path, seed_path, Path(tmp) / "niklo.db")
        try:
            checks = [
                FlowCheck(
                    "venue_pages",
                    conn.execute(
                        "select count(*) from venues where trim(slug) = '' or trim(name) = ''"
                    ).fetchone()[0]
                    == 0,
                    "every listing has a stable venue route",
                ),
                FlowCheck(
                    "map",
                    conn.execute(
                        "select count(*) from venues where latitude is null or longitude is null"
                    ).fetchone()[0]
                    == 0,
                    "every listing can be placed on the map",
                ),
                FlowCheck(
                    "saved_places",
                    conn.execute(
                        "select count(*) from (select slug from venues group by slug having count(*) > 1)"
                    ).fetchone()[0]
                    == 0,
                    "saved venue slugs are unique",
                ),
                FlowCheck(
                    "browse_memberships",
                    conn.execute(
                        """
                        select count(*) from venues
                        where instr(',' || subcategories || ',', ',' || subcategory_slug || ',') = 0
                           or instr(',' || category_slugs || ',', ',' || category_slug || ',') = 0
                        """
                    ).fetchone()[0]
                    == 0,
                    "every listing is reachable from its browse category",
                ),
                FlowCheck(
                    "removed_low_review_listing",
                    conn.execute(
                        "select count(*) from venues where lower(name) = 'padel at sport on'"
                    ).fetchone()[0]
                    == 0,
                    "the five-review floor is reflected in public data",
                ),
            ]
            with regression_path.open(newline="", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    results = search_rows(conn, row["query"])
                    checks.append(
                        FlowCheck(
                            f"search:{row['query']}",
                            bool(results) and results[0] == row["expected_slug"],
                            f"expected {row['expected_slug']}, got {results[0] if results else 'no result'}",
                        )
                    )
        finally:
            conn.close()
    return checks


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema", default=str(ROOT / "infra" / "d1" / "schema.sql"))
    parser.add_argument("--seed", default=str(ROOT / "infra" / "d1" / "seed.sql"))
    parser.add_argument("--regressions", default=str(ROOT / "data" / "search_regressions.csv"))
    args = parser.parse_args(argv)
    checks = run_customer_flow_checks(Path(args.schema), Path(args.seed), Path(args.regressions))
    for check in checks:
        print(f"{'PASS' if check.passed else 'FAIL'} {check.name}: {check.detail}")
    return 1 if any(not check.passed for check in checks) else 0


if __name__ == "__main__":
    sys.exit(main())
