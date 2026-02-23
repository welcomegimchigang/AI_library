import json
import os

TOP_100_MAINSTREAM_TOOLS = [
    # General LLM / Chat
    "ChatGPT", "Claude", "Gemini", "Copilot", "Perplexity", "Pi", "Poe", "HuggingChat", "Jasper", "Copy.ai", "Writesonic", "Rytr", "Anyword",
    
    # Image Generation
    "Midjourney", "DALL-E 3", "Stable Diffusion", "Leonardo.Ai", "Adobe Firefly", "Canva Magic Studio", "Ideogram", "Playground AI", "Krea AI", "Magnific AI",
    
    # Video Generation
    "Runway", "Pika Labs", "Sora", "HeyGen", "Synthesia", "Kaiber", "Luma Dream Machine", "Kling AI", "Hailuo AI", "InVideo", "CapCut", "Vrew",
    
    # Audio & Music Generation
    "Suno", "Udio", "ElevenLabs", "Mubert", "AIVA", "Descript", "Murf AI", "LALAL.AI", "Otter.ai", "Vocal Remover",
    
    # Coding & Development
    "GitHub Copilot", "Cursor", "AlphaCode", "Devin", "Amazon Q", "Phind", "Tabnine", "Codeium", "Replit Ghostwriter", "Vercel v0", "Lovable", "Bolt.new",
    
    # Productivity & Workspace
    "Notion AI", "Miro Assist", "Gamma", "Tome", "Beautiful.ai", "Zapier Central", "Otter.ai", "Fireflies.ai", "Read AI", "Mem.ai", "Taskade", "ClickUp Brain",
    
    # Search & Research
    "Perplexity", "Consensus", "Elicit", "SciSpace", "ChatPDF", "Monica", "Liner", "You.com", "Glean",
    
    # AI Agents & Assistants
    "AutoGPT", "BabyAGI", "AgentGPT", "Meta AI", "Character.AI", "Replika", "Cayla",
    
    # Korean Local Mainstream
    "뤼튼", "CLOVA X", "AskUp", "A", "업스테이지", "솔트룩스", "마음AI", "딥브레인AI", "플루닛", "포티투마루"
]

def check_missing_mainstream():
    db_file = os.path.join("public", "data", "tools.jsonl")
    
    existing_tools = []
    if os.path.exists(db_file):
        with open(db_file, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip(): continue
                try:
                    obj = json.loads(line)
                    if "name" in obj:
                        existing_tools.append(obj["name"].lower())
                    if "url" in obj:
                        # Add naked domain to help matching
                        domain = obj["url"].replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]
                        existing_tools.append(domain)
                except: pass
                
    missing_tools = []
    
    for tool_name in TOP_100_MAINSTREAM_TOOLS:
        found = False
        search_term = tool_name.lower()
        
        # Simple string matching - if the tool name is in any existing tool name or domain
        for existing in existing_tools:
            if search_term in existing or existing in search_term:
                found = True
                break
                
        if not found:
            missing_tools.append(tool_name)
            
    print(f"Total mainstream tools checked: {len(TOP_100_MAINSTREAM_TOOLS)}")
    print(f"Already in DB: {len(TOP_100_MAINSTREAM_TOOLS) - len(missing_tools)}")
    print(f"Missing from DB: {len(missing_tools)}\n")
    
    print("Missing Tools:")
    for t in missing_tools:
        print(f" - {t}")
        
    # Write the missing ones to a new seed file
    seed_file = os.path.join("data", "seed_mainstream.json")
    with open(seed_file, "w", encoding="utf-8") as f:
        # We append "AI" to some naked tool names so DuckDuckGo finds the tool, not the dictionary word
        search_ready_tools = [f"{t} AI tool" if len(t) < 6 and "AI" not in t.upper() else t for t in missing_tools]
        json.dump(search_ready_tools, f, ensure_ascii=False, indent=4)
        print(f"\nCreated {seed_file} with {len(search_ready_tools)} missing mainstream tools.")

if __name__ == "__main__":
    check_missing_mainstream()
