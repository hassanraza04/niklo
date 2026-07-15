import csv
import json
import tempfile
import unittest
from pathlib import Path

from pipeline import apply_manual_curation
from pipeline.export_to_d1 import COLUMNS, write_seed
from pipeline.seed_checks import load_seed_database


ROOT = Path(__file__).resolve().parents[1]


class ApplyManualCurationTest(unittest.TestCase):
    def venue_row(
        self,
        venue_id: str,
        name: str,
        subcategory: str,
        category: str,
        subcategories: str,
        categories: str,
    ) -> list:
        values = {
            "venue_id": venue_id,
            "name": name,
            "slug": venue_id,
            "subcategory_slug": subcategory,
            "subcategory_name": subcategory.title(),
            "category_slug": category,
            "category_name": category.title(),
            "subcategories": subcategories,
            "category_slugs": categories,
            "google_category": "Test venue",
            "rating": 4.5,
            "review_count": 10,
            "latitude": 24.8,
            "longitude": 67.0,
            "area": "Karachi",
            "address": "1 Test Street",
            "city": "Karachi",
            "hours": "{}",
            "google_url": f"https://maps.example/{venue_id}",
            "is_open": 1,
            "last_verified": "2026-07-14T00:00:00+05:00",
        }
        return [values.get(column) for column in COLUMNS]

    def test_applies_removals_and_membership_exclusions_to_every_public_artifact(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            schema = root / "schema.sql"
            seed = root / "seed.sql"
            exclusions = root / "excluded.csv"
            membership_exclusions = root / "membership-exclusions.csv"
            curated = root / "curated.csv"
            taxonomy = root / "taxonomy.json"
            live = root / "live.csv"
            catalog = root / "catalog.json"
            client_catalog = root / "catalog-client.json"
            manifest = root / "photo_manifest.csv"
            photo_root = root / "venues"
            photo_root.mkdir()
            (photo_root / "park.jpg").write_bytes(b"photo")
            manifest.write_text("venue_id,key,src_hash\n", encoding="utf-8")

            schema.write_text((ROOT / "infra" / "d1" / "schema.sql").read_text(), encoding="utf-8")
            taxonomy.write_text(
                json.dumps(
                    {
                        "categories": [
                            {
                                "slug": "sports-active",
                                "name": "Sports & Active",
                                "subcategories": [{"slug": "skating", "name": "Skating"}],
                            },
                            {
                                "slug": "outdoors-adventure",
                                "name": "Outdoors & Adventure",
                                "subcategories": [{"slug": "parks", "name": "Parks"}],
                            },
                            {
                                "slug": "entertainment",
                                "name": "Entertainment",
                                "subcategories": [{"slug": "cinemas", "name": "Cinemas"}],
                            },
                            {
                                "slug": "culture",
                                "name": "Culture",
                                "subcategories": [{"slug": "heritage", "name": "Heritage"}],
                            },
                        ]
                    }
                ),
                encoding="utf-8",
            )
            exclusions.write_text('venue_id,name,reason\ncapri,Capri Cinema,remove\n', encoding="utf-8")
            membership_exclusions.write_text('venue_id,subcategory\npark,skating\n', encoding="utf-8")
            curated_record = dict(
                zip(
                    COLUMNS,
                    self.venue_row("curated", "Teen Talwar Monument", "heritage", "culture", "heritage", "culture"),
                )
            )
            curated_record["source_query"] = "manual-curation"
            with curated.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=COLUMNS)
                writer.writeheader()
                writer.writerow(curated_record)
            prior_curated = self.venue_row("curated", "Old Teen Talwar", "parks", "outdoors-adventure", "parks", "outdoors-adventure")
            prior_curated[COLUMNS.index("source_query")] = "manual-curation"
            write_seed(
                [
                    self.venue_row(
                        "park",
                        "Shaheen Park",
                        "skating",
                        "sports-active",
                        "skating,parks",
                        "sports-active,outdoors-adventure",
                    ),
                    self.venue_row("rink", "Shaheen Park Skating Rink", "skating", "sports-active", "skating", "sports-active"),
                    self.venue_row("capri", "Capri Cinema", "cinemas", "entertainment", "cinemas", "entertainment"),
                    prior_curated,
                ],
                str(seed),
            )

            summary = apply_manual_curation.apply_manual_curation(
                schema_path=schema,
                seed_path=seed,
                excluded_venues_path=exclusions,
                membership_exclusions_path=membership_exclusions,
                taxonomy_path=taxonomy,
                curated_venues_path=curated,
                live_listings_path=live,
                catalog_path=catalog,
                client_catalog_path=client_catalog,
                manifest_path=manifest,
                photo_root=photo_root,
            )

            conn = load_seed_database(schema, seed, root / "niklo.db")
            try:
                rows = conn.execute(
                    "select venue_id, subcategory_slug, subcategory_name, category_slug, category_name, subcategories, category_slugs, photo_url from venues order by venue_id"
                ).fetchall()
            finally:
                conn.close()

            self.assertEqual(1, summary.removed_count)
            self.assertEqual(1, summary.membership_removed_count)
            self.assertEqual(
                [
                    ("curated", "heritage", "Heritage", "culture", "Culture", "heritage", "culture", None),
                    ("park", "parks", "Parks", "outdoors-adventure", "Outdoors & Adventure", "parks", "outdoors-adventure", "/venues/park.jpg"),
                    ("rink", "skating", "Skating", "sports-active", "Sports & Active", "skating", "sports-active", None),
                ],
                rows,
            )
            with live.open(newline="", encoding="utf-8") as f:
                self.assertEqual(["park", "rink", "curated"], [row["venue_id"] for row in csv.DictReader(f)])
            self.assertEqual(["park", "rink", "curated"], [row["venue_id"] for row in json.loads(catalog.read_text())])
            self.assertEqual(["park", "rink", "curated"], [row["venue_id"] for row in json.loads(client_catalog.read_text())])


if __name__ == "__main__":
    unittest.main()
