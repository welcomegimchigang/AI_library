import time
import json
import requests

BASE = "https://www.damoa.ai"
CATEGORY_ID = 1          # 전체
KEYWORD = ""             # 검색어 없으면 전체
SLEEP_SEC = 1.2          # 서버 부담 줄이기(1~2초 권장)
OUT_PATH = "damoa_aiservices_cat1.jsonl"

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; DamoaIndexer/1.0; +https://example.com/bot)"
})

def fetch_page(page: int) -> dict:
    url = f"{BASE}/api/aiservices/{CATEGORY_ID}/{page}"
    params = {"keyword": KEYWORD}
    r = session.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def main():
    first = fetch_page(1)
    total_pages = first.get("totalPages")
    if not total_pages:
        raise RuntimeError(f"totalPages not found in response: keys={list(first.keys())}")

    seen_ids = set()
    written = 0

    def write_items(payload: dict, f):
        nonlocal written
        for item in payload.get("data", []):
            _id = item.get("id")
            if _id is None or _id in seen_ids:
                continue
            seen_ids.add(_id)

            # 최소 필드만 저장(원하면 item 전체 저장해도 됨)
            out = {
                "source": "damoa",
                "damoa_id": _id,
                "serviceName": item.get("serviceName"),
                "website": item.get("website"),
                "serviceType": item.get("serviceType"),
                "location": item.get("location"),
                "keyFeatures": item.get("keyFeatures"),
                "price": item.get("price"),
                "supportedPlatforms": item.get("supportedPlatforms"),
                "thumbnail": item.get("thumbnail"),
                "releaseDate": item.get("releaseDate"),
                "updatedAt": item.get("updatedAt"),
            }

            f.write(json.dumps(out, ensure_ascii=False) + "\n")
            written += 1

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        write_items(first, f)
        print(f"[page 1/{total_pages}] written={written}")

        for page in range(2, total_pages + 1):
            time.sleep(SLEEP_SEC)
            payload = fetch_page(page)
            write_items(payload, f)
            print(f"[page {page}/{total_pages}] written={written}")

    print(f"Done. total unique tools saved: {written} -> {OUT_PATH}")

if __name__ == "__main__":
    main()
