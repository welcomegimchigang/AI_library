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

def delete_resolved_query(key):
    """Delete a query from KV once it's resolved."""
    try:
        url = f"{KV_API_URL}?action=delete&key={key}&secret={KV_API_SECRET}"
        requests.get(url)
    except Exception as e:
        print(f"Failed to delete {key} from KV: {e}")

def search_web_for_tools(query):
    """Search DuckDuckGo broadly for AI tools matching the query."""
    print(f"Searching web for: {query} AI tools...")
    results = []
    try:
        with DDGS() as ddgs:
            # We search in English for richer AI tool results
            search_gen = ddgs.text(f"{query} AI tool software", max_results=5)
            for r in search_gen:
                results.append(r)
    except Exception as e:
        print(f"Search failed: {e}")
    return results

def analyze_and_extract_tool(query, search_results):
    """Use GPT-4o-mini to pick the best actual tool from search results."""
    if not OPENAI_API_KEY or not search_results:
        return None

    client = OpenAI(api_key=OPENAI_API_KEY)
    
    system_prompt = """
    You are an expert AI tool curator. 
    The user was looking for an AI tool related to: "{query}" but couldn't find one in our database.
    I have provided web search results below. 
    1. Identify the BEST single, specific, real-world AI software tool from these search results that solves the user's need.
    2. Extract its exact Name, URL, and a 1-sentence description in Korean.
    3. If there is no clear software tool (e.g., just news articles or general concepts), return null.
    4. Respond ONLY in pristine JSON format, no markdown blocks, like exactly this:
    {{"name": "ToolName", "url": "https://tool.com", "description": "한국어 설명 1줄"}}
    """
    
    user_prompt = f"Query: {query}\n\nSearch Results:\n{json.dumps(search_results, ensure_ascii=False)}"
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt.format(query=query)},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=200
        )
        content = response.choices[0].message.content.strip()
        # Clean up possible markdown
        content = re.sub(r'```json\n?', '', content)
        content = re.sub(r'```\n?', '', content).strip()
        
        tool_data = json.loads(content)
        if tool_data and "name" in tool_data and "url" in tool_data:
            return tool_data
        return None
    except Exception as e:
        print(f"GPT Analysis failed: {e}")
        return None

def append_to_jsonl(tool_data):
    """Prepend the newly discovered tool to tools.jsonl with a new ID."""
    if not tool_data: return False
    
    try:
        # Read existing to find highest ID
        existing_lines = []
        highest_id = 0
        if os.path.exists(TARGET_JSONL):
            with open(TARGET_JSONL, 'r', encoding='utf-8') as f:
                existing_lines = f.readlines()
                for line in existing_lines:
                    if not line.strip(): continue
                    try:
                        obj = json.loads(line)
                        if "id" in obj and isinstance(obj["id"], int):
                            highest_id = max(highest_id, obj["id"])
                    except: pass
        
        new_id = highest_id + 1
        
        # Structure the new entry
        new_entry = {
            "id": new_id,
            "name": tool_data["name"],
            "description": tool_data.get("description", ""),
            "category": "기타", # Defaulting to 기타, user can refine
            "url": tool_data["url"],
            "isFree": False, # Safer default
            "thumbnail": f"https://logo.clearbit.com/{tool_data['url'].split('//')[-1].split('/')[0]}"
        }
        
        # Prepend to file
        with open(TARGET_JSONL, 'w', encoding='utf-8') as f:
            f.write(json.dumps(new_entry, ensure_ascii=False) + '\n')
            for line in existing_lines:
                f.write(line)
            
        print(f"✅ Successfully auto-resolved and added: {tool_data['name']}")
        return True
    except Exception as e:
        print(f"Failed to write to db: {e}")
        return False

def run_auto_resolver():
    print("--- Starting AI Tool Auto-Resolver ---")
    missing_items = fetch_missing_queries()
    
    if not missing_items:
        print("No missing queries pending in KV.")
        return
        
    print(f"Found {len(missing_items)} pending queries. Resolving...")
    
    for item in missing_items:
        key = item["key"]
        query_data = item["data"]
        query_text = query_data.get("query")
        
        if not query_text: continue
        
        search_results = search_web_for_tools(query_text)
        if not search_results:
            print(f"No web results found for: {query_text}")
            continue
            
        curated_tool = analyze_and_extract_tool(query_text, search_results)
        
        if curated_tool:
            success = append_to_jsonl(curated_tool)
            if success:
                delete_resolved_query(key)
        else:
            print(f"❌ GPT could not extract a valid tool for: {query_text}")

if __name__ == "__main__":
    run_auto_resolver()
