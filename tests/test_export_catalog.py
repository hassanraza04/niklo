import json
import tempfile
import unittest
from pathlib import Path

from pipeline import export_catalog
from pipeline.export_to_d1 import COLUMNS, write_seed


ROOT = Path(__file__).resolve().parents[1]


class ExportCatalogTest(unittest.TestCase):
    def venue_row(self, venue_id: str, slug: str, photo_url: str) -> list:
        values = {
            "venue_id": venue_id,
            "name": f"{slug.title()} Venue",
            "slug": slug,
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
            "address": "1 Test Street",
            "city": "Karachi",
            "price_level": "$$",
            "website": "https://private.example",
            "phone": "+92 300 0000000",
            "hours": '{"Monday":["9 AM-5 PM"]}',
            "photo_url": photo_url,
            "photos": "[]",
            "google_url": f"https://maps.example/{venue_id}",
            "status": "Open",
            "is_open": 1,
            "source_query": "padel karachi",
            "last_verified": "2026-07-13T00:00:00+05:00",
        }
        return [values.get(column) for column in COLUMNS]

    def write_seed(self, rows: list[list], path: Path) -> None:
        write_seed(rows, str(path))

    def write_schema(self, path: Path, allow_duplicate_slugs: bool = False) -> None:
        schema = (ROOT / "infra" / "d1" / "schema.sql").read_text(encoding="utf-8")
        if allow_duplicate_slugs:
            schema = schema.replace(
                "slug             text not null unique,",
                "slug             text not null,",
            )
        path.write_text(schema, encoding="utf-8")

    def test_exports_sorted_full_and_compact_catalogs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            schema = root / "schema.sql"
            seed = root / "seed.sql"
            full = root / "catalog.json"
            client = root / "catalog-client.json"
            self.write_schema(schema)
            self.write_seed(
                [
                    self.venue_row("zulu", "zulu", "https://lh3.googleusercontent.com/zulu.jpg"),
                    self.venue_row("alpha", "alpha", "/venues/alpha.jpg"),
                ],
                seed,
            )

            count = export_catalog.export_catalog(schema, seed, full, client)
            full_rows = json.loads(full.read_text(encoding="utf-8"))
            client_rows = json.loads(client.read_text(encoding="utf-8"))

            self.assertEqual(2, count)
            self.assertEqual(["alpha", "zulu"], [row["slug"] for row in full_rows])
            self.assertEqual(["alpha", "zulu"], [row["slug"] for row in client_rows])
            self.assertEqual("/venues/alpha.jpg", full_rows[0]["photo_url"])
            self.assertIsNone(full_rows[1]["photo_url"])
            self.assertNotIn("website", client_rows[0])
            self.assertNotIn("phone", client_rows[0])
            self.assertNotIn("google_url", client_rows[0])
            self.assertNotIn("lh3.googleusercontent.com", client.read_text(encoding="utf-8"))
            self.assertTrue(full.read_bytes().endswith(b"\n"))
            self.assertTrue(client.read_bytes().endswith(b"\n"))

    def test_rejects_duplicate_slug_in_the_seed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            schema = root / "schema.sql"
            seed = root / "seed.sql"
            full = root / "catalog.json"
            client = root / "catalog-client.json"
            self.write_schema(schema, allow_duplicate_slugs=True)
            self.write_seed(
                [
                    self.venue_row("one", "same", "/venues/one.jpg"),
                    self.venue_row("two", "same", "/venues/two.jpg"),
                ],
                seed,
            )

            with self.assertRaisesRegex(ValueError, "duplicate slug: same"):
                export_catalog.export_catalog(schema, seed, full, client)


if __name__ == "__main__":
    unittest.main()
