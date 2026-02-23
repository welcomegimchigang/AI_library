import json
import random
import os
import urllib.parse

def get_domain(url):
    try:
        domain = urllib.parse.urlparse(url).netloc
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain
    except:
        return ""

def generate_heuristic_visits(tool_id, category):
    # Deterministic randomness based on ID so it's consistent
    random.seed(int(tool_id))
    
    base_id = int(tool_id)
    
    # Very famous tools (id < 91000) get 10M-1B visits
    if base_id < 91000:
        return random.randint(10000000, 500000000)
    # Famous tools
    elif base_id < 95000:
        return random.randint(1000000, 10000000)
    # Niche tools
    else:
        return random.randint(10000, 500000)

def process_tool(line):
    if not line.strip():
        return None
    try:
        tool = json.loads(line)
        domain = get_domain(tool.get('url', ''))
        
        visits = generate_heuristic_visits(tool.get('id', 99999), tool.get('category', ''))
        
        tool['monthly_visits'] = visits
        return json.dumps(tool, ensure_ascii=False)
    except Exception as e:
        print(f"Error parsing line: {e}")
        return line

def main():
    input_file = "c:/Users/sungu/Desktop/AI-library/dist/data/tools.jsonl"
    output_file = "c:/Users/sungu/Desktop/AI-library/dist/data/tools_with_traffic.jsonl"
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    print(f"Loaded {len(lines)} tools. Generating traffic data...")
    
    updated_lines = []
    for line in lines:
        res = process_tool(line)
        if res:
            updated_lines.append(res)
                
    with open(output_file, 'w', encoding='utf-8') as f:
        for line in updated_lines:
            f.write(line + "\n")
            
    print(f"Successfully updated traffic data and saved to {output_file}")

if __name__ == "__main__":
    main()
