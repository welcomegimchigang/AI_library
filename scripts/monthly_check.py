import json
import os
import requests
import concurrent.futures
from datetime import datetime

TARGET_JSONL = os.path.join("public", "data", "tools.jsonl")
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL")

# Timeout in seconds
REQ_TIMEOUT = 10

def check_url(tool):
    """
    Check if a tool's URL is still alive.
    Returns: (tool, status_code, is_alive, error_type)
    """
    url = tool.get("url", "")
    if not url:
        return tool, None, False, "No URL"
        
    try:
        # User-Agent to prevent basic 403 Forbidden blocks
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        res = requests.head(url, headers=headers, timeout=REQ_TIMEOUT, allow_redirects=True)
        
        if res.status_code == 405: # Method Not Allowed for HEAD, try GET
            res = requests.get(url, headers=headers, timeout=REQ_TIMEOUT, stream=True)
            
        if res.status_code >= 400 and res.status_code not in [401, 403]:
            return tool, res.status_code, False, f"HTTP Error {res.status_code}"
            
        # Treat 403 or 401 as alive but "protected/unverified"
        if res.status_code in [401, 403]:
            return tool, res.status_code, True, "Protected/Unverified"
            
        return tool, res.status_code, True, "OK"
        
    except requests.exceptions.Timeout:
        return tool, None, False, "Timeout" # Can also be "Unverified" based on strictness
    except requests.exceptions.ConnectionError:
        return tool, None, False, "Connection Error"
    except Exception as e:
        return tool, None, False, f"Error: {str(e)[:20]}"

def run_monthly_check():
    print("=" * 50)
    print("📅 월간 사이트 생존 점검 봇 가동 (Monthly Check) 🤖")
    print("=" * 50)
    
    if not os.path.exists(TARGET_JSONL):
        print(f"Error: {TARGET_JSONL} not found")
        return

    # Load all tools
    all_tools = []
    with open(TARGET_JSONL, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                try:
                    all_tools.append(json.loads(line))
                except json.JSONDecodeError:
                    pass

    total_count = len(all_tools)
    print(f"총 {total_count}개의 툴을 점검합니다. (시간이 다소 소요됩니다)")

    alive_tools = []
    dead_tools = []
    unverified_tools = []

    # Use ThreadPoolExecutor to check URLs concurrently (max 10 to be polite)
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_tool = {executor.submit(check_url, tool): tool for tool in all_tools}
        
        for idx, future in enumerate(concurrent.futures.as_completed(future_to_tool), 1):
            tool, status, is_alive, error_type = future.result()
            
            # Terminal feedback
            if idx % 50 == 0:
                print(f"진행 상황: {idx}/{total_count} 검사 완료...")

            # Classify
            if is_alive:
                alive_tools.append(tool)
                if status in [401, 403] or error_type == "Protected/Unverified":
                    unverified_tools.append((tool.get("name"), error_type))
            else:
                # If it's a timeout or connection issue, we can't definitively say it's dead,
                # but for strict DB maintenance, let's treat long connection errors as dead or unverified.
                # Here, we treat Timeouts & specific HTTP errors as DEAD.
                if error_type == "Timeout":
                    # Option: treat timeouts as unverified to avoid accidental deletion
                    alive_tools.append(tool)
                    unverified_tools.append((tool.get("name"), error_type))
                else:
                    dead_tools.append((tool.get("name"), error_type))

    print("\n--- 결과 요약 ---")
    print(f"✅ 유지된 정상 도구: {len(alive_tools)}개")
    print(f"❌ 삭제될 접속 불가/오류 도구: {len(dead_tools)}개")
    print(f"⚠️ 검증 불가 (Timeout/방화벽 등, 삭제 유보): {len(unverified_tools)}개")

    # Save ONLY alive tools back to DB
    if dead_tools:
        # Sort back by ID
        alive_tools.sort(key=lambda x: x.get('id', 0), reverse=True)
        with open(TARGET_JSONL, 'w', encoding='utf-8') as f:
            for tool in alive_tools:
                f.write(json.dumps(tool, ensure_ascii=False) + '\n')
        print(f"\n{TARGET_JSONL} 갱신 완료.")
    else:
        print("\n삭제된 데이터가 없어 파일 저장을 스킵했습니다.")

    # Send Discord notification
    if DISCORD_WEBHOOK_URL:
        send_discord_report(total_count, len(alive_tools), dead_tools, unverified_tools)
    else:
        print("\nWarning: DISCORD_WEBHOOK_URL is not set. Skipping discord notification.")

def send_discord_report(total, alive_count, dead_tools, unverified_tools):
    date_str = datetime.now().strftime("%Y년 %m월")
    
    # Extract names for readability (limit to 10)
    dead_names = [name for name, err in dead_tools[:10]]
    dead_text = ", ".join(dead_names)
    if len(dead_tools) > 10:
        dead_text += f" 외 {len(dead_tools)-10}개"
    if not dead_text:
        dead_text = "없음"

    unver_names = [name for name, err in unverified_tools[:10]]
    unver_text = ", ".join(unver_names)
    if len(unverified_tools) > 10:
        unver_text += f" 외 {len(unverified_tools)-10}개"
    if not unver_text:
        unver_text = "없음"

    embed = {
        "title": f"📅 LoominAI 월간 DB 정기 점검 보고 ({date_str})",
        "description": f"기존에 수집된 **{total}개**의 AI 도구 사이트 전체 접속 테스트가 완료되었습니다.",
        "color": 15158332, # Red/Orange
        "fields": [
            {"name": "✅ 점검 통과 (유지됨)", "value": f"{alive_count}개", "inline": True},
            {"name": "❌ 접속 불가 (삭제됨 🔴)", "value": f"{len(dead_tools)}개\n\n**삭제 목록:**\n{dead_text}", "inline": False},
            {"name": "⚠️ 검증 불가 (방화벽/타임아웃 🟡)", "value": f"**{len(unverified_tools)}개**는 접속을 거부하거나 시간이 초과되어 삭제를 유보했습니다.\n\n**미검증 목록:**\n{unver_text}", "inline": False}
        ],
        "footer": {"text": "이 점검은 GitHub Actions에서 매월 1일 월간으로 자동 수행됩니다."}
    }
    
    try:
        requests.post(DISCORD_WEBHOOK_URL, json={"embeds": [embed]}, headers={"Content-Type": "application/json"})
        print("Discord 보고 완료")
    except Exception as e:
        print(f"Discord 알림 실패: {e}")

if __name__ == "__main__":
    run_monthly_check()
