import json
import tempfile
import unittest
from pathlib import Path

import duckdb

from pipeline.ingest import load


class LoadRawVenuesTest(unittest.TestCase):
    def test_loads_ndjson_with_query_provenance_into_duckdb(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "scrape" / "padel"
            source.mkdir(parents=True)
            (source / "clifton_padel.json").write_text(
                json.dumps(
                    {
                        "place_id": "place-1",
                        "title": "Test Padel",
                        "images": [{"image": "https://example.test/photo.jpg"}],
                        "open_hours": {"Monday": ["9 AM-9 PM"]},
                        "complete_address": {"city": "Karachi", "borough": "Clifton"},
                    }
                )
                + "\n",
                encoding="utf-8",
            )
            warehouse = root / "warehouse.duckdb"

            count = load.load_raw_venues(source.parent, warehouse)

            self.assertEqual(1, count)
            connection = duckdb.connect(warehouse, read_only=True)
            try:
                row = connection.execute(
                    """
                    select
                        place_id,
                        title,
                        _category,
                        _source_query,
                        _loaded_at,
                        json_extract_string(complete_address, '$.city')
                    from raw.venues
                    """
                ).fetchone()
            finally:
                connection.close()
            self.assertEqual(("place-1", "Test Padel", "padel", "clifton_padel"), row[:4])
            self.assertTrue(row[4])
            self.assertEqual("Karachi", row[5])


if __name__ == "__main__":
    unittest.main()
