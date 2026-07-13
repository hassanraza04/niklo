import csv
import json
import tempfile
import unittest
from pathlib import Path

from pipeline import apply_daily_updates
from pipeline.export_to_d1 import COLUMNS, write_seed
from pipeline.seed_checks import load_seed_database


class ApplyDailyUpdatesTest(unittest.TestCase):
    def venue_row(self, venue_id: str, name: str) -> list:
        values = {
            "venue_id": venue_id,
            "name": name,
            "slug": venue_id,
            "subcategory_slug": "padel",
            "subcategory_name": "Padel",
            "category_slug": "sports-active",
            "category_name": "Sports & Active",
            "subcategories": "padel",
            "category_slugs": "sports-active",
            "google_category": "Padel court",
            "rating": 4.5,
            "review_count": 10,
            "latitude": 24.8,
            "longitude": 67.0,
            "area": "Clifton",
            "address": "Old address",
            "city": "Karachi",
            "website": "https://old.example",
            "phone": "+92 300 0000000",
            "hours": '{"Monday":["9 AM-5 PM"]}',
            "google_url": "https://maps.example/known-1",
            "status": "Open",
            "is_open": 1,
            "source_query": "padel karachi",
            "last_verified": "2026-06-30T00:00:00+05:00",
        }
        return [values.get(column) for column in COLUMNS]

    def test_daily_updates_apply_safe_fields_and_hold_risky_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            schema = root / "schema.sql"
            seed = root / "seed.sql"
            refreshed = root / "refreshed.ndjson"
            report = root / "report"
            live = root / "live.csv"
            schema.write_text(
                (Path(__file__).resolve().parents[1] / "infra" / "d1" / "schema.sql").read_text(),
                encoding="utf-8",
            )
            write_seed([self.venue_row("known-1", "Known One")], str(seed))
            refreshed.write_text(
                "\n".join(
                    json.dumps(row)
                    for row in [
                        {
                            "place_id": "known-1",
                            "title": "Renamed One",
                            "review_rating": 4.8,
                            "review_count": 125,
                            "phone": "+92 300 1111111",
                            "web_site": "https://new.example",
                            "open_hours": {"Monday": ["10 AM-6 PM"]},
                            "address": "New address",
                            "latitude": 24.9,
                            "longitude": 67.1,
                            "status": "Permanently closed",
                            "_loaded_at": "2026-07-13T10:00:00+05:00",
                        },
                        {
                            "place_id": "new-2",
                            "title": "New Listing",
                            "review_rating": 4.9,
                            "review_count": 99,
                        },
                    ]
                )
                + "\n",
                encoding="utf-8",
            )

            summary = apply_daily_updates.apply_daily_updates(
                schema_path=schema,
                seed_path=seed,
                refreshed_path=refreshed,
                output_dir=report,
                live_listings_path=live,
                checked_at="2026-07-13T12:00:00+05:00",
            )

            conn = load_seed_database(schema, seed, root / "niklo.db")
            try:
                row = conn.execute(
                    "select name, rating, review_count, phone, website, hours, address, latitude, longitude, "
                    "status, is_open, last_verified from venues where venue_id = 'known-1'"
                ).fetchone()
                count = conn.execute("select count(*) from venues").fetchone()[0]
            finally:
                conn.close()

            self.assertEqual(1, summary.refreshed_count)
            self.assertEqual(1, summary.ignored_non_live_count)
            self.assertEqual(6, summary.applied_field_count)
            self.assertEqual(5, summary.review_field_count)
            self.assertEqual(1, count)
            self.assertEqual(
                (
                    "Known One",
                    4.8,
                    125,
                    "+92 300 1111111",
                    "https://new.example",
                    '{"Monday":["10 AM-6 PM"]}',
                    "Old address",
                    24.8,
                    67.0,
                    "Open",
                    1,
                    "2026-07-13T10:00:00+05:00",
                ),
                row,
            )

            with (report / "applied_safe_updates.csv").open(newline="", encoding="utf-8") as f:
                applied = list(csv.DictReader(f))
            self.assertEqual(
                {"rating", "review_count", "phone", "website", "hours", "last_verified"},
                {row["field"] for row in applied},
            )
            with (report / "pending_review_changes.csv").open(newline="", encoding="utf-8") as f:
                review = list(csv.DictReader(f))
            self.assertEqual(
                {"name", "address", "latitude", "longitude", "status"},
                {row["field"] for row in review},
            )
            with live.open(newline="", encoding="utf-8") as f:
                live_rows = list(csv.DictReader(f))
            self.assertEqual("4.8", live_rows[0]["rating"])
            self.assertEqual("2026-07-13T10:00:00+05:00", live_rows[0]["last_verified"])


if __name__ == "__main__":
    unittest.main()
