import csv
import json
import stat
import tempfile
import unittest
from pathlib import Path

from pipeline import scraper_diagnostic


class ScraperDiagnosticTest(unittest.TestCase):
    def test_workflow_is_manual_and_read_only(self):
        workflow = (
            Path(__file__).resolve().parents[1]
            / ".github"
            / "workflows"
            / "scraper-diagnostic.yml"
        ).read_text(encoding="utf-8")

        self.assertIn("workflow_dispatch:", workflow)
        self.assertIn("contents: read", workflow)
        self.assertNotIn("contents: write", workflow)
        self.assertNotIn("daily_refresh.sh", workflow)
        self.assertNotIn("git push", workflow)

    def write_live(self, path: Path) -> None:
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=scraper_diagnostic.CANARY_FIELDS)
            writer.writeheader()
            writer.writerow(
                {
                    "venue_id": "known-1",
                    "name": "Known One",
                    "google_url": "https://maps.example/known-1",
                    "rating": "4.5",
                    "review_count": "10",
                }
            )

    def test_prepares_only_fixed_live_canaries(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            live = root / "live.csv"
            canaries = root / "canaries.txt"
            output = root / "output"
            self.write_live(live)
            canaries.write_text("# control\nknown-1\n", encoding="utf-8")

            rows = scraper_diagnostic.prepare_canaries(live, canaries, output)

            self.assertEqual(["known-1"], [row["venue_id"] for row in rows])
            self.assertEqual(
                "https://maps.example/known-1\n",
                (output / "queries.txt").read_text(encoding="utf-8"),
            )

    def test_records_each_scraper_process(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            canaries = root / "canaries.csv"
            scraper_diagnostic.write_csv(
                canaries,
                scraper_diagnostic.CANARY_FIELDS,
                [
                    {
                        "venue_id": "known-1",
                        "name": "Known One",
                        "google_url": "https://maps.example/known-1",
                        "rating": "4.5",
                        "review_count": "10",
                    }
                ],
            )
            binary = root / "fake-scraper"
            binary.write_text(
                """#!/usr/bin/env python3
import json
import sys

output = sys.argv[sys.argv.index("-results") + 1]
with open(output, "w", encoding="utf-8") as handle:
    handle.write(json.dumps({"place_id": "known-1", "review_count": 12}) + "\\n")
print("fake stdout")
""",
                encoding="utf-8",
            )
            binary.chmod(binary.stat().st_mode | stat.S_IXUSR)

            statuses = scraper_diagnostic.run_variant(
                binary,
                canaries,
                root / "run",
                pause_seconds=0,
            )

            self.assertEqual("0", statuses[0]["return_code"])
            self.assertEqual("1", statuses[0]["result_rows"])
            self.assertIn("fake stdout", (root / "run" / "01.stdout.log").read_text())

    def test_comparison_matches_exact_place_id_and_checks_full_week(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            canaries = root / "canaries.csv"
            scraper_diagnostic.write_csv(
                canaries,
                scraper_diagnostic.CANARY_FIELDS,
                [
                    {
                        "venue_id": "known-1",
                        "name": "Known One",
                        "google_url": "https://maps.example/known-1",
                        "rating": "4.5",
                        "review_count": "10",
                    }
                ],
            )
            variant = root / "clean"
            variant.mkdir()
            (variant / "build_exit_code.txt").write_text("0\n", encoding="utf-8")
            scraper_diagnostic.write_csv(
                variant / "status.csv",
                scraper_diagnostic.STATUS_FIELDS,
                [
                    {
                        "venue_id": "known-1",
                        "name": "Known One",
                        "return_code": "0",
                        "timed_out": "false",
                        "result_rows": "2",
                        "result_file": "01.json",
                    }
                ],
            )
            rows = [
                {"place_id": "noise", "review_rating": 5, "review_count": 999},
                {
                    "place_id": "known-1",
                    "title": "Known One",
                    "review_rating": 4.6,
                    "review_count": 12,
                    "open_hours": {
                        day: ["9 AM-5 PM"] for day in sorted(scraper_diagnostic.WEEKDAYS)
                    },
                },
            ]
            (variant / "01.json").write_text(
                "".join(json.dumps(row) + "\n" for row in rows),
                encoding="utf-8",
            )

            comparison = scraper_diagnostic.compare_variants(
                canaries,
                [("clean", variant)],
                root / "report",
            )

            self.assertEqual("12", str(comparison[0]["scraped_review_count"]))
            self.assertEqual("true", comparison[0]["valid_popularity"])
            self.assertEqual("true", comparison[0]["complete_week"])
            self.assertIn("Exact place IDs matched: 1/1", (root / "report" / "summary.md").read_text())


if __name__ == "__main__":
    unittest.main()
