#!/usr/bin/env bash
# Build the current upstream Maps scraper with its browser dependency updated to Playwright 1.61.
set -euo pipefail

BIN_DIR="${GOBIN:-$HOME/go/bin}"
GOSOM_COMMIT_OUTPUT="${GOSOM_COMMIT_OUTPUT:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKDIR="$(mktemp -d)"
GOSOM_DIR="$WORKDIR/google-maps-scraper"
SCRAPEMATE_DIR="$WORKDIR/scrapemate"

cleanup() {
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

# Maps markup changes frequently. Build the latest upstream main branch on
# every refresh, then fail closed if either Niklo compatibility patch no
# longer applies or its focused Go tests fail.
git clone --quiet --depth 1 --branch main https://github.com/gosom/google-maps-scraper.git "$GOSOM_DIR"
if [ -n "$GOSOM_COMMIT_OUTPUT" ]; then
  mkdir -p "$(dirname "$GOSOM_COMMIT_OUTPUT")"
  git -C "$GOSOM_DIR" rev-parse HEAD > "$GOSOM_COMMIT_OUTPUT"
fi
git -C "$GOSOM_DIR" apply --check "$SCRIPT_DIR/patches/gosom-live-fields.patch"
git -C "$GOSOM_DIR" apply "$SCRIPT_DIR/patches/gosom-live-fields.patch"
git clone --quiet --depth 1 --branch main https://github.com/gosom/scrapemate.git "$SCRAPEMATE_DIR"

# The newer response position carries only today's hours. Prefer the older
# weekly timetable and retain the newer value only when the weekly structure
# is unavailable.
perl -0pi -e 's#// Try new structure first \(as of Nov 2025\) - darray\[203\]\[0\]\n\titems := getNthElementAndCast\[\[\]any\]\(darray, 203, 0\)\n\tif len\(items\) == 0 \{\n\t\t// Fall back to old structure - darray\[34\]\[1\]\n\t\titems = getNthElementAndCast\[\[\]any\]\(darray, 34, 1\)\n\t\}#// Prefer the weekly timetable at darray[34][1].\n\titems := getNthElementAndCast[[]any](darray, 34, 1)\n\tif len(items) == 0 {\n\t\t// darray[203][0] is a current-day fallback.\n\t\titems = getNthElementAndCast[[]any](darray, 203, 0)\n\t}#s' "$GOSOM_DIR/gmaps/entry.go"
if ! grep -Fq "Prefer the weekly timetable at darray[34][1]." "$GOSOM_DIR/gmaps/entry.go"; then
  echo "could not apply the Maps weekly-hours patch" >&2
  exit 1
fi

# Scrapemate still imports a retired Playwright driver package. Its public API
# is compatible with the maintained module used by the scraper's installer.
find "$SCRAPEMATE_DIR" -name '*.go' -print0 | xargs -0 perl -pi -e \
  's#github\.com/playwright-community/playwright-go#github.com/mxschmitt/playwright-go#g'
perl -pi -e \
  's#github\.com/playwright-community/playwright-go v0\.5700\.1#github.com/mxschmitt/playwright-go v0.6100.0#' \
  "$SCRAPEMATE_DIR/go.mod"

mkdir -p "$BIN_DIR"
(
  cd "$GOSOM_DIR"
  go mod edit -replace "github.com/gosom/scrapemate=$SCRAPEMATE_DIR"
  go mod tidy
  go test ./gmaps
  go build -o "$BIN_DIR/google-maps-scraper" .
)

PLAYWRIGHT_INSTALL_ONLY=1 "$BIN_DIR/google-maps-scraper"
