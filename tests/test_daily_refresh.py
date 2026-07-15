import csv
import tempfile
import unittest
from datetime import date
from pathlib import Path

from pipeline import plan_daily_refresh


class DailyRefreshPlanTest(unittest.TestCase):
    def write_live(self, path: Path) -> None:
        with path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["venue_id", "name", "google_url"])
            writer.writeheader()
            for venue_id, name in [("c", "Third"), ("a", "First"), ("b", "Second")]:
                writer.writerow(
                    {
                        "venue_id": venue_id,
                        "name": name,
                        "google_url": f"https://www.google.com/maps/place/{name}",
                    }
                )

    def test_daily_plan_rotates_only_existing_listings(self):
        with tempfile.TemporaryDirectory() as tmp:
            live = Path(tmp) / "live.csv"
            self.write_live(live)
            plan = plan_daily_refresh.build_plan(live, date(2026, 7, 11), batch_size=2)

        self.assertEqual(3, plan.live_count)
        self.assertEqual(2, plan.batch_count)
        self.assertEqual(["a", "b"], [row["venue_id"] for row in plan.listings])

    def test_daily_plan_uses_each_listing_canonical_maps_url(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            live = base / "live.csv"
            out = base / "plan"
            self.write_live(live)
            plan = plan_daily_refresh.build_plan(live, date(2026, 7, 11), batch_size=2)
            plan_daily_refresh.write_plan(plan, out)

            queries = (out / "queries.txt").read_text(encoding="utf-8").splitlines()
            with (out / "batch.csv").open(newline="", encoding="utf-8") as f:
                batch = list(csv.DictReader(f))

        self.assertEqual(
            [
                "https://www.google.com/maps/place/First",
                "https://www.google.com/maps/place/Second",
            ],
            queries,
        )
        self.assertEqual(["a", "b"], [row["venue_id"] for row in batch])

    def test_daily_plan_rejects_a_listing_without_a_canonical_maps_url(self):
        with self.assertRaisesRegex(ValueError, "missing google_url"):
            plan_daily_refresh.maps_lookup({"venue_id": "known-1", "name": "Known"})

    def test_scheduled_workflow_runs_safe_refresh_and_keeps_review_artifacts(self):
        workflow = (
            Path(__file__).resolve().parents[1] / ".github" / "workflows" / "daily-refresh.yml"
        )
        text = workflow.read_text(encoding="utf-8")

        self.assertIn("schedule:", text)
        self.assertIn("pipeline/daily_refresh.sh", text)
        self.assertIn("actions/upload-artifact", text)
        self.assertIn("contents: write", text)
        self.assertIn('DAILY_BATCH_SIZE: "15"', text)
        self.assertIn('PAUSE_MIN: "15"', text)
        self.assertIn('PAUSE_MAX: "30"', text)
        self.assertIn('DEPTH: "1"', text)
        self.assertIn('QUERY_TIMEOUT_SECONDS: "120"', text)
        self.assertIn("./scraper/install_maps_scraper.sh", text)

    def test_daily_refresh_rejects_an_empty_scrape(self):
        script = Path(__file__).resolve().parents[1] / "pipeline" / "daily_refresh.sh"
        text = script.read_text(encoding="utf-8")

        self.assertIn('MIN_RAW_ROWS="${MIN_RAW_ROWS:-1}"', text)
        self.assertIn("scrape returned $RAW_ROWS raw rows", text)

    def test_maps_scraper_build_uses_latest_main_and_the_maintained_driver(self):
        script = Path(__file__).resolve().parents[1] / "scraper" / "install_maps_scraper.sh"
        text = script.read_text(encoding="utf-8")

        self.assertIn("--branch main", text)
        self.assertIn("--depth 1", text)
        self.assertNotIn("GOSOM_REF=", text)
        self.assertNotIn("SCRAPEMATE_REF=", text)
        self.assertIn("github.com/mxschmitt/playwright-go", text)
        self.assertIn("PLAYWRIGHT_INSTALL_ONLY=1", text)
        self.assertIn("Prefer the weekly timetable", text)
        self.assertIn("could not apply the Maps weekly-hours patch", text)


if __name__ == "__main__":
    unittest.main()
