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
                    min_venues=600,
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


if __name__ == "__main__":
    unittest.main()
