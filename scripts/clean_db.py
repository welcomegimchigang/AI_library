import json
import os

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
    
    # Write phase
    with open(filepath, 'w', encoding='utf-8') as f:
        for tool in valid_tools:
            f.write(json.dumps(tool, ensure_ascii=False) + "\n")
            
    print(f"Database cleaned. {len(valid_tools)} unique items maintained.")

if __name__ == "__main__":
    clean_database()
