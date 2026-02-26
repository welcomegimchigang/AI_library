import os
import json
import time
from deep_translator import GoogleTranslator

def migrate_to_bilingual(input_file):
    print(f"[Migration] Starting bilingual migration for {input_file}...")
    
    if not os.path.exists(input_file):
        print(f"[Error] File not found: {input_file}")
        return

    updated_lines = []
    translator = GoogleTranslator(source='ko', target='en')
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    total = len(lines)
    print(f"[Migration] Total tools to process: {total}")

    for i, line in enumerate(lines):
        if not line.strip():
            continue
        
        try:
            tool = json.loads(line)
            
            # Skip if already has English fields
            if 'name_en' in tool and 'description_en' in tool:
                updated_lines.append(json.dumps(tool, ensure_ascii=False))
                continue

            print(f"[{i+1}/{total}] Translating: {tool.get('name')}...")
            
            # Translate Name (often contains both Ko and En, e.g. "Flowrite (플로우라이트)")
            # If name has parenthesis, it might already have English. 
            # But let's just translate the whole thing or keep it as is if it's already mixed.
            # Usually users want a clean English name.
            name_ko = tool.get('name', '')
            desc_ko = tool.get('description', '')
            
            try:
                # For name, we try to extract English if it's in "Eng (Kor)" or "Kor (Eng)" format
                # If not, we translate.
                import re
                en_match = re.search(r'([a-zA-Z0-9\s]+)\s*\(.*?\)', name_ko)
                ko_match = re.search(r'.*?\s*\(([a-zA-Z0-9\s]+)\)', name_ko)
                
                if en_match:
                    tool['name_en'] = en_match.group(1).strip()
                elif ko_match:
                    tool['name_en'] = ko_match.group(1).strip()
                else:
                    tool['name_en'] = translator.translate(name_ko)
                
                tool['description_en'] = translator.translate(desc_ko)
                
            except Exception as e:
                print(f"  [Error] Translation failed for {name_ko}: {e}")
                tool['name_en'] = name_ko
                tool['description_en'] = desc_ko

            updated_lines.append(json.dumps(tool, ensure_ascii=False))
            
            # Avoid rate limiting
            if (i + 1) % 5 == 0:
                time.sleep(0.5)

        except Exception as e:
            print(f"  [Error] Failed to parse line: {e}")
            updated_lines.append(line.strip())

    # Save back
    temp_file = input_file + ".tmp"
    with open(temp_file, 'w', encoding='utf-8') as f:
        for line in updated_lines:
            f.write(line + '\n')
    
    os.replace(temp_file, input_file)
    print(f"[Success] Migration complete! {len(updated_lines)} tools updated.")

if __name__ == "__main__":
    TARGET_JSONL = os.path.join("public", "data", "tools.jsonl")
    migrate_to_bilingual(TARGET_JSONL)
