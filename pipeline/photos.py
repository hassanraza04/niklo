"""mirror venue photos into our own storage so the app never depends on google's
temporary cdn urls (the gps-cs-s links are signed and expire).

reads dim_venue, downloads each venue's thumbnail once, uploads it to r2 under
venues/<venue_id>.jpg, and records it in data/photo_manifest.csv. idempotent: a
re-run only re-fetches photos whose source url changed, so this is safe to run
after every monthly scrape.

with no r2 creds it runs in local test mode and writes into pipeline/photos_cache/
so you can confirm the download half works. set the R2_* env vars to push to r2.

env (r2): R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET
usage: uv run python photos.py
"""

from __future__ import annotations

import csv
import hashlib
import os
import urllib.request

import duckdb

HERE = os.path.dirname(os.path.abspath(__file__))
DUCKDB = os.environ.get("NIKLO_DUCKDB", os.path.join(HERE, "warehouse.duckdb"))
MANIFEST = os.path.normpath(os.path.join(HERE, "..", "data", "photo_manifest.csv"))
CACHE = os.environ.get("PHOTOS_DIR", os.path.join(HERE, "photos_cache"))
LIMIT = int(os.environ.get("PHOTOS_LIMIT", "0"))  # 0 = all
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/537.36"


def load_manifest() -> dict:
    if not os.path.exists(MANIFEST):
        return {}
    return {r["venue_id"]: r for r in csv.DictReader(open(MANIFEST))}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


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


def main() -> None:
    con = duckdb.connect(DUCKDB, read_only=True)
    rows = con.execute(
        "select venue_id, photo_url from main.dim_venue "
        "where photo_url is not null and photo_url <> ''"
    ).fetchall()
    if LIMIT:
        rows = rows[:LIMIT]

    manifest = load_manifest()
    r2 = r2_client()
    bucket = os.environ.get("R2_BUCKET")
    if r2:
        print(f"r2 mode -> bucket '{bucket}'")
    else:
        os.makedirs(CACHE, exist_ok=True)
        print(f"no r2 creds -> local cache mode ({CACHE})")

    done = skipped = failed = 0
    for venue_id, url in rows:
        src_hash = hashlib.sha1(url.encode()).hexdigest()[:12]
        if manifest.get(venue_id, {}).get("src_hash") == src_hash:
            skipped += 1
            continue
        try:
            data = fetch(url)
        except Exception as e:  # noqa: BLE001
            print(f"  fail {venue_id}: {e}")
            failed += 1
            continue
        key = f"venues/{venue_id}.jpg"
        if r2:
            r2.put_object(Bucket=bucket, Key=key, Body=data, ContentType="image/jpeg")
        else:
            with open(os.path.join(CACHE, f"{venue_id}.jpg"), "wb") as f:
                f.write(data)
        manifest[venue_id] = {"venue_id": venue_id, "key": key, "src_hash": src_hash}
        done += 1

    with open(MANIFEST, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["venue_id", "key", "src_hash"])
        w.writeheader()
        w.writerows(manifest.values())

    print(f"mirrored {done}, skipped {skipped} (unchanged), failed {failed}; "
          f"{len(manifest)} total in manifest")


if __name__ == "__main__":
    main()
