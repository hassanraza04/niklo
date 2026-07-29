#!/usr/bin/env bash
# Build the current upstream Maps scraper.
set -euo pipefail

BIN_DIR="${GOBIN:-$HOME/go/bin}"
GOSOM_COMMIT_OUTPUT="${GOSOM_COMMIT_OUTPUT:-}"
WORKDIR="$(mktemp -d)"
GOSOM_DIR="$WORKDIR/google-maps-scraper"

cleanup() {
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

# Maps markup changes frequently, so every refresh builds the latest tested
# upstream main branch instead of carrying local parser or browser patches.
git clone --quiet --depth 1 --branch main https://github.com/gosom/google-maps-scraper.git "$GOSOM_DIR"
if [ -n "$GOSOM_COMMIT_OUTPUT" ]; then
  mkdir -p "$(dirname "$GOSOM_COMMIT_OUTPUT")"
  git -C "$GOSOM_DIR" rev-parse HEAD > "$GOSOM_COMMIT_OUTPUT"
fi

mkdir -p "$BIN_DIR"
(
  cd "$GOSOM_DIR"
  go test ./gmaps
  go build -o "$BIN_DIR/google-maps-scraper" .
)

PLAYWRIGHT_INSTALL_ONLY=1 "$BIN_DIR/google-maps-scraper"
