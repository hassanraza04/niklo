import csv
import tempfile
import unittest
from datetime import date
from pathlib import Path

from pipeline import plan_daily_refresh


class DailyRefreshPlanTest(unittest.TestCase):
    def write_live(self, path: Path) -> None:
        with path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["venue_id", "name"])
            writer.writeheader()
            for venue_id, name in [("c", "Third"), ("a", "First"), ("b", "Second")]:
                writer.writerow({"venue_id": venue_id, "name": name})

    def test_daily_plan_rotates_only_existing_listings(self):
        with tempfile.TemporaryDirectory() as tmp:
            live = Path(tmp) / "live.csv"
            self.write_live(live)
            plan = plan_daily_refresh.build_plan(live, date(2026, 7, 11), batch_size=2)

        self.assertEqual(3, plan.live_count)
        self.assertEqual(2, plan.batch_count)
        self.assertEqual(["a", "b"], [row["venue_id"] for row in plan.listings])

    def test_daily_plan_writes_precise_existing_listing_queries(self):
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

        self.assertEqual(["First, Karachi", "Second, Karachi"], queries)
        self.assertEqual(["a", "b"], [row["venue_id"] for row in batch])


if __name__ == "__main__":
    unittest.main()
