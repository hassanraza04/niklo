import csv
import tempfile
import unittest
from pathlib import Path

from pipeline import export_live_listings


ROOT = Path(__file__).resolve().parents[1]


class ExportLiveListingsTest(unittest.TestCase):
    def test_exports_current_seed_as_existing_listing_lock(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "live.csv"
            count = export_live_listings.export_live_listings(
                schema_path=ROOT / "infra" / "d1" / "schema.sql",
                seed_path=ROOT / "infra" / "d1" / "seed.sql",
                output_path=out,
            )

            with out.open(newline="", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))

        self.assertEqual(599, count)
        self.assertEqual(599, len(rows))
        self.assertEqual(
            [
                "venue_id",
                "slug",
                "name",
                "primary_subcategory",
                "subcategories",
                "google_url",
                "last_verified",
                "rating",
                "review_count",
                "phone",
                "website",
                "address",
                "latitude",
                "longitude",
            ],
            list(rows[0].keys()),
        )
        marksman = next(row for row in rows if row["venue_id"] == "ChIJybTEzTw7sz4RLb2PysKPyv0")
        self.assertEqual("paintball", marksman["primary_subcategory"])
        self.assertEqual("paintball,box-cricket", marksman["subcategories"])
        self.assertTrue(any(row["venue_id"] == "ChIJc_yceM04sz4R0hApZoX0c6U" for row in rows))
        self.assertTrue(any(row["venue_id"] == "ChIJLZsFFBs_sz4RHC5rG0LSakU" for row in rows))


if __name__ == "__main__":
    unittest.main()
