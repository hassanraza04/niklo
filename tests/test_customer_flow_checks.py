import unittest
from pathlib import Path

from pipeline import customer_flow_checks


ROOT = Path(__file__).resolve().parents[1]


class CustomerFlowChecksTest(unittest.TestCase):
    def test_current_seed_passes_customer_flow_checks(self):
        checks = customer_flow_checks.run_customer_flow_checks(
            ROOT / "infra" / "d1" / "schema.sql",
            ROOT / "infra" / "d1" / "seed.sql",
            ROOT / "data" / "search_regressions.csv",
        )
        failures = [check for check in checks if not check.passed]
        self.assertEqual([], failures)


if __name__ == "__main__":
    unittest.main()
