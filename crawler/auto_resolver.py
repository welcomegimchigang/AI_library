import os
import json
import requests
import re
from openai import OpenAI
from duckduckgo_search import DDGS

# Configuration
KV_API_URL = os.environ.get("KV_API_URL", "https://ai-library-dhm.pages.dev/api/missing")
KV_API_SECRET = os.environ.get("KV_API_SECRET")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

TARGET_JSONL = os.path.join("public", "data", "tools.jsonl")

def fetch_missing_queries():
    """Fetch pending queries from Cloudflare KV via our secure endpoint."""
    if not KV_API_SECRET:
        print("Warning: KV_API_SECRET not set. Skipping KV fetch.")
        return []
    try:
        url = f"{KV_API_URL}?action=list&secret={KV_API_SECRET}"
        resp = requests.get(url)
        resp.raise_for_status()
        data = resp.json()
        if data.get("success"):
            return data.get("data", [])
        return []
    except Exception as e:
        print(f"Error fetching from KV: {e}")
        return []

def fetch_local_queries():
    """Fetch pending queries from local JSON seed files."""
    # Try bulk file first, then mainstream
    for seed_name in ["seed_bulk.json", "seed_mainstream.json", "seed_keywords.json"]:
        seed_file = os.path.join("data", seed_name)
        if not os.path.exists(seed_file):
            continue
    
        try:
            with open(seed_file, 'r', encoding='utf-8') as f:
                keywords = json.load(f)
                
            # Format them like KV items so the rest of the code works unchanged
            results = []
            import time
            import random
            import string
            
            for kw in keywords:
                rand_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
                key = f"local_{int(time.time() * 1000)}_{rand_str}"
                results.append({
                    "key": key,
                    "data": {
                        "query": kw,
                        "intent": "search_tools",
                        "status": "pending",
                        "source": "local_seed"
                    }
                })
            print(f"[Seed] Loaded {len(results)} queries from {seed_name}")
            return results
        except Exception as e:
            print(f"Error reading {seed_name}: {e}")
            continue
    return []

def delete_resolved_query(key):
    """Delete a query from KV once it's resolved."""
    try:
        if key.startswith("local_"):
            # We don't delete from the local file automatically here during the run
            # to keep things simple. User can delete the file later.
            return
            
        url = f"{KV_API_URL}?action=delete&key={key}&secret={KV_API_SECRET}"
        requests.get(url)
    except Exception as e:
        print(f"Failed to delete {key} from KV: {e}")

def extract_core_topic(query):
    """Extract the core topic from a Korean user query for better web search."""
    # Remove common Korean filler words to get the essence
    noise = ["알려줘", "추천해줘", "추천 좀 해줘", "찾아줘", "있어?", "있나?", "할건데", "할거임", "해줘", "좀", "나", "에", "를", "을", "어떤", "써야함?", "좋은", "ai", "AI", "툴"]
    topic = query
    for word in noise:
        topic = topic.replace(word, "")
    return topic.strip()

def search_web_for_tools(query):
    """Search DuckDuckGo with multiple strategies for better coverage."""
    core_topic = extract_core_topic(query)
    print(f"Core topic extracted: '{core_topic}' from query: '{query}'")
    
    all_results = []
    search_queries = [
        f"best AI tool for {core_topic}",
        f"{core_topic} AI app website",
        f"{core_topic} artificial intelligence software",
    ]
    
    try:
        with DDGS() as ddgs:
            for sq in search_queries:
                print(f"  Searching: {sq}")
                try:
                    results = ddgs.text(sq, max_results=5)
                    for r in results:
                        all_results.append(r)
                except Exception as e:
                    print(f"  Search '{sq}' failed: {e}")
    except Exception as e:
        print(f"DuckDuckGo init failed: {e}")
    
    # Deduplicate by URL
    seen_urls = set()
    unique_results = []
    for r in all_results:
        url = r.get("href", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            unique_results.append(r)
    
    print(f"  Total unique results: {len(unique_results)}")
    return unique_results

def analyze_and_extract_tool(query, search_results):
    """Use GPT-4o-mini to pick the best actual AI tool from search results."""
    if not OPENAI_API_KEY or not search_results:
        return None

    client = OpenAI(api_key=OPENAI_API_KEY)
    
    system_prompt = """당신은 AI 도구 데이터베이스 큐레이터입니다.

사용자가 "{query}" 관련 AI 도구를 찾았지만 DB에 없었습니다.
아래 웹 검색 결과를 분석하여 가장 적합한 AI 기반 소프트웨어/앱/웹사이트를 1개 선정해주세요.

## 선정 기준 (중요도 순):
1. 해당 분야에서 실제로 AI/머신러닝 기술을 활용하는 서비스
2. 사용자가 직접 접속해서 사용할 수 있는 웹사이트 또는 앱
3. 검색 결과에 나온 것 중 가장 유명하고 신뢰할 수 있는 서비스
4. AI 기술을 직접적으로 사용하지 않더라도, 해당 분야에서 가장 유용한 디지털 도구도 허용

## 넓은 해석 허용:
- "주식 투자 AI" → 주식 분석/예측 AI 플랫폼 (예: TradingView, Kavout 등)
- "영어 공부 AI" → AI 기반 언어학습 앱 (예: Duolingo, ELSA 등)
- "반도체 설계 AI" → EDA/칩설계 AI 소프트웨어 (예: Synopsys DSO.ai 등)
- "한국사 공부 AI" → AI 기반 교육 플랫폼 (예: Quizlet, 뤼튼 등)
- "디자인 AI" → AI 기반 디자인 도구 (예: Canva, Figma AI 등)

## 카테고리 분류 (다음 중 하나를 정확히 선택):
- "이미지/아트"
- "텍스트/문서"
- "개발/코드"
- "비디오/오디오"
- "교육/학습"
- "건강/피트니스"
- "비즈니스/마케팅"
- "생산성/협업"
- "금융/투자"
- 위 분류에 애매하면 "기타"

## 응답 형식:
반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만:
{{"name": "도구이름 (한국어이름)", "url": "https://example.com", "description": "이 도구가 무엇이고 어떻게 도움이 되는지 한국어 1줄 설명", "category": "카테고리", "isFree": true}}

적합한 도구를 반드시 1개는 찾아주세요. 검색 결과에서 가장 근접한 것을 선택하되, null을 반환하지 마세요."""
    
    user_prompt = f"사용자 검색어: {query}\n\n웹 검색 결과:\n{json.dumps(search_results, ensure_ascii=False)}"
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt.format(query=query)},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )
        content = response.choices[0].message.content.strip()
        # Clean up possible markdown
        content = re.sub(r'```json\n?', '', content)
        content = re.sub(r'```\n?', '', content).strip()
        
        tool_data = json.loads(content)
        if tool_data and "name" in tool_data and "url" in tool_data:
            print(f"  GPT selected: {tool_data['name']} → {tool_data['url']}")
            return tool_data
        return None
    except Exception as e:
        print(f"GPT Analysis failed: {e}")
        return None

def append_to_jsonl(tool_data):
    """Prepend the newly discovered tool to tools.jsonl with a new ID."""
    if not tool_data: return False
    
    try:
        existing_lines = []
        highest_id = 0
        existing_urls = set()
        
        if os.path.exists(TARGET_JSONL):
            with open(TARGET_JSONL, 'r', encoding='utf-8') as f:
                existing_lines = f.readlines()
                for line in existing_lines:
                    if not line.strip(): continue
                    try:
                        obj = json.loads(line)
                        if "id" in obj and isinstance(obj["id"], int):
                            highest_id = max(highest_id, obj["id"])
                        if "url" in obj:
                            existing_urls.add(obj["url"].rstrip("/").lower())
                    except: pass
        
        # Check for duplicate URL
        new_url = tool_data["url"].rstrip("/").lower()
        if new_url in existing_urls:
            print(f"⚠️ Skipping duplicate: {tool_data['name']} (URL already exists)")
            return True  # Still counts as resolved
        
        new_id = highest_id + 1
        
        # Determine category from GPT response or default
        category = tool_data.get("category", "기타")
        valid_categories = [
            "이미지/아트", "텍스트/문서", "개발/코드", "비디오/오디오", "교육/학습",
            "건강/피트니스", "비즈니스/마케팅", "생산성/협업", "금융/투자", "기타"
        ]
        if category not in valid_categories:
            category = "기타"
        
        # Determine isFree
        is_free = tool_data.get("isFree", False)
        if isinstance(is_free, str):
            is_free = is_free.lower() in ["true", "yes", "무료"]
        
        new_entry = {
            "id": new_id,
            "name": tool_data["name"],
            "description": tool_data.get("description", ""),
            "category": category,
            "url": tool_data["url"],
            "isFree": bool(is_free),
            "thumbnail": f"https://logo.clearbit.com/{tool_data['url'].split('//')[-1].split('/')[0]}"
        }
        
        with open(TARGET_JSONL, 'w', encoding='utf-8') as f:
            f.write(json.dumps(new_entry, ensure_ascii=False) + '\n')
            for line in existing_lines:
                f.write(line)
            
        print(f"✅ Successfully auto-resolved and added: {tool_data['name']} [{category}]")
        return True
    except Exception as e:
        print(f"Failed to write to db: {e}")
        return False

def run_auto_resolver():
    print("=" * 50)
    print("🤖 AI Tool Auto-Resolver v2.0 Starting...")
    print("=" * 50)
    
    # Combine KV missing items and local seed items
    missing_items = fetch_missing_queries()
    local_items = fetch_local_queries()
    
    all_items = missing_items + local_items
    
    if not all_items:
        print("No missing queries pending in KV or local seed file. Nothing to do.")
        return
        
    print(f"📋 Found {len(all_items)} pending queries to resolve ({len(missing_items)} from KV, {len(local_items)} from local).")
    
    resolved = 0
    failed = 0
    
    for i, item in enumerate(all_items, 1):
        key = item["key"]
        query_data = item["data"]
        query_text = query_data.get("query")
        
        if not query_text: continue
        
        print(f"\n--- [{i}/{len(all_items)}] Processing: '{query_text}' ---")
        
        search_results = search_web_for_tools(query_text)
        if not search_results:
            print(f"  ❌ No web results found")
            failed += 1
            continue
            
        curated_tool = analyze_and_extract_tool(query_text, search_results)
        
        if curated_tool:
            success = append_to_jsonl(curated_tool)
            if success:
                delete_resolved_query(key)
                resolved += 1
            else:
                failed += 1
        else:
            print(f"  ❌ GPT could not extract a valid tool")
            failed += 1
    
    print(f"\n{'=' * 50}")
    print(f"🏁 Auto-Resolver Complete: {resolved} resolved, {failed} failed out of {len(all_items)} total")
    print(f"{'=' * 50}")

if __name__ == "__main__":
    run_auto_resolver()
