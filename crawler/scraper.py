import os
import json
import random
import requests
import re
from deep_translator import GoogleTranslator

# Target Open-Source Database (Daily updated by AI community)
AWESOME_LIST_URL = "https://raw.githubusercontent.com/steven2358/awesome-generative-ai/main/README.md"

def fetch_trending_tools(limit=5):
    print(f"[Scraper] Fetching latest AI tools from GitHub Awesome List...")
    try:
        response = requests.get(AWESOME_LIST_URL, timeout=10)
        response.raise_for_status()
        content = response.text
        
        # Regex to find standard Markdown links with descriptions
        # e.g., "- [Tool Name](https://link.com) - A cool description."
        pattern = r'^[-*]\s+\[(.*?)\]\((http.*?)\)\s*[-:]?\s*(.*)$'
        matches = re.findall(pattern, content, re.MULTILINE)
        
        if not matches:
            print("[Scraper] Warning: Could not parse any tools with regex.")
            return []
            
        print(f"[Scraper] Successfully parsed {len(matches)} AI resources from open source.")
        
        # Pick a random sample of `limit` tools
        chosen_matches = random.sample(matches, min(len(matches), limit))
        
        scraped_data = []
        for name, url, desc in chosen_matches:
            scraped_data.append({
                "name": name.strip(),
                "url": url.strip(),
                "desc": desc.strip('[]*` '), # Clean up trailing markdown artifacts
                "type": "기타", # Default category, can be refined later
                "pricing": "freemium/paid" 
            })
            
        return scraped_data
        
    except Exception as e:
        print(f"[ScraperError] Failed to fetch data: {e}")
        return []

def translate_to_korean(text):
    if not text or len(text.strip()) == 0:
        return "설명 없음"
    try:
        translator = GoogleTranslator(source='en', target='ko')
        # Google Translator block limit/rate limit protection
        # For small sentences, direct translation is fine.
        translated = translator.translate(text)
        return translated
    except Exception as e:
        print(f"[TranslatorError] Translation failed for text '{text[:20]}...': {e}")
        return text

def export_to_jsonl(tools, output_file):
    print(f"[Translator] Translating {len(tools)} descriptions to Korean using deep-translator...")
    
    formatted_data = []
    for t in tools:
        translated_desc = translate_to_korean(t["desc"])
        translated_name = translate_to_korean(t["name"]) # Translate name if it's purely English
        
        formatted = {
            "id": random.randint(1500, 99999), 
            "name": f"{t['name']} ({translated_name})", # Keep both in main name field for now as per current convention
            "name_en": t["name"],
            "description": translated_desc,
            "description_en": t["desc"],
            "category": t["type"],
            "url": t["url"],
            "isFree": False,
            "thumbnail": f"https://logo.clearbit.com/{t['url'].replace('https://', '').replace('http://', '').split('/')[0]}"
        }
        formatted_data.append(formatted)
        
    print(f"[Export] Appending {len(formatted_data)} translated tools to {output_file}...")
    
    with open(output_file, 'a', encoding='utf-8') as f:
        for item in formatted_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
            
    print("[Success] Pipeline finished successfully.")

if __name__ == "__main__":
    TARGET_JSONL = os.path.join("public", "data", "tools.jsonl")
    data = fetch_trending_tools(limit=50) # Set back to 50 for daily background scraping
    if data:
        export_to_jsonl(data, TARGET_JSONL)
    else:
        print("[Exit] No data scraped today.")
