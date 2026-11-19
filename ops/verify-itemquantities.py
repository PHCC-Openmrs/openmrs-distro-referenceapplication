#!/usr/bin/env python3
"""Compare the bulk stock item quantities endpoint with the per-item inventory calls it replaces.

For one location, fetches every stock item the Stock -> Items page lists, then for each item

    GET /ws/rest/v1/stockmanagement/stockiteminventory?v=default&stockItemUuid=X&locationUuid=L&groupBy=StockItemOnly

(what the page used to send once per item) and compares quantity, quantityUoM, quantityUoMUuid and
quantityFactor of its first result with the item's row in

    GET /ws/rest/v1/stockmanagement/itemquantities?locationUuid=L

An item with no per-item result must have no bulk row (the page shows both as 0). Rows the bulk endpoint
returns for items outside the list are checked against their own per-item call too. Read-only: GETs only.

Usage:
    python3 ops/verify-itemquantities.py --base-url http://localhost/openmrs \\
        --location ba34b45c-0a0d-4000-9624-ab6fd419f778 [--user admin --password ...] [--workers 4]

Exit status: 0 when everything matches, 1 on any mismatch, 2 on a request failure.
"""
import argparse
import base64
import getpass
import http.cookiejar
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal

FIELDS = ("quantity", "quantityUoM", "quantityUoMUuid", "quantityFactor")
NUMERIC = {"quantity", "quantityFactor"}


class Client:
    def __init__(self, base_url, user, password):
        self.base = base_url.rstrip("/") + "/ws/rest/v1"
        token = base64.b64encode(f"{user}:{password}".encode()).decode()
        self.headers = {"Authorization": f"Basic {token}", "Accept": "application/json"}
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.requests = 0

    def get(self, path, params=None):
        url = self.base + path + ("?" + urllib.parse.urlencode(params) if params else "")
        req = urllib.request.Request(url, headers=self.headers)
        self.requests += 1
        with self.opener.open(req, timeout=120) as resp:
            # parse_float=Decimal keeps 6.00000 vs 6.0 visible and avoids float rounding.
            return json.loads(resp.read().decode("utf-8"), parse_float=Decimal)


def number(value):
    return None if value is None else Decimal(str(value))


def list_stock_items(client):
    """Every stock item the Items page loads (it pages through all of them; same uuids at any representation)."""
    items, start = [], 0
    while True:
        page = client.get("/stockmanagement/stockitem", {"v": "default", "limit": 100, "startIndex": start})
        results = page.get("results", [])
        items.extend(results)
        has_next = any(link.get("rel") == "next" for link in page.get("links", []) or [])
        if not results or (not has_next and len(results) < 100):
            return items
        start += len(results)


def per_item(client, location, stock_item_uuid):
    data = client.get("/stockmanagement/stockiteminventory", {
        "v": "default", "stockItemUuid": stock_item_uuid, "locationUuid": location, "groupBy": "StockItemOnly"})
    results = data.get("results") or []
    return results[0] if results else None


def differences(old, new):
    diffs = []
    for field in FIELDS:
        a, b = old.get(field), new.get(field)
        if field in NUMERIC:
            if number(a) != number(b):
                diffs.append(f"{field}: per-item={a} bulk={b}")
            elif a is not None and b is not None and str(a) != str(b):
                diffs.append(f"{field}: same value, different scale per-item={a} bulk={b} (harmless)")
        elif a != b:
            diffs.append(f"{field}: per-item={a!r} bulk={b!r}")
    return diffs


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://localhost/openmrs")
    parser.add_argument("--location", required=True, help="location uuid, e.g. the session location of the page")
    parser.add_argument("--user", default="admin")
    parser.add_argument("--password", help="prompted for when left out")
    parser.add_argument("--workers", type=int, default=4, help="parallel per-item requests (default 4)")
    args = parser.parse_args()
    password = args.password if args.password is not None else getpass.getpass(f"Password for {args.user}: ")

    client = Client(args.base_url, args.user, password)
    try:
        client.get("/session")
        items = list_stock_items(client)
        item_names = {i["uuid"]: i.get("commonName") or i.get("drugName") or i.get("conceptName") for i in items}

        started = time.monotonic()
        bulk_rows = client.get("/stockmanagement/itemquantities", {"locationUuid": args.location}).get("results", [])
        bulk_seconds = time.monotonic() - started
        bulk = {}
        duplicates = []
        for row in bulk_rows:
            if row["stockItemUuid"] in bulk:
                duplicates.append(row["stockItemUuid"])
            bulk[row["stockItemUuid"]] = row

        to_check = list(dict.fromkeys(list(item_names) + list(bulk)))
        before = client.requests
        started = time.monotonic()
        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
            old = dict(zip(to_check, pool.map(lambda uuid: per_item(client, args.location, uuid), to_check)))
        per_item_seconds = time.monotonic() - started
        per_item_requests = client.requests - before
    except urllib.error.HTTPError as e:
        print(f"Request failed: {e.code} {e.reason} {e.url}\n{e.read().decode('utf-8', 'replace')[:500]}",
              file=sys.stderr)
        return 2
    except urllib.error.URLError as e:
        print(f"Request failed: {e.reason}", file=sys.stderr)
        return 2

    mismatches, cosmetic, matched_with_stock, matched_empty = [], [], 0, 0
    for uuid in to_check:
        name = item_names.get(uuid, "(not in the stock item list)")
        o, n = old.get(uuid), bulk.get(uuid)
        if o is None and n is None:
            matched_empty += 1
            continue
        if o is None or n is None:
            mismatches.append(f"{uuid} {name}: per-item={'none' if o is None else o} bulk={'none' if n is None else n}")
            continue
        diffs = differences(o, n)
        real = [d for d in diffs if "harmless" not in d]
        if real:
            mismatches.append(f"{uuid} {name}: " + "; ".join(real))
        else:
            matched_with_stock += 1
            cosmetic.extend(f"{uuid} {name}: {d}" for d in diffs)

    print(f"Location {args.location}: {len(item_names)} stock items listed, {len(bulk)} bulk rows")
    print(f"  per-item: {per_item_requests} requests, {per_item_seconds:.1f}s wall ({args.workers} in parallel)")
    print(f"  bulk:     1 request, {bulk_seconds:.2f}s")
    print(f"  matched: {matched_with_stock} with stock rows, {matched_empty} with no row on either side")
    for uuid in duplicates:
        print(f"DUPLICATE bulk row for {uuid}")
    for line in cosmetic:
        print(f"note  {line}")
    for line in mismatches:
        print(f"MISMATCH {line}")
    if mismatches or duplicates:
        print(f"{len(mismatches) + len(duplicates)} mismatch(es)")
        return 1
    print("All quantities match.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
