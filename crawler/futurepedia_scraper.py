"""
Futurepedia Bulk Scraper v2 - Sitemap-based approach.
Fetches ALL tool URLs from Futurepedia's sitemap, then scrapes
each tool page's <meta> tags for name, description, and external URL.
Designed to run daily in GitHub Actions and bulk-add tools.
"""
import os
import json
import random
import time
import re
import requests
from deep_translator import GoogleTranslator

TOOLS_JSONL = os.path.join("public", "data", "tools.jsonl")
PROGRESS_FILE = os.path.join("data", "futurepedia_progress.json")
SITEMAP_URL = "https://www.futurepedia.io/sitemap.xml"
MAX_NEW_PER_RUN = 100  # 하루 최대 100개 추가

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

CATEGORY_MAP = {
    "image": "이미지/아트", "art": "이미지/아트", "design": "이미지/아트",
    "3d": "이미지/아트", "portrait": "이미지/아트", "cartoon": "이미지/아트",
    "photo": "이미지/아트", "avatar": "이미지/아트", "logo": "이미지/아트",
    "writing": "텍스트/문서", "text": "텍스트/문서", "copy": "텍스트/문서",
    "paraphras": "텍스트/문서", "grammar": "텍스트/문서", "email": "텍스트/문서",
    "summar": "텍스트/문서", "story": "텍스트/문서", "blog": "텍스트/문서",
    "code": "개발/코드", "developer": "개발/코드", "programming": "개발/코드",
    "sql": "개발/코드", "api": "개발/코드",
    "video": "비디오/오디오", "audio": "비디오/오디오", "music": "비디오/오디오",
    "voice": "비디오/오디오", "speech": "비디오/오디오", "podcast": "비디오/오디오",
    "transcri": "비디오/오디오",
    "marketing": "비즈니스/마케팅", "seo": "비즈니스/마케팅", "social": "비즈니스/마케팅",
    "sales": "비즈니스/마케팅", "e-commerce": "비즈니스/마케팅", "ad": "비즈니스/마케팅",
    "education": "교육/학습", "student": "교육/학습", "learn": "교육/학습",
    "tutor": "교육/학습", "research": "교육/학습", "quiz": "교육/학습",
    "productiv": "생산성/협업", "project": "생산성/협업", "workflow": "생산성/협업",
    "automat": "생산성/협업", "schedule": "생산성/협업", "meeting": "생산성/협업",
    "presentation": "생산성/협업", "spreadsheet": "생산성/협업",
    "finance": "금융/투자", "invest": "금융/투자", "crypto": "금융/투자",
    "trading": "금융/투자", "accounting": "금융/투자",
    "health": "건강/피트니스", "fitness": "건강/피트니스", "medical": "건강/피트니스",
    "wellness": "건강/피트니스", "mental": "건강/피트니스",
    "chatbot": "텍스트/문서", "assistant": "생산성/협업",
    "customer": "비즈니스/마케팅", "hr": "비즈니스/마케팅", "recruit": "비즈니스/마케팅",
}


def load_existing():
    """Load existing tool URLs and names."""
    urls = set()
    names = set()
    if os.path.exists(TOOLS_JSONL):
        with open(TOOLS_JSONL, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    obj = json.loads(line)
                    if "url" in obj:
                        urls.add(obj["url"].rstrip("/").lower().replace("www.", "").replace("https://", "").replace("http://", ""))
                    if "name" in obj:
                        names.add(obj["name"].lower().strip())
                except:
                    pass
    return urls, names


def get_tool_urls_from_sitemap():
    """Fetch all /tool/ URLs from the sitemap."""
    print("📥 Fetching Futurepedia sitemap...")
    try:
        resp = requests.get(SITEMAP_URL, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        
        # Extract all /tool/ URLs
        tool_urls = re.findall(r'<loc>(https://www\.futurepedia\.io/tool/[^<]+)</loc>', resp.text)
        print(f"   Found {len(tool_urls)} tool URLs in sitemap")
        return tool_urls
    except Exception as e:
        print(f"   Error fetching sitemap: {e}")
        return []


def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    return {"processed": [], "round": 1, "sitemap_done": []}


def save_progress(progress):
    os.makedirs(os.path.dirname(PROGRESS_FILE), exist_ok=True)
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=2)


def guess_category(slug, description=""):
    """Guess our category from the tool slug and description."""
    text = (slug + " " + description).lower()
    for keyword, cat in CATEGORY_MAP.items():
        if keyword in text:
            return cat
    return "기타"


def translate_safe(text):
    if not text or len(text.strip()) < 3:
        return "AI 도구"
    try:
        return GoogleTranslator(source='en', target='ko').translate(text[:500])
    except:
        return text


def scrape_tool_page(url):
    """Scrape a single Futurepedia tool page for metadata."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=12)
        if resp.status_code != 200:
            return None
        
        html = resp.text
        
        # Extract tool name from <title>
        title_match = re.search(r'<title>([^<|]+)', html)
        name = title_match.group(1).strip() if title_match else None
        # Clean common suffixes
        if name:
            name = re.sub(r'\s*[-|–]\s*(Futurepedia|AI Tool).*$', '', name).strip()
        
        # Extract description from meta
        desc_match = re.search(r'<meta\s+(?:name|property)="(?:description|og:description)"\s+content="([^"]*)"', html)
        description = desc_match.group(1).strip() if desc_match else ""
        
        # Extract external website URL (the actual tool's website)
        # Futurepedia links to external sites with rel="nofollow noopener"
        ext_matches = re.findall(
            r'href="(https?://(?!(?:www\.)?futurepedia\.io|(?:www\.)?twitter\.com|(?:www\.)?facebook\.com|(?:www\.)?linkedin\.com|(?:www\.)?youtube\.com|(?:www\.)?instagram\.com|(?:www\.)?tiktok\.com|(?:www\.)?discord\.)[^"]+)"[^>]*(?:rel="[^"]*nofollow|target="_blank")',
            html
        )
        external_url = ext_matches[0] if ext_matches else None
        
        # Check if free
        is_free = bool(re.search(r'(?:Free|Freemium|free plan|free tier)', html, re.IGNORECASE))
        
        # Extract og:image for thumbnail
        og_img_match = re.search(r'<meta\s+property="og:image"\s+content="([^"]*)"', html)
        og_image = og_img_match.group(1) if og_img_match else ""
        
        if not name or len(name) < 2:
            return None
        
        return {
            "name": name,
            "description": description,
            "external_url": external_url,
            "is_free": is_free,
            "og_image": og_image,
        }
    except Exception as e:
        return None


def run():
    print("🚀 Futurepedia Bulk Scraper v2 (Sitemap-based)")
    print("=" * 60)
    
    # 1. Get all tool URLs from sitemap
    all_tool_urls = get_tool_urls_from_sitemap()
    if not all_tool_urls:
        print("❌ Could not fetch sitemap. Exiting.")
        return
    
    # 2. Load progress — skip already-processed URLs
    progress = load_progress()
    done_set = set(progress.get("sitemap_done", []))
    remaining = [u for u in all_tool_urls if u not in done_set]
    random.shuffle(remaining)  # Randomize to spread load
    
    print(f"📊 Total: {len(all_tool_urls)} | Done: {len(done_set)} | Remaining: {len(remaining)}")
    
    if not remaining:
        print("🎉 All tools from sitemap have been processed!")
        progress["sitemap_done"] = []  # Reset for next round
        save_progress(progress)
        return
    
    # 3. Load existing DB for dedup
    existing_urls, existing_names = load_existing()
    
    # 4. Scrape each tool page
    added = 0
    new_entries = []
    
    # Get max ID
    max_id = 0
    with open(TOOLS_JSONL, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            try:
                max_id = max(max_id, json.loads(line).get("id", 0))
            except:
                pass
    
    batch = remaining[:MAX_NEW_PER_RUN * 2]  # Fetch more than needed (some will be dupes)
    
    for i, fp_url in enumerate(batch):
        if added >= MAX_NEW_PER_RUN:
            break
        
        slug = fp_url.split("/tool/")[-1]
        print(f"  [{i+1}/{len(batch)}] {slug}...", end=" ")
        
        data = scrape_tool_page(fp_url)
        done_set.add(fp_url)
        
        if not data:
            print("⏭️ skip (no data)")
            continue
        
        ext_url = data.get("external_url", "")
        if not ext_url:
            print("⏭️ skip (no external URL)")
            continue
        
        # Dedup check
        norm_url = ext_url.rstrip("/").lower().replace("www.", "").replace("https://", "").replace("http://", "")
        norm_name = data["name"].lower().strip()
        
        if norm_url in existing_urls or norm_name in existing_names:
            print("⏭️ skip (duplicate)")
            continue
        
        existing_urls.add(norm_url)
        existing_names.add(norm_name)
        
        # Translate description
        desc_ko = translate_safe(data["description"])
        
        # Get hostname for thumbnail
        hostname = ""
        try:
            hostname = ext_url.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        except:
            pass
        
        max_id += 1
        entry = {
            "id": max_id,
            "name": data["name"],
            "description": desc_ko,
            "category": guess_category(slug, data["description"]),
            "url": ext_url,
            "isFree": data["is_free"],
            "thumbnail": f"https://logo.clearbit.com/{hostname}" if hostname else "",
        }
        
        new_entries.append(json.dumps(entry, ensure_ascii=False) + "\n")
        added += 1
        print(f"✅ {data['name']}")
        
        # Polite delay
        time.sleep(random.uniform(1.5, 3))
    
    # 5. Save progress
    progress["sitemap_done"] = list(done_set)
    save_progress(progress)
    
    # 6. Prepend new entries to JSONL
    if new_entries:
        with open(TOOLS_JSONL, 'r', encoding='utf-8') as f:
            existing_lines = f.readlines()
        with open(TOOLS_JSONL, 'w', encoding='utf-8') as f:
            f.writelines(new_entries + existing_lines)
    
    print(f"\n{'='*60}")
    print(f"✅ Added {added} new tools from Futurepedia")
    print(f"📊 Progress: {len(done_set)}/{len(all_tool_urls)} tool pages processed")
    print(f"{'='*60}")


if __name__ == "__main__":
    run()
