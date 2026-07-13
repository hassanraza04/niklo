"""Regression checks for the repository's public production surface."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class PublicSurfaceTest(unittest.TestCase):
    def test_padel_review_system_is_not_part_of_the_active_release(self) -> None:
        self.assertFalse((ROOT / "pipeline" / "flag_venues.py").exists())
        self.assertFalse((ROOT / "infra" / "d1" / "flags.sql").exists())
        self.assertFalse((ROOT / "web" / "app" / "review" / "page.tsx").exists())

        schema = (ROOT / "infra" / "d1" / "schema.sql").read_text(encoding="utf-8")
        self.assertNotIn("review_level", schema)
        self.assertNotIn("review_flag", schema)

    def test_retired_sources_are_not_kept_as_active_inputs(self) -> None:
        self.assertFalse((ROOT / "data" / "taxonomy.json").exists())
        self.assertFalse((ROOT / "scraper" / "analyze.py").exists())
        for filename in (
            "board-game-cafe.txt",
            "bookstore-cafe.txt",
            "camping.txt",
            "climbing.txt",
            "cooking-classes.txt",
            "hikes.txt",
            "mini-golf.txt",
            "music-rooms.txt",
            "paint-cafe.txt",
            "pottery-art.txt",
            "shisha.txt",
            "theatre.txt",
        ):
            self.assertFalse((ROOT / "scraper" / "queries" / filename).exists())
        self.assertTrue((ROOT / "scraper" / "queries" / "parks.txt").exists())


if __name__ == "__main__":
    unittest.main()
