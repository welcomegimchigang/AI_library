import json
import os
import urllib.parse
import requests
import zipfile
import io
import math
import sys

def get_domain(url):
    try:
        domain = urllib.parse.urlparse(url).netloc
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain.lower()
    except:
        return ""

def download_tranco_ranks():
    print("Fetching latest Tranco List metadata...")
    try:
        # Get latest list ID as plain text
        res = requests.get("https://tranco-list.eu/top-1m-id", timeout=30)
        list_id = res.text.strip()
        if not list_id or len(list_id) > 10: # Sanity check for ID format
            raise Exception(f"Unexpected Tranco ID response: {list_id[:20]}")
        
        url = f"https://tranco-list.eu/download/{list_id}/1000000"
        print(f"Downloading Tranco List {list_id}...")
        res = requests.get(url, timeout=60)
        if res.status_code != 200:
            raise Exception(f"Failed to download list: {res.status_code}")
        
        ranks = {}
        for line in res.text.splitlines():
            parts = line.split(',')
            if len(parts) == 2:
                rank, domain = parts
                ranks[domain.lower()] = int(rank)
        
        print(f"Loaded {len(ranks)} domain ranks.")
        return ranks
    except Exception as e:
        print(f"Error downloading Tranco List: {e}")
        return None

def rank_to_visits(rank):
    """
    Heuristic: Map rank to monthly visits.
    Rank 1 (Google) -> ~1B visits (capped for our sorting)
    Rank 1M -> ~60k visits
    Formula: 10^9 / (Rank ^ 0.7)
    """
    if not rank:
        # Default niche/unranked tools: 5k - 50k
        import random
        return random.randint(5000, 50000)
    
    visits = 1_000_000_000 / (rank ** 0.7)
    return int(visits)

def main():
    jsonl_path = "c:/Users/sungu/Desktop/AI-library/public/data/tools.jsonl"
    
    # Check if we are running in GitHub Actions (might need relative path)
    if not os.path.exists(jsonl_path):
        jsonl_path = "public/data/tools.jsonl"
    
    if not os.path.exists(jsonl_path):
        print(f"Error: {jsonl_path} not found.")
        sys.exit(1)

    ranks = download_tranco_ranks()
    
    with open(jsonl_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    updated_lines = []
    updated_count = 0
    
    for line in lines:
        if not line.strip():
            continue
        try:
            tool = json.loads(line)
            domain = get_domain(tool.get('url', ''))
            
            rank = None
            if ranks and domain in ranks:
                rank = ranks[domain]
            
            # Update visits based on rank
            tool['monthly_visits'] = rank_to_visits(rank)
            
            # Log rank if found
            if rank:
                updated_count += 1
            
            updated_lines.append(json.dumps(tool, ensure_ascii=False))
        except Exception as e:
            print(f"Error processing tool: {e}")
            updated_lines.append(line.strip())

    with open(jsonl_path, 'w', encoding='utf-8') as f:
        for line in updated_lines:
            f.write(line + "\n")
            
    print(f"Finished. Updated {updated_count} tools with real ranks. Total tools: {len(updated_lines)}")

if __name__ == "__main__":
    main()
