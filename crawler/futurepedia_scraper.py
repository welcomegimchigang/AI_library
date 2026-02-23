"""
Futurepedia Scraper - Extracts AI tools from Futurepedia.com
Runs daily via GitHub Actions. Fetches category pages, parses tool listings,
translates to Korean, and appends to tools.jsonl.
"""
import os
import json
import random
import time
import requests
from deep_translator import GoogleTranslator

# Futurepedia has a public JSON-like API behind their category pages
# We use their sitemap/category structure to discover tools
FUTUREPEDIA_CATEGORIES = [
    "copywriting", "image-generator", "marketing", "video-editing",
    "productivity", "code-assistant", "chatbot", "design",
    "music", "education", "social-media", "seo", "writing",
    "transcription", "email", "presentation", "research",
    "finance", "healthcare", "gaming", "legal", "real-estate",
    "fitness", "travel", "cooking", "fashion", "psychology",
    "startup-tools", "developer-tools", "data-analysis",
    "3d-modeling", "text-to-speech", "voice-cloning",
    "resume-builder", "translation", "spreadsheet",
    "customer-support", "sales", "human-resources",
    "e-commerce", "automation", "personal-assistant"
]

TOOLS_JSONL = os.path.join("public", "data", "tools.jsonl")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Track processed file to avoid re-scraping same categories
PROGRESS_FILE = os.path.join("data", "futurepedia_progress.json")

def load_existing_urls():
    """Load existing tool URLs to avoid duplicates."""
    urls = set()
    if os.path.exists(TOOLS_JSONL):
        with open(TOOLS_JSONL, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    obj = json.loads(line)
                    if "url" in obj:
                        # Normalize URL for comparison
                        url = obj["url"].rstrip("/").lower().replace("www.", "")
                        urls.add(url)
                except:
                    pass
    return urls

def load_progress():
    """Load which categories have been processed."""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    return {"processed": [], "round": 1}

def save_progress(progress):
    os.makedirs(os.path.dirname(PROGRESS_FILE), exist_ok=True)
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=2)

def translate_to_korean(text):
    if not text or len(text.strip()) == 0:
        return "설명 없음"
    try:
        translator = GoogleTranslator(source='en', target='ko')
        return translator.translate(text[:500])
    except:
        return text

def scrape_futurepedia_category(category):
    """Scrape tools from a Futurepedia category page."""
    tools = []
    
    # Try the HTML page and parse tool cards
    url = f"https://www.futurepedia.io/ai-tools/{category}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"  [Skip] {category}: HTTP {resp.status_code}")
            return []
        
        html = resp.text
        
        # Extract tool data from the page using simple string parsing
        # Futurepedia renders tool cards with structured data
        # Look for JSON-LD or structured patterns
        import re
        
        # Method 1: Find tool links and names from the HTML
        # Pattern: tool cards with href="/tool/toolname"
        tool_pattern = r'href="/tool/([^"]+)"[^>]*>.*?'
        
        # Method 2: Look for tool card structures
        # Each tool typically has: name, description, url, pricing
        card_blocks = re.findall(r'<a[^>]*href="/tool/([^"]+)"[^>]*>(.*?)</a>', html, re.DOTALL)
        
        if not card_blocks:
            # Try alternative pattern - look for tool names in headings
            name_matches = re.findall(r'<h[23][^>]*>(.*?)</h[23]>', html)
            link_matches = re.findall(r'href="(https?://[^"]+)"[^>]*rel="nofollow"', html)
            desc_matches = re.findall(r'<p[^>]*class="[^"]*text-gray[^"]*"[^>]*>(.*?)</p>', html, re.DOTALL)
            
            for i in range(min(len(name_matches), len(link_matches))):
                name = re.sub(r'<[^>]+>', '', name_matches[i]).strip()
                if not name or len(name) < 2:
                    continue
                tools.append({
                    "name": name,
                    "url": link_matches[i] if i < len(link_matches) else "",
                    "description": re.sub(r'<[^>]+>', '', desc_matches[i]).strip() if i < len(desc_matches) else "",
                    "category_hint": category,
                })
        else:
            for slug, content in card_blocks[:20]:  # Limit per category
                name = re.sub(r'<[^>]+>', '', content).strip()
                if not name or len(name) < 2:
                    continue
                
                # Try to get the tool's external URL from the detail page
                tools.append({
                    "name": name,
                    "url": f"https://www.futurepedia.io/tool/{slug}",
                    "description": "",
                    "category_hint": category,
                })
        
        print(f"  [OK] {category}: Found {len(tools)} tools")
        
    except Exception as e:
        print(f"  [Error] {category}: {e}")
    
    return tools

def get_tool_details(tool_slug_url):
    """Get detailed info from a Futurepedia tool page."""
    try:
        resp = requests.get(tool_slug_url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            return None
        
        import re
        html = resp.text
        
        # Extract the external URL
        ext_url_match = re.search(r'href="(https?://(?!www\.futurepedia)[^"]+)"[^>]*(?:rel="nofollow"|target="_blank")', html)
        ext_url = ext_url_match.group(1) if ext_url_match else None
        
        # Extract description
        desc_match = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', html)
        description = desc_match.group(1) if desc_match else ""
        
        # Extract pricing info
        is_free = bool(re.search(r'(?:free|freemium)', html, re.IGNORECASE))
        
        return {
            "external_url": ext_url,
            "description": description,
            "is_free": is_free,
        }
    except:
        return None

def map_category(hint):
    """Map Futurepedia category slug to our Korean categories."""
    mapping = {
        "copywriting": "텍스트/문서", "writing": "텍스트/문서", "email": "텍스트/문서",
        "image-generator": "이미지/아트", "design": "이미지/아트", "3d-modeling": "이미지/아트",
        "video-editing": "비디오/오디오", "music": "비디오/오디오", "transcription": "비디오/오디오",
        "text-to-speech": "비디오/오디오", "voice-cloning": "비디오/오디오",
        "code-assistant": "개발/코드", "developer-tools": "개발/코드",
        "marketing": "비즈니스/마케팅", "social-media": "비즈니스/마케팅", "seo": "비즈니스/마케팅",
        "sales": "비즈니스/마케팅", "e-commerce": "비즈니스/마케팅",
        "education": "교육/학습", "research": "교육/학습", "translation": "교육/학습",
        "productivity": "생산성/협업", "automation": "생산성/협업", "spreadsheet": "생산성/협업",
        "presentation": "생산성/협업", "personal-assistant": "생산성/협업",
        "finance": "금융/투자",
        "healthcare": "건강/피트니스", "fitness": "건강/피트니스",
        "chatbot": "텍스트/문서", "customer-support": "기타",
        "legal": "기타", "real-estate": "기타", "travel": "기타", "cooking": "기타",
        "fashion": "기타", "psychology": "기타", "resume-builder": "기타",
        "gaming": "기타", "startup-tools": "기타", "human-resources": "기타",
        "data-analysis": "개발/코드",
    }
    return mapping.get(hint, "기타")

def append_tools_to_jsonl(tools_data):
    """Append new tools to tools.jsonl with Korean translations."""
    existing_urls = load_existing_urls()
    added = 0
    
    with open(TOOLS_JSONL, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find max ID
    max_id = 0
    for line in lines:
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
            max_id = max(max_id, obj.get("id", 0))
        except:
            pass
    
    new_lines = []
    for tool in tools_data:
        url = tool.get("external_url") or tool.get("url", "")
        if not url:
            continue
        
        normalized = url.rstrip("/").lower().replace("www.", "")
        if normalized in existing_urls:
            continue
        if "futurepedia.io" in normalized:
            continue  # Skip internal Futurepedia URLs
        
        existing_urls.add(normalized)
        max_id += 1
        
        desc_en = tool.get("description", "")
        desc_ko = translate_to_korean(desc_en) if desc_en else "설명 없음"
        
        hostname = ""
        try:
            hostname = url.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        except:
            pass
        
        entry = {
            "id": max_id,
            "name": tool["name"],
            "description": desc_ko,
            "category": map_category(tool.get("category_hint", "")),
            "url": url,
            "isFree": tool.get("is_free", False),
            "thumbnail": f"https://logo.clearbit.com/{hostname}" if hostname else "",
        }
        
        new_lines.append(json.dumps(entry, ensure_ascii=False) + "\n")
        added += 1
        
        if added >= 80:  # 초반 부스트: 하루 최대 80개
            break
    
    if new_lines:
        # Prepend new tools to the file
        with open(TOOLS_JSONL, 'w', encoding='utf-8') as f:
            f.writelines(new_lines + lines)
    
    return added

def run():
    print("🔍 Futurepedia Scraper Starting...")
    print("=" * 50)
    
    progress = load_progress()
    remaining = [c for c in FUTUREPEDIA_CATEGORIES if c not in progress["processed"]]
    
    if not remaining:
        # All categories done, start a new round
        progress["processed"] = []
        progress["round"] += 1
        remaining = FUTUREPEDIA_CATEGORIES.copy()
        print(f"🔄 Starting Round {progress['round']} - all categories reset")
    
    # Process 8 categories per run (초반 부스트)
    batch = remaining[:8]
    all_tools = []
    
    for category in batch:
        print(f"\n📂 Scraping category: {category}")
        tools = scrape_futurepedia_category(category)
        
        # Get details for each tool (with delays)
        for tool in tools[:20]:  # Limit detail fetches
            if tool["url"].startswith("https://www.futurepedia.io/tool/"):
                time.sleep(random.uniform(2, 4))  # Be polite - avoid bans
                details = get_tool_details(tool["url"])
                if details and details.get("external_url"):
                    tool["external_url"] = details["external_url"]
                    tool["description"] = details.get("description", tool.get("description", ""))
                    tool["is_free"] = details.get("is_free", False)
            
            all_tools.append(tool)
        
        progress["processed"].append(category)
        time.sleep(random.uniform(5, 8))  # Longer delay between categories to avoid ban
    
    save_progress(progress)
    
    if all_tools:
        added = append_tools_to_jsonl(all_tools)
        print(f"\n✅ Added {added} new tools from Futurepedia")
    else:
        print("\n⚠️ No new tools found this run")
    
    print(f"📊 Progress: {len(progress['processed'])}/{len(FUTUREPEDIA_CATEGORIES)} categories (Round {progress['round']})")
    print("=" * 50)

if __name__ == "__main__":
    run()
