"""Pre-deploy checks for the generated D1 seed.

This script loads `infra/d1/schema.sql` and `infra/d1/seed.sql` into a temporary
SQLite database, then checks the invariants the public site relies on.
"""

from __future__ import annotations

import json
import sqlite3
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class CheckResult:
    name: str
    passed: bool
    detail: str


def load_seed_database(schema_path: Path, seed_path: Path, db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.executescript(schema_path.read_text(encoding="utf-8"))
    conn.executescript(seed_path.read_text(encoding="utf-8"))
    return conn


def scalar(conn: sqlite3.Connection, sql: str) -> int:
    row = conn.execute(sql).fetchone()
    return int(row[0] if row else 0)


def taxonomy_slugs(taxonomy_path: Path) -> tuple[set[str], set[str]]:
    raw = json.loads(taxonomy_path.read_text(encoding="utf-8"))
    category_slugs: set[str] = set()
    subcategory_slugs: set[str] = set()
    for category in raw.get("categories", []):
        if category.get("slug"):
            category_slugs.add(category["slug"])
        for subcategory in category.get("subcategories", []):
            if subcategory.get("slug"):
                subcategory_slugs.add(subcategory["slug"])
    return category_slugs, subcategory_slugs


def csv_tokens(value: str | None) -> list[str]:
    return [token.strip() for token in (value or "").split(",") if token.strip()]


def check_required(conn: sqlite3.Connection, column: str) -> CheckResult:
    count = scalar(
        conn,
        f"select count(*) from venues where {column} is null or trim(cast({column} as text)) = ''",
    )
    return CheckResult(
        name=f"required_{column}",
        passed=count == 0,
        detail=f"{count} venues missing {column}",
    )


def run_checks(
    conn: sqlite3.Connection,
    taxonomy_path: Path,
    photo_root: Path,
    min_venues: int = 440,
) -> list[CheckResult]:
    results: list[CheckResult] = []
    venue_count = scalar(conn, "select count(*) from venues")
    results.append(
        CheckResult("venue_count", venue_count >= min_venues, f"{venue_count} venues")
    )

    for column in [
        "venue_id",
        "name",
        "slug",
        "subcategory_slug",
        "category_slug",
        "subcategories",
        "category_slugs",
        "google_url",
        "last_verified",
    ]:
        results.append(check_required(conn, column))

    duplicate_slugs = scalar(
        conn,
        "select count(*) from (select slug from venues group by slug having count(*) > 1)",
    )
    results.append(
        CheckResult("unique_slug", duplicate_slugs == 0, f"{duplicate_slugs} duplicate slugs")
    )

    duplicate_ids = scalar(
        conn,
        "select count(*) from (select venue_id from venues group by venue_id having count(*) > 1)",
    )
    results.append(
        CheckResult("unique_venue_id", duplicate_ids == 0, f"{duplicate_ids} duplicate venue ids")
    )

    missing_geo = scalar(
        conn,
        "select count(*) from venues where latitude is null or longitude is null",
    )
    results.append(CheckResult("coordinates", missing_geo == 0, f"{missing_geo} missing geo"))

    bad_reviews = scalar(
        conn,
        "select count(*) from venues where rating is null or review_count is null or review_count < 5",
    )
    results.append(
        CheckResult("ratings_reviews", bad_reviews == 0, f"{bad_reviews} bad rating rows")
    )

    category_slugs, subcategory_slugs = taxonomy_slugs(taxonomy_path)
    unknown_subcategories: set[str] = set()
    unknown_categories: set[str] = set()
    for sub_csv, cat_csv in conn.execute("select subcategories, category_slugs from venues"):
        unknown_subcategories.update(set(csv_tokens(sub_csv)) - subcategory_slugs)
        unknown_categories.update(set(csv_tokens(cat_csv)) - category_slugs)
    results.append(
        CheckResult(
            "taxonomy_subcategories",
            not unknown_subcategories,
            ", ".join(sorted(unknown_subcategories)) or "all subcategories known",
        )
    )
    results.append(
        CheckResult(
            "taxonomy_categories",
            not unknown_categories,
            ", ".join(sorted(unknown_categories)) or "all categories known",
        )
    )

    managed_prefix = "/venues/"
    bad_photo_urls = 0
    missing_photos = 0
    external_gallery_urls = 0
    for photo_url, photos in conn.execute("select photo_url, photos from venues"):
        if photo_url:
            if str(photo_url).startswith("/venues/"):
                rel = str(photo_url).lstrip("/")
                if not (photo_root / rel).exists():
                    missing_photos += 1
            elif not str(photo_url).startswith(managed_prefix):
                bad_photo_urls += 1
        if "http://" in (photos or "") or "https://" in (photos or ""):
            external_gallery_urls += 1
    results.append(
        CheckResult(
            "local_photos",
            missing_photos == 0,
            f"{missing_photos} local photo files missing",
        )
    )
    results.append(
        CheckResult(
            "managed_photo_urls",
            bad_photo_urls == 0 and external_gallery_urls == 0,
            f"{bad_photo_urls} external primary URLs, {external_gallery_urls} external gallery URLs",
        )
    )

    return results


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        conn = load_seed_database(
            ROOT / "infra" / "d1" / "schema.sql",
            ROOT / "infra" / "d1" / "seed.sql",
            Path(tmp) / "niklo.db",
        )
        try:
            results = run_checks(
                conn=conn,
                taxonomy_path=ROOT / "web" / "lib" / "taxonomy.json",
                photo_root=ROOT / "web" / "public",
            )
        finally:
            conn.close()

    failed = [result for result in results if not result.passed]
    for result in results:
        mark = "PASS" if result.passed else "FAIL"
        print(f"{mark} {result.name}: {result.detail}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
