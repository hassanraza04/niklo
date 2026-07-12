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


if __name__ == "__main__":
    unittest.main()
