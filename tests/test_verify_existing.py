import csv
import json
import tempfile
import unittest
from pathlib import Path

from pipeline import verify_existing


class VerifyExistingTest(unittest.TestCase):
    def write_live(self, path: Path):
        with path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
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
            )
            writer.writeheader()
            writer.writerow(
                {
                    "venue_id": "known-1",
                    "slug": "known-one",
                    "name": "Known One",
                    "primary_subcategory": "padel",
                    "subcategories": "padel",
                    "google_url": "https://maps.example/known-1",
                    "last_verified": "2026-06-30T00:00:00+00:00",
                    "rating": "4.5",
                    "review_count": "10",
                    "phone": "123",
                    "website": "https://known.example",
                    "address": "A Street",
                    "latitude": "24.8",
                    "longitude": "67.0",
                }
            )
            writer.writerow(
                {
                    "venue_id": "missing-2",
                    "slug": "missing-two",
                    "name": "Missing Two",
                    "primary_subcategory": "futsal",
                    "subcategories": "futsal",
                    "google_url": "https://maps.example/missing-2",
                    "last_verified": "2026-06-30T00:00:00+00:00",
                    "rating": "4.1",
                    "review_count": "20",
                    "phone": "",
                    "website": "",
                    "address": "B Street",
                    "latitude": "24.9",
                    "longitude": "67.1",
                }
            )

    def test_routine_verification_ignores_new_place_ids(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            live = base / "live.csv"
            scrape_dir = base / "scrape"
            scrape_dir.mkdir()
            output_dir = base / "run"
            self.write_live(live)

            rows = [
                {
                    "place_id": "known-1",
                    "title": "Known One",
                    "review_rating": 4.6,
                    "review_count": 12,
                    "phone": "123",
                    "web_site": "https://known.example",
                    "address": "A Street",
                    "latitude": 24.8,
                    "longitude": 67.0,
                    "status": "Open",
                    "link": "https://maps.example/known-1",
                },
                {
                    "place_id": "new-3",
                    "title": "New Three",
                    "review_rating": 4.9,
                    "review_count": 99,
                },
            ]
            with (scrape_dir / "sample.json").open("w", encoding="utf-8") as f:
                for row in rows:
                    f.write(json.dumps(row) + "\n")

            summary = verify_existing.run_verification(
                live_listings_path=live,
                scrape_dir=scrape_dir,
                output_dir=output_dir,
            )

            self.assertEqual(2, summary.live_count)
            self.assertEqual(1, summary.refreshed_count)
            self.assertEqual(1, summary.ignored_new_count)
            self.assertEqual(1, summary.missing_count)
            self.assertEqual(0, summary.invalid_popularity_count)

            with (output_dir / "ignored_new_place_ids.csv").open(newline="", encoding="utf-8") as f:
                ignored = list(csv.DictReader(f))
            self.assertEqual("new-3", ignored[0]["place_id"])

            known_lines = (output_dir / "refreshed_known_rows.ndjson").read_text().strip().splitlines()
            self.assertEqual(1, len(known_lines))
            self.assertEqual("known-1", json.loads(known_lines[0])["place_id"])

    def test_invalid_popularity_is_named_in_the_verification_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            live = base / "live.csv"
            scrape_dir = base / "scrape"
            scrape_dir.mkdir()
            output_dir = base / "run"
            self.write_live(live)
            (scrape_dir / "sample.json").write_text(
                json.dumps(
                    {
                        "place_id": "known-1",
                        "title": "Known One",
                        "review_rating": 0,
                        "review_count": 0,
                        "link": "https://maps.example/known-1/fresh",
                    }
                )
                + "\n",
                encoding="utf-8",
            )

            summary = verify_existing.run_verification(live, scrape_dir, output_dir)

            self.assertEqual(1, summary.invalid_popularity_count)
            with (output_dir / "invalid_popularity_records.csv").open(newline="", encoding="utf-8") as f:
                invalid = list(csv.DictReader(f))
            self.assertEqual("known-1", invalid[0]["venue_id"])
            self.assertEqual("0", invalid[0]["review_count"])


if __name__ == "__main__":
    unittest.main()
