"""Cache venue thumbnails so the public app never hotlinks Maps image URLs.

The source URL exists only in the private pipeline. Public D1 rows point to a
downloaded file under ``venues/<venue_id>.<extension>`` or use the UI fallback.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import ipaddress
import os
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit


HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DUCKDB = os.environ.get("NIKLO_DUCKDB", str(HERE / "warehouse.duckdb"))
MANIFEST = ROOT / "data" / "photo_manifest.csv"
# Static deployments serve cached venue photos straight from the app's public folder.
CACHE = os.environ.get("PHOTOS_DIR", str(ROOT / "web" / "public" / "venues"))
PHOTO_SOURCE_OVERRIDES = HERE / "transform" / "seeds" / "photo_source_overrides.csv"
UA = "Mozilla/5.0 (Niklo image cache; +https://niklo.nikloapp.workers.dev)"
CONTENT_TYPES = {
    "image/jpeg": ("jpg", "image/jpeg"),
    "image/png": ("png", "image/png"),
    "image/webp": ("webp", "image/webp"),
}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):  # type: ignore[no-untyped-def]
        return None


PHOTO_OPENER = urllib.request.build_opener(NoRedirect())


def validate_photo_url(url: str) -> str:
    parsed = urlsplit(url)
    hostname = parsed.hostname
    if parsed.scheme != "https" or not hostname or parsed.username or parsed.password:
        raise ValueError("Photo URL must be a public HTTPS URL.")

    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        if hostname == "localhost" or hostname.endswith(".localhost"):
            raise ValueError("Photo URL cannot target localhost.") from None
    else:
        if not address.is_global:
            raise ValueError("Photo URL cannot target a private address.")

    return url


def load_manifest() -> dict[str, dict[str, str]]:
    if not MANIFEST.exists():
        return {}
    with MANIFEST.open(newline="", encoding="utf-8") as f:
        return {row["venue_id"]: row for row in csv.DictReader(f)}


def fetch(url: str) -> tuple[bytes, str, str]:
    req = urllib.request.Request(validate_photo_url(url), headers={"User-Agent": UA})
    with PHOTO_OPENER.open(req, timeout=20) as response:
        content_type = response.headers.get_content_type().lower()
        if content_type not in CONTENT_TYPES:
            raise ValueError(f"Unsupported image content type: {content_type}")
        content_length = response.headers.get("Content-Length")
        if content_length and int(content_length) > MAX_IMAGE_BYTES:
            raise ValueError("Image is too large to cache.")
        data = response.read(MAX_IMAGE_BYTES + 1)
        if len(data) > MAX_IMAGE_BYTES:
            raise ValueError("Image is too large to cache.")
        extension, managed_type = CONTENT_TYPES[content_type]
        return data, extension, managed_type


def r2_client():
    if not os.environ.get("R2_ACCOUNT_ID"):
        return None
    import boto3  # lazy: only needed when actually pushing to r2

    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def dim_sources() -> dict[str, str]:
    import duckdb

    con = duckdb.connect(DUCKDB, read_only=True)
    try:
        rows = con.execute(
            "select venue_id, photo_url from main.dim_venue "
            "where photo_url is not null and photo_url <> ''"
        ).fetchall()
    finally:
        con.close()
    return {venue_id: url for venue_id, url in rows}


def photo_source_overrides() -> dict[str, str]:
    if not PHOTO_SOURCE_OVERRIDES.exists():
        return {}
    with PHOTO_SOURCE_OVERRIDES.open(newline="", encoding="utf-8") as f:
        return {
            row["venue_id"]: row["photo_source_url"]
            for row in csv.DictReader(f)
            if row.get("venue_id") and row.get("photo_source_url")
        }


def local_path(cache: Path, key: str) -> Path:
    return cache / Path(key).name


def cache_sources(sources: dict[str, str], cache: Path, limit: int) -> None:
    if limit:
        sources = dict(sorted(sources.items())[:limit])
    manifest = load_manifest()
    r2 = r2_client()
    bucket = os.environ.get("R2_BUCKET")
    cache.mkdir(parents=True, exist_ok=True)
    print(f"r2 mode -> bucket '{bucket}'" if r2 else f"local cache mode ({cache})")

    done = skipped = failed = 0
    for venue_id, url in sorted(sources.items()):
        src_hash = hashlib.sha1(url.encode()).hexdigest()[:12]
        prior = manifest.get(venue_id)
        prior_path = local_path(cache, prior["key"]) if prior else None
        if prior and prior.get("src_hash") == src_hash and (r2 or prior_path.exists()):
            skipped += 1
            continue
        try:
            data, extension, content_type = fetch(url)
        except Exception as exc:  # noqa: BLE001
            print(f"  fail {venue_id}: {exc}")
            failed += 1
            continue
        key = f"venues/{venue_id}.{extension}"
        if r2:
            r2.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
        else:
            local_path(cache, key).write_bytes(data)
        manifest[venue_id] = {"venue_id": venue_id, "key": key, "src_hash": src_hash}
        done += 1

    with MANIFEST.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["venue_id", "key", "src_hash"])
        writer.writeheader()
        writer.writerows(sorted(manifest.values(), key=lambda row: row["venue_id"]))
    print(f"cached {done}, skipped {skipped}, failed {failed}; {len(manifest)} total in manifest")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--overrides-only", action="store_true")
    parser.add_argument("--limit", type=int, default=int(os.environ.get("PHOTOS_LIMIT", "0")))
    args = parser.parse_args(argv)
    sources = photo_source_overrides() if args.overrides_only else dim_sources()
    if not args.overrides_only:
        # Manual sources take precedence when an existing listing needs a better image.
        sources.update(photo_source_overrides())
    cache_sources(sources, Path(CACHE), args.limit)


if __name__ == "__main__":
    main()
