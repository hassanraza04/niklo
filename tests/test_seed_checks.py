import csv
import tempfile
import unittest
from pathlib import Path

from pipeline import seed_checks


ROOT = Path(__file__).resolve().parents[1]
DUPLICATE_VENUE_IDS = {
    "ChIJTdD8UAA_sz4R96iyu0uEQxY",  # Padel at Maidan
    "ChIJd1hlEwA_sz4RPTu1_cUSYmY",  # United Padel Academy at Champions Club
    "ChIJGThrdgA9sz4R3YMaY2SMnoc",  # Padel at Legends
    "ChIJzTTvBwA9sz4RSszn9rr7Hq0",  # Padel at Ignite
    "ChIJ6wiHVgA_sz4RkEplmgF8uD0",  # Padel at Premier Club
}
CLEANUP_REMOVAL_IDS = {
    "ChIJm86Lvts-sz4ReuaAoVjF4qk",  # AKUH Sports Complex
    "ChIJ07s6bDPyXmoR-9HiDmdD8Ko",  # Silk Arena
    "ChIJ8zo5t9o-sz4R28CSqn_xHVU",  # Aga Khan Sports and Rehabilitation Centre
    "ChIJ6eYnPws-sz4RDVewUbvhhRA",  # NAPA Hindu Gymkhana Building
    "ChIJC-f0InU_sz4RRaC9EGWWYr4",  # Kashmir sports Complex
}
CLEANUP_MEMBERSHIPS = {
    "ChIJN3aGHwA_sz4RJGfeyavNsOs": "padel",  # Padel at JKC
    "ChIJ7XPvCQA_sz4RAotqaTRB3GY": "padel",  # Power padel arena
    "ChIJ6er1u_Q-sz4RMFo272tdDTc": "tennis,skating,swimming",  # Karachi Sports Complex
    "ChIJJVijrUM_sz4RioywLBqHK4o": "waterparks",  # Aquatic Adventureland
    "ChIJ_8SHnl86sz4RXmPa0OAzKlw": "parks",  # Model Family Park Korangi 5
}
APPROVED_WATERPARK_IDS = {
    "ChIJZUmDF-VIsz4RWyxdHJ3aUyE",  # Wild Venture Water Park
    "ChIJJVijrUM_sz4RioywLBqHK4o",  # Aquatic Adventureland
    "ChIJd0OQyja1TDkRgQIDyvP4wsg",  # The Great Fiesta
    "ChIJHYxbRttHsz4R-41FGsnmZPM",  # Al Mehran Water Park
    "ChIJ_an4YA02sz4RJshJzOK26Zs",  # Picnic World Water Park
    "ChIJLRmR0lVPsz4RVscYrkU0vLA",  # Cosy Water Park
    "ChIJiXWgBQA3sz4Rxbg-AAYMZfI",  # Water World Water Park
    "ChIJY-1omhlGsz4Rnl-l9BzDOVw",  # Sun Rise Water Park
    "ChIJETewpq3QTDkRfJGdL9YnkMU",  # Paradise Island Water Park Gharo
    "ChIJO_Xoa2JPsz4RnowXIK0GTxw",  # Cheeku Water Park
    "ChIJ47oyLQBBsz4RjRUsJbfKLOk",  # Dreamers Arena Aqua Water Park
    "ChIJzWP8uF9Psz4Rn6YJSCHqK_c",  # Samzu Park
    "ChIJaxk2tGo2sz4RsE5nT70iqjs",  # KITRAWP
}
TDF_GHAR_ID = "ChIJj_X1Z1w-sz4ReCUDgrzrY9M"


class SeedChecksTest(unittest.TestCase):
    def test_current_seed_passes_production_guardrails(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "niklo.db"
            conn = seed_checks.load_seed_database(
                ROOT / "infra" / "d1" / "schema.sql",
                ROOT / "infra" / "d1" / "seed.sql",
                db_path,
            )
            try:
                results = seed_checks.run_checks(
                    conn=conn,
                    taxonomy_path=ROOT / "web" / "lib" / "taxonomy.json",
                    photo_root=ROOT / "web" / "public",
                    min_venues=440,
                )
            finally:
                conn.close()

        failures = [r for r in results if not r.passed]
        self.assertEqual([], failures)

    def test_missing_required_field_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "niklo.db"
            conn = seed_checks.load_seed_database(
                ROOT / "infra" / "d1" / "schema.sql",
                ROOT / "infra" / "d1" / "seed.sql",
                db_path,
            )
            try:
                conn.execute(
                    "update venues set google_url = null "
                    "where venue_id = (select venue_id from venues limit 1)"
                )
                results = seed_checks.run_checks(
                    conn=conn,
                    taxonomy_path=ROOT / "web" / "lib" / "taxonomy.json",
                    photo_root=ROOT / "web" / "public",
                    min_venues=600,
                )
            finally:
                conn.close()

        failures = {r.name: r for r in results if not r.passed}
        self.assertIn("required_google_url", failures)

    def test_known_duplicate_venues_are_not_public(self):
        with tempfile.TemporaryDirectory() as tmp:
            conn = seed_checks.load_seed_database(
                ROOT / "infra" / "d1" / "schema.sql",
                ROOT / "infra" / "d1" / "seed.sql",
                Path(tmp) / "niklo.db",
            )
            try:
                rows = conn.execute(
                    "select venue_id from venues where venue_id in (?, ?, ?, ?, ?)",
                    tuple(DUPLICATE_VENUE_IDS),
                ).fetchall()
            finally:
                conn.close()

        self.assertEqual([], rows)

    def test_requested_listing_cleanup_is_publicly_applied(self):
        with tempfile.TemporaryDirectory() as tmp:
            conn = seed_checks.load_seed_database(
                ROOT / "infra" / "d1" / "schema.sql",
                ROOT / "infra" / "d1" / "seed.sql",
                Path(tmp) / "niklo.db",
            )
            try:
                removed = conn.execute(
                    "select venue_id from venues where venue_id in (?, ?, ?, ?, ?)",
                    tuple(CLEANUP_REMOVAL_IDS),
                ).fetchall()
                rows = conn.execute(
                    "select venue_id, subcategory_slug, subcategories from venues "
                    "where venue_id in (?, ?, ?, ?, ?)",
                    tuple(CLEANUP_MEMBERSHIPS),
                ).fetchall()
            finally:
                conn.close()

        self.assertEqual([], removed)
        self.assertEqual(
            CLEANUP_MEMBERSHIPS,
            {venue_id: subcategories for venue_id, _, subcategories in rows},
        )
        self.assertTrue(
            all(subcategory == memberships.split(",")[0] for _, subcategory, memberships in rows)
        )

    def test_retired_categories_are_not_public(self):
        taxonomy_path = ROOT / "web" / "lib" / "taxonomy.json"
        with taxonomy_path.open(encoding="utf-8") as f:
            taxonomy = __import__("json").load(f)

        category_slugs = {category["slug"] for category in taxonomy["categories"]}
        subcategory_slugs = {
            subcategory["slug"]
            for category in taxonomy["categories"]
            for subcategory in category["subcategories"]
        }
        self.assertNotIn("creative-chill", category_slugs)
        self.assertFalse({"mini-golf", "theme-parks"} & subcategory_slugs)

        with tempfile.TemporaryDirectory() as tmp:
            conn = seed_checks.load_seed_database(
                ROOT / "infra" / "d1" / "schema.sql",
                ROOT / "infra" / "d1" / "seed.sql",
                Path(tmp) / "niklo.db",
            )
            try:
                retired = conn.execute(
                    "select count(*) from venues where category_slugs like '%creative-chill%' "
                    "or subcategories like '%mini-golf%' or subcategories like '%theme-parks%'"
                ).fetchone()[0]
                escapistan = conn.execute(
                    "select subcategories from venues where venue_id = ?",
                    ("ChIJYcZDKeo9sz4RIfLBHjn16dM",),
                ).fetchone()
            finally:
                conn.close()

        self.assertEqual(0, retired)
        self.assertEqual(("escape-rooms",), escapistan)

    def test_approved_waterparks_and_tdf_ghar_are_public(self):
        with tempfile.TemporaryDirectory() as tmp:
            conn = seed_checks.load_seed_database(
                ROOT / "infra" / "d1" / "schema.sql",
                ROOT / "infra" / "d1" / "seed.sql",
                Path(tmp) / "niklo.db",
            )
            try:
                waterpark_rows = conn.execute(
                    "select venue_id, subcategories from venues where venue_id in ({})".format(
                        ", ".join("?" for _ in APPROVED_WATERPARK_IDS)
                    ),
                    tuple(APPROVED_WATERPARK_IDS),
                ).fetchall()
                tdf = conn.execute(
                    "select subcategories from venues where venue_id = ?", (TDF_GHAR_ID,)
                ).fetchone()
            finally:
                conn.close()

        self.assertEqual(
            APPROVED_WATERPARK_IDS,
            {venue_id for venue_id, subcategories in waterpark_rows if subcategories == "waterparks"},
        )
        self.assertEqual(("heritage",), tdf)

    def test_curated_venues_cannot_be_reexcluded(self):
        curated_path = ROOT / "pipeline" / "transform" / "seeds" / "curated_venues.csv"
        excluded_path = ROOT / "pipeline" / "transform" / "seeds" / "excluded_venues.csv"
        model_path = ROOT / "pipeline" / "transform" / "models" / "marts" / "dim_venue.sql"

        with curated_path.open(newline="", encoding="utf-8") as f:
            curated_ids = {row["venue_id"] for row in csv.DictReader(f)}
        with excluded_path.open(newline="", encoding="utf-8") as f:
            excluded_ids = {row["venue_id"] for row in csv.DictReader(f)}

        self.assertTrue(curated_ids)
        self.assertFalse(curated_ids & excluded_ids)
        self.assertIn("from {{ ref('curated_venues') }}", model_path.read_text(encoding="utf-8"))

    def test_photo_source_overrides_are_valid_and_cached(self):
        photo_sources_path = ROOT / "pipeline" / "transform" / "seeds" / "photo_source_overrides.csv"

        with photo_sources_path.open(newline="", encoding="utf-8") as f:
            photo_rows = list(csv.DictReader(f))

        self.assertTrue(photo_rows)
        self.assertTrue(all(None not in row for row in photo_rows))

        with tempfile.TemporaryDirectory() as tmp:
            conn = seed_checks.load_seed_database(
                ROOT / "infra" / "d1" / "schema.sql",
                ROOT / "infra" / "d1" / "seed.sql",
                Path(tmp) / "niklo.db",
            )
            try:
                for row in photo_rows:
                    self.assertTrue(row["photo_source_url"].startswith("https://"))
                    (photo_url,) = conn.execute(
                        "select photo_url from venues where venue_id = ?", (row["venue_id"],)
                    ).fetchone()
                    self.assertTrue(photo_url and photo_url.startswith("/venues/"))
                    self.assertTrue((ROOT / "web" / "public" / photo_url.lstrip("/")).exists())
            finally:
                conn.close()


if __name__ == "__main__":
    unittest.main()
