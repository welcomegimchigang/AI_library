"""
TAAFT (There's An AI For That) Bulk Scraper v2
Scrapes tool slugs from TAAFT category pages, then visits each tool page
to extract name, description, external URL, and pricing info.
"""
import os
import sys
import json
import random
import time
import re
import requests

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

try:
    from deep_translator import GoogleTranslator
    HAS_TRANSLATOR = True
except ImportError:
    HAS_TRANSLATOR = False

TOOLS_JSONL = os.path.join("public", "data", "tools.jsonl")
PROGRESS_FILE = os.path.join("data", "taaft_progress.json")
MAX_NEW_PER_RUN = 150

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

TAAFT_CATEGORIES = [
    "writing", "marketing", "image-generation", "video", "chatbots",
    "productivity", "code-assistant", "seo", "social-media", "education",
    "music", "design", "research", "finance", "healthcare",
    "e-commerce", "sales", "customer-support", "human-resources", "legal",
    "fitness", "gaming", "automation", "presentation", "transcription",
    "translation", "email", "data-analysis", "spreadsheets", "copywriting",
    "art", "text-to-speech", "voice", "3d", "photo-editing",
    "video-editing", "meetings", "project-management", "resume",
    "content-creation", "paraphrasing", "summarization", "text-generation",
    "story-writing", "logo-design", "website-builder", "audio",
]

CATEGORY_MAP = {
    "writing": "텍스트/문서", "copywriting": "텍스트/문서", "text-generation": "텍스트/문서",
    "paraphrasing": "텍스트/문서", "summarization": "텍스트/문서", "story-writing": "텍스트/문서",
    "email": "텍스트/문서", "content-creation": "텍스트/문서",
    "image-generation": "이미지/아트", "art": "이미지/아트", "design": "이미지/아트",
    "photo-editing": "이미지/아트", "3d": "이미지/아트", "logo-design": "이미지/아트",
    "video": "비디오/오디오", "video-editing": "비디오/오디오", "music": "비디오/오디오",
    "audio": "비디오/오디오", "text-to-speech": "비디오/오디오", "voice": "비디오/오디오",
    "transcription": "비디오/오디오",
    "code-assistant": "개발/코드", "data-analysis": "개발/코드",
    "marketing": "비즈니스/마케팅", "seo": "비즈니스/마케팅", "social-media": "비즈니스/마케팅",
    "sales": "비즈니스/마케팅", "e-commerce": "비즈니스/마케팅",
    "education": "교육/학습", "research": "교육/학습", "translation": "교육/학습",
    "productivity": "생산성/협업", "automation": "생산성/협업", "meetings": "생산성/협업",
    "project-management": "생산성/협업", "presentation": "생산성/협업",
    "spreadsheets": "생산성/협업", "website-builder": "생산성/협업",
    "finance": "금융/투자",
    "healthcare": "건강/피트니스", "fitness": "건강/피트니스",
    "chatbots": "텍스트/문서", "customer-support": "비즈니스/마케팅",
    "human-resources": "비즈니스/마케팅", "legal": "기타", "gaming": "기타",
    "resume": "기타",
}

SKIP_SLUGS = {"chatgpt", "claude", "gemini", "midjourney", "perplexity", "copilot"}


def load_existing():
    urls = set()
    names = set()
    if os.path.exists(TOOLS_JSONL):
        with open(TOOLS_JSONL, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    obj = json.loads(line)
                    if obj.get("url"):
                        urls.add(obj["url"].rstrip("/").lower().replace("www.", "").replace("https://", "").replace("http://", ""))
                    if obj.get("name"):
                        names.add(obj["name"].lower().strip())
                except:
                    pass
    return urls, names


def get_max_id():
    max_id = 0
    with open(TOOLS_JSONL, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            try:
                max_id = max(max_id, json.loads(line).get("id", 0))
            except:
                pass
    return max_id


def translate_safe(text):
    if not text or len(text.strip()) < 3:
        return "AI 도구"
    if not HAS_TRANSLATOR:
        return text
    try:
        return GoogleTranslator(source='en', target='ko').translate(text[:500])
    except:
        return text


def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    return {"done_categories": [], "done_slugs": [], "round": 1}


def save_progress(progress):
    os.makedirs(os.path.dirname(PROGRESS_FILE), exist_ok=True)
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)


def get_slugs_from_category(category_slug):
    """Fetch all tool slugs from a TAAFT category page."""
    url = f"https://theresanaiforthat.com/s/{category_slug}/"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            return []
        # Extract /ai/slug/ links from HTML
        slugs = re.findall(r'href="/ai/([^/"]+)/"', resp.text)
        unique = list(dict.fromkeys(slugs))
        # Filter out non-tool slugs
        filtered = [s for s in unique if len(s) > 1 and s not in SKIP_SLUGS]
        return filtered
    except:
        return []


def scrape_tool_page(slug):
    """Scrape a single TAAFT tool page for name, description, and external URL."""
    url = f"https://theresanaiforthat.com/ai/{slug}/"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=12)
        if resp.status_code != 200:
            return None
        html = resp.text

        # Name from <title>
        title_match = re.search(r'<title>([^<]+)</title>', html)
        name = ""
        if title_match:
            name = title_match.group(1).strip()
            name = re.sub(r'\s*[-|]\s*There.*$', '', name, flags=re.IGNORECASE).strip()
            name = re.sub(r'\s*[-|]\s*AI Tool.*$', '', name, flags=re.IGNORECASE).strip()

        # Description from meta
        desc_match = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', html)
        if not desc_match:
            desc_match = re.search(r'<meta\s+property="og:description"\s+content="([^"]*)"', html)
        description = desc_match.group(1).strip() if desc_match else ""

        # External URL: links with ?ref=taaft (the tool's actual website)
        ext_matches = re.findall(r'href="(https?://(?!theresanaiforthat\.com)[^"]*\?ref=taaft[^"]*)"', html)
        external_url = ""
        for ext in ext_matches:
            clean = re.sub(r'[?&]ref=taaft.*$', '', ext).rstrip('/')
            clean = clean.replace('&amp;', '&')
            # Skip social media, youtube, etc
            if any(x in clean.lower() for x in ['youtube.com', 'twitter.com', 'facebook.com',
                                                  'linkedin.com', 'instagram.com', 'tiktok.com',
                                                  'discord.', 'reddit.com', 'github.com']):
                continue
            external_url = clean
            break

        # Pricing
        is_free = bool(re.search(r'(?:100%\s*Free|Free\s*plan|Freemium|Free\s*\+)', html, re.IGNORECASE))

        if not name or len(name) < 2:
            return None

        return {
            "name": name,
            "description": description,
            "external_url": external_url,
            "is_free": is_free,
        }
    except:
        return None


def run():
    print("=== TAAFT Bulk Scraper v2 ===")
    print("=" * 50)

    progress = load_progress()
    done_slugs = set(progress.get("done_slugs", []))
    remaining_cats = [c for c in TAAFT_CATEGORIES if c not in progress.get("done_categories", [])]

    if not remaining_cats:
        progress["done_categories"] = []
        progress["round"] = progress.get("round", 1) + 1
        remaining_cats = TAAFT_CATEGORIES.copy()
        print(f"Starting Round {progress['round']}")

    print(f"Categories remaining: {len(remaining_cats)}/{len(TAAFT_CATEGORIES)}")

    existing_urls, existing_names = load_existing()
    max_id = get_max_id()
    added = 0
    new_entries = []

    # Process up to 10 categories per run
    batch = remaining_cats[:10]

    for cat in batch:
        print(f"\n>> Category: {cat}")
        slugs = get_slugs_from_category(cat)
        print(f"   Found {len(slugs)} tool slugs")
        time.sleep(random.uniform(2, 4))

        for slug in slugs:
            if added >= MAX_NEW_PER_RUN:
                break
            if slug in done_slugs:
                continue

            done_slugs.add(slug)

            # Visit tool page
            data = scrape_tool_page(slug)
            time.sleep(random.uniform(1.5, 3))

            if not data:
                print(f"   Skip: {slug} (no data)")
                continue

            ext_url = data.get("external_url", "")
            if not ext_url:
                print(f"   Skip: {slug} (no ext URL)")
                continue

            # Dedup
            norm_url = ext_url.rstrip("/").lower().replace("www.", "").replace("https://", "").replace("http://", "")
            norm_name = data["name"].lower().strip()
            if norm_url in existing_urls or norm_name in existing_names:
                print(f"   Skip: {data['name']} (dupe)")
                continue

            existing_urls.add(norm_url)
            existing_names.add(norm_name)

            desc_ko = translate_safe(data["description"])

            hostname = ""
            try:
                hostname = ext_url.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
            except:
                pass

            max_id += 1
            # Translate name to Korean
            name_ko = translate_safe(data["name"])
            
            entry = {
                "id": max_id,
                "name": f"{data['name']} ({name_ko})",
                "name_en": data["name"],
                "description": desc_ko,
                "description_en": data["description"],
                "category": CATEGORY_MAP.get(cat, "기타"),
                "url": ext_url,
                "isFree": data["is_free"],
                "thumbnail": f"https://logo.clearbit.com/{hostname}" if hostname else "",
            }
            new_entries.append(json.dumps(entry, ensure_ascii=False) + "\n")
            added += 1
            print(f"   + {data['name']} -> {ext_url}")

        progress["done_categories"] = progress.get("done_categories", []) + [cat]

        if added >= MAX_NEW_PER_RUN:
            break
        time.sleep(random.uniform(3, 5))

    progress["done_slugs"] = list(done_slugs)
    save_progress(progress)

    if new_entries:
        with open(TOOLS_JSONL, 'r', encoding='utf-8') as f:
            existing_lines = f.readlines()
        with open(TOOLS_JSONL, 'w', encoding='utf-8') as f:
            f.writelines(new_entries + existing_lines)

    print(f"\n{'='*50}")
    print(f"Added {added} new tools from TAAFT")
    print(f"Total slugs processed: {len(done_slugs)}")
    print(f"Categories done: {len(progress.get('done_categories', []))}/{len(TAAFT_CATEGORIES)}")
    print(f"{'='*50}")


if __name__ == "__main__":
    run()
