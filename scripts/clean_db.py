import json
import os
import requests

KV_API_URL = os.environ.get("KV_API_URL", "https://ai-library-dhm.pages.dev/api/missing")
KV_API_SECRET = os.environ.get("KV_API_SECRET")

def fetch_pending_deletes():
    """Fetch pending_delete queries from KV."""
    if not KV_API_SECRET:
        print("Warning: KV_API_SECRET not set. Skipping KV pending_delete fetch.")
        return []
    try:
        url = f"{KV_API_URL}?action=list&secret={KV_API_SECRET}"
        resp = requests.get(url)
        resp.raise_for_status()
        data = resp.json()
        if data.get("success"):
            items = data.get("data", [])
            # Only return items marked for deletion
            return [item for item in items if item.get("data", {}).get("status") == "pending_delete"]
        return []
    except Exception as e:
        print(f"Error fetching pending deletes from KV: {e}")
        return []

def delete_kv_item(key):
    """Delete an item from KV once processed."""
    try:
        url = f"{KV_API_URL}?action=delete&key={key}&secret={KV_API_SECRET}"
        requests.get(url)
        print(f"Removed processed task {key} from KV.")
    except Exception as e:
        print(f"Failed to delete {key} from KV: {e}")

def clean_database():
    filepath = os.path.join("public", "data", "tools.jsonl")
    
    if not os.path.exists(filepath):
        print(f"Error: {filepath} not found!")
        return

    # To track duplicates
    seen_names = set()
    seen_urls = set()
    
    valid_tools = []
    
    # Read phase
    with open(filepath, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                tool = json.loads(line)
                name_key = str(tool.get("name", "")).strip().lower()
                url_key = str(tool.get("url", "")).strip().lower()
                
                # Check for duplicities using domain or name matching
                if name_key in seen_names or (url_key and url_key in seen_urls):
                    print(f"Removed duplicate tool: {tool.get('name')}")
                    continue
                
                if name_key:
                    seen_names.add(name_key)
                if url_key:
                    seen_urls.add(url_key)
                    
                valid_tools.append(tool)
            except json.JSONDecodeError:
                print(f"Warning: line {line_num} is not valid JSON, skipping.")

    # Sort phase: latest tools first (descending by ID assuming newer equals higher ID)
    valid_tools.sort(key=lambda x: x.get('id', 0), reverse=True)
    
    # Check for pending deletes from KV
    pending_deletes = fetch_pending_deletes()
    tools_to_remove = set()
    for item in pending_deletes:
        target = str(item.get("data", {}).get("query", "")).strip().lower()
        if target:
            tools_to_remove.add(target)
            
    final_tools = []
    removed_by_admin = 0
    
    for tool in valid_tools:
        name_key = str(tool.get("name", "")).strip().lower()
        # Admin delete logic (exact match for now, could be enhanced)
        if name_key in tools_to_remove:
            print(f"Removed tool by Admin Request: {tool.get('name')}")
            removed_by_admin += 1
            continue
        final_tools.append(tool)
        
    # Mark KV items as resolved
    if removed_by_admin > 0 or len(tools_to_remove) > 0:
        for item in pending_deletes:
            delete_kv_item(item.get("key"))
    
    # Write phase
    with open(filepath, 'w', encoding='utf-8') as f:
        for tool in final_tools:
            f.write(json.dumps(tool, ensure_ascii=False) + "\n")
            
    print(f"Database cleaned. {len(final_tools)} unique items maintained. Removed by admin: {removed_by_admin}.")

if __name__ == "__main__":
    clean_database()
