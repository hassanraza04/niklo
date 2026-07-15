import os
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class SweepScriptTest(unittest.TestCase):
    def test_handles_queries_with_apostrophes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            query_file = root / "queries.txt"
            query_file.write_text("Maqbool's lounge, Karachi\n", encoding="utf-8")
            scraper = root / "google-maps-scraper"
            scraper.write_text(
                """#!/usr/bin/env bash
set -euo pipefail
while [ \"$#\" -gt 0 ]; do
  if [ \"$1\" = \"-results\" ]; then
    printf '{\"place_id\": \"mock\"}\\n' > \"$2\"
    exit 0
  fi
  shift
done
exit 1
""",
                encoding="utf-8",
            )
            scraper.chmod(scraper.stat().st_mode | stat.S_IXUSR)

            result = subprocess.run(
                ["bash", str(ROOT / "scraper" / "sweep.sh"), str(query_file), "daily"],
                cwd=ROOT / "scraper",
                env={
                    **os.environ,
                    "GOSOM_BIN": str(scraper),
                    "OUT_ROOT": str(root / "out"),
                    "PAUSE_MIN": "0",
                    "PAUSE_MAX": "0",
                },
                capture_output=True,
                text=True,
            )

            self.assertEqual(0, result.returncode, result.stderr)
            self.assertTrue((root / "out" / "daily" / "maqbools_lounge_karachi.json").exists())


if __name__ == "__main__":
    unittest.main()
