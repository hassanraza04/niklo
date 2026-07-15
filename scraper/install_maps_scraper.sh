#!/usr/bin/env bash
# Build the pinned Maps scraper with its browser dependency updated to Playwright 1.61.
set -euo pipefail

GOSOM_REF="0ef302ecc72a8872d5dac68cbbeab78800f80fdd"
SCRAPEMATE_REF="af95abbeadcea50227be15bbe3cb2864c378b3d0"
BIN_DIR="${GOBIN:-$HOME/go/bin}"
WORKDIR="$(mktemp -d)"
GOSOM_DIR="$WORKDIR/google-maps-scraper"
SCRAPEMATE_DIR="$WORKDIR/scrapemate"

cleanup() {
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

git clone --quiet https://github.com/gosom/google-maps-scraper.git "$GOSOM_DIR"
git -C "$GOSOM_DIR" checkout --quiet "$GOSOM_REF"
git clone --quiet https://github.com/gosom/scrapemate.git "$SCRAPEMATE_DIR"
git -C "$SCRAPEMATE_DIR" checkout --quiet "$SCRAPEMATE_REF"

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
  go build -o "$BIN_DIR/google-maps-scraper" .
)

PLAYWRIGHT_INSTALL_ONLY=1 "$BIN_DIR/google-maps-scraper"
