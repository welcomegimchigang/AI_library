import subprocess
import json
import os
import requests
from datetime import datetime

def get_old_tools():
    try:
        # Get the file contents from the last commit
        result = subprocess.run(
            ['git', 'show', 'HEAD:public/data/tools.jsonl'],
            capture_output=True, text=True, check=True
        )
        return result.stdout
    except subprocess.CalledProcessError:
        return ""

def load_tools(content=None, filepath=None):
    tools = {}
    if filepath:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
        else:
            content = ""
            
    if not content:
        return tools
        
    for line in content.strip().split('\n'):
        if not line.strip():
            continue
        try:
            tool = json.loads(line)
            # Use name as key, since it's the most reliable unique identifier based on clean_db.py
            key = str(tool.get("name", "")).strip().lower()
            if key:
                tools[key] = tool
        except json.JSONDecodeError:
            continue
            
    return tools

def main():
    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")

    old_content = get_old_tools()
    old_tools = load_tools(content=old_content)
    new_tools = load_tools(filepath="public/data/tools.jsonl")
    
    added = 0
    deleted = 0
    updated = 0
    
    for key, new_tool in new_tools.items():
        if key not in old_tools:
            added += 1
        else:
            old_tool = old_tools[key]
            # Simple content change check (ignoring dict order)
            if json.dumps(new_tool, sort_keys=True) != json.dumps(old_tool, sort_keys=True):
                updated += 1
                
    for key in old_tools.keys():
        if key not in new_tools:
            deleted += 1

    total_tools = len(new_tools)
    
    if added == 0 and deleted == 0 and updated == 0:
        print("No changes in tools.jsonl. Skipping Discord notification to avoid spam.")
        return

    date_str = datetime.now().strftime("%Y-%m-%d")
    
    embed = {
        "title": f"🤖 LoominAI 데일리 자동 업데이트 보고 ({date_str})",
        "description": "어젯밤부터 오늘 아침까지 크롤링 및 데이터 정제가 완료되었습니다! 🚀\n\n**📊 오늘의 DB 변경 요약**",
        "color": 3447003, # Blue color
        "fields": [
            {"name": "새로 추가된 도구 🟢", "value": f"{added}개", "inline": True},
            {"name": "삭제된 도구 🔴", "value": f"{deleted}개", "inline": True},
            {"name": "내용 업데이트 🟡", "value": f"{updated}개", "inline": True},
            {"name": "📈 현재 총 AI 도구 개수", "value": f"{total_tools:,}개", "inline": False}
        ],
        "footer": {"text": "이 알림은 GitHub Actions에서 자동 발송되었습니다."}
    }
    
    repo = os.environ.get("GITHUB_REPOSITORY")
    run_id = os.environ.get("GITHUB_RUN_ID")
    if repo and run_id:
        action_url = f"https://github.com/{repo}/actions/runs/{run_id}"
        embed["description"] += f"\n\n*자세한 커밋 및 실행 내역은 [여기]({action_url})에서 확인할 수 있습니다.*"

    payload = {
        "embeds": [embed]
    }
    
    if not webhook_url:
        print("DISCORD_WEBHOOK_URL environment variable is not set. Metrics computed but skipping notification.")
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return

    try:
        response = requests.post(webhook_url, json=payload)
        response.raise_for_status()
        print("Successfully sent Discord notification.")
    except Exception as e:
        print(f"Failed to send Discord notification: {e}")

if __name__ == "__main__":
    main()
