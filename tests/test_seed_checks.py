import csv
import tempfile
import unittest
from pathlib import Path

from pipeline import seed_checks


ROOT = Path(__file__).resolve().parents[1]


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
                    min_venues=590,
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

    def test_curated_photo_sources_are_valid_and_cached(self):
        curated_path = ROOT / "pipeline" / "transform" / "seeds" / "curated_venues.csv"
        photo_sources_path = ROOT / "pipeline" / "transform" / "seeds" / "curated_photo_sources.csv"

        with curated_path.open(newline="", encoding="utf-8") as f:
            curated_rows = list(csv.DictReader(f))
        with photo_sources_path.open(newline="", encoding="utf-8") as f:
            photo_rows = list(csv.DictReader(f))

        self.assertTrue(curated_rows)
        self.assertTrue(photo_rows)
        self.assertTrue(all(None not in row for row in curated_rows))
        self.assertTrue(all(None not in row for row in photo_rows))
        curated_ids = {row["venue_id"] for row in curated_rows}

        with tempfile.TemporaryDirectory() as tmp:
            conn = seed_checks.load_seed_database(
                ROOT / "infra" / "d1" / "schema.sql",
                ROOT / "infra" / "d1" / "seed.sql",
                Path(tmp) / "niklo.db",
            )
            try:
                for row in photo_rows:
                    self.assertIn(row["venue_id"], curated_ids)
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
