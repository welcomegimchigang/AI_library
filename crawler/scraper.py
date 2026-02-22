import os
import json
import urllib.request
import time
import random

# A mock scraper that demonstrates how we would pull data from an API or HTML
# In a real environment, we would use BeautifulSoup or cloud APIs like Apify.
# Here we simulate fetching 5 new trending tools from a generic AI directory.

def fetch_trending_tools():
    print("[Scraper] Fetching latest trending AI tools from directories...")
    time.sleep(1.5) # Simulate network request
    
    # Mocked data from a global directory (e.g. ProductHunt or TheresAnAIForThat)
    scraped_data = [
        {"name": "Viggle AI", "type": "비디오 생성", "desc": "Make any character move however you want. Comical AI motion generation.", "url": "https://viggle.ai", "pricing": "free"},
        {"name": "Gamma App", "type": "프레젠테이션", "desc": "A new medium for presenting ideas. Not a slide deck.", "url": "https://gamma.app", "pricing": "freemium/paid"},
        {"name": "Devin", "type": "소프트웨어 엔지니어링", "desc": "The first AI software engineer that can code whole setups.", "url": "https://cognition.ai", "pricing": "paid"},
        {"name": "Udio", "type": "음악 생성", "desc": "Create extraordinary music in seconds. Unbelievable vocal clarity.", "url": "https://udio.com", "pricing": "freemium/paid"},
        {"name": "Suno", "type": "음악", "desc": "Make a song about anything.", "url": "https://suno.com", "pricing": "freemium/paid"}
    ]
    print(f"[Scraper] Found {len(scraped_data)} new AI tools trending today.")
    return scraped_data

def translate_to_korean(text):
    # In production, we'd hook this to DeepL API or OpenAI API wrapper.
    # For now, we mock the translation map to demonstrate the pipeline.
    translations = {
        "Make any character move however you want. Comical AI motion generation.": "캐릭터를 원하는 대로 움직이게 만듭니다. 재미있는 AI 모션 생성.",
        "A new medium for presenting ideas. Not a slide deck.": "아이디어를 퍼블리싱하는 새로운 매체, 단순한 슬라이드가 아닙니다.",
        "The first AI software engineer that can code whole setups.": "전체 셋업을 코딩할 수 있는 세계 최초의 AI 소프트웨어 엔지니어.",
        "Create extraordinary music in seconds. Unbelievable vocal clarity.": "놀라운 음질과 선명한 보컬로 단 몇 초 만에 엄청난 음악 생성.",
        "Make a song about anything.": "무엇이든 주제로 노래를 만들어보세요."
    }
    return translations.get(text, text)

def export_to_jsonl(tools, output_file):
    print("[Translator] Translating descriptions to Korean...")
    
    formatted_data = []
    # Convert to match original tools.jsonl schema: damoa_id, serviceName, serviceType, website, price_bucket, keyFeatures_list
    for idx, t in enumerate(tools):
        translated_desc = translate_to_korean(t["desc"])
        formatted = {
            "damoa_id": random.randint(1500, 99999),  # Give random big ID for new items
            "serviceName": t["name"],
            "serviceType": t["type"],
            "website": t["url"],
            "price_bucket": t["pricing"],
            "keyFeatures_list": [translated_desc],
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
    data = fetch_trending_tools()
    export_to_jsonl(data, TARGET_JSONL)
