import json
import os
import requests
import concurrent.futures
from datetime import datetime
import re

TARGET_JSONL = os.path.join("public", "data", "tools.jsonl")
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL")

# Timeout in seconds
REQ_TIMEOUT = 10

def detect_pricing_info(text):
    """
    본문 텍스트에서 가격 관련 키워드를 찾아 유료/무료 여부를 추측합니다.
    True: 무료 가능성 높음, False: 유료 가능성 높음, None: 판단 불가
    """
    if not text:
        return None
        
    text = text.lower()
    # 무료 키워드
    free_keywords = ['free plan', 'free version', 'forever free', '100% free', 'completely free']
    # 유료 키워드
    paid_keywords = ['pricing', 'subscription', 'plans starting at', 'premium plan', 'buy now', 'purchase']
    
    has_free = any(k in text for k in free_keywords)
    has_paid = any(k in text for k in paid_keywords)
    
    if has_free and not has_paid:
        return True
    if has_paid:
        # 'pricing'이 있어도 'free'가 같이 있으면 보통 Freemium
        return "freemium"
    return None

def check_url(tool):
    """
    Check if a tool's URL is still alive and guess pricing.
    Returns: (tool, status_code, is_alive, error_type, guessed_is_free)
    """
    url = tool.get("url", "")
    if not url:
        return tool, None, False, "No URL", None
        
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        # 본문 분석을 위해 GET 요청 사용
        res = requests.get(url, headers=headers, timeout=REQ_TIMEOUT, stream=True)
        
        # 첫 10KB만 읽어서 분석 (성능 및 데이터 절약)
        chunk = res.raw.read(10240).decode('utf-8', errors='ignore')
        guessed_status = detect_pricing_info(chunk)
            
        if res.status_code >= 400 and res.status_code not in [401, 403]:
            return tool, res.status_code, False, f"HTTP Error {res.status_code}", None
            
        if res.status_code in [401, 403]:
            return tool, res.status_code, True, "Protected/Unverified", None
            
        return tool, res.status_code, True, "OK", guessed_status
        
    except Exception as e:
        return tool, None, False, f"Error: {str(e)[:20]}", None

def run_monthly_check():
    print("=" * 50)
    print("📅 LoominAI 월간 DB 정기 점검 및 가격 감지 봇 가동 🤖")
    print("=" * 50)
    
    if not os.path.exists(TARGET_JSONL):
        print(f"Error: {TARGET_JSONL} not found")
        return

    all_tools = []
    with open(TARGET_JSONL, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                try:
                    all_tools.append(json.loads(line))
                except json.JSONDecodeError:
                    pass

    total_count = len(all_tools)
    print(f"총 {total_count}개의 툴을 점검합니다.")

    alive_tools = []
    dead_tools = []
    price_changed_tools = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_tool = {executor.submit(check_url, tool): tool for tool in all_tools}
        
        for idx, future in enumerate(concurrent.futures.as_completed(future_to_tool), 1):
            tool, status, is_alive, error_type, guessed_status = future.result()
            
            if idx % 50 == 0:
                print(f"진행 상황: {idx}/{total_count} 검사 완료...")

            if is_alive:
                alive_tools.append(tool)
                
                # 가격 변동 감지 로직 (기존 isFree와 비교)
                current_is_free = tool.get("isFree", False)
                # 'freemium'이면 유료 정보가 있는 것이므로 isFree=True인 경우 변동 의심
                if current_is_free and guessed_status == "freemium":
                    price_changed_tools.append((tool.get("name"), "무료 -> 부분 유료(의심)"))
                elif not current_is_free and guessed_status is True:
                     price_changed_tools.append((tool.get("name"), "유료 -> 무료(의심)"))
            else:
                dead_tools.append((tool.get("name"), error_type))

    # 데이터 저장 (생존 툴만 유지)
    if dead_tools:
        alive_tools.sort(key=lambda x: x.get('id', 0), reverse=True)
        with open(TARGET_JSONL, 'w', encoding='utf-8') as f:
            for tool in alive_tools:
                f.write(json.dumps(tool, ensure_ascii=False) + '\n')
        print(f"\n{TARGET_JSONL} 갱신 완료.")

    # Discord 보고
    if DISCORD_WEBHOOK_URL:
        send_discord_report(total_count, len(alive_tools), dead_tools, price_changed_tools)
    else:
        print("\nDiscord 알림 스킵됨 (Webhook URL 없음)")

def send_discord_report(total, alive_count, dead_tools, price_changed):
    date_str = datetime.now().strftime("%Y년 %m월")
    
    dead_text = ", ".join([name for name, err in dead_tools[:10]]) or "없음"
    price_text = ", ".join([f"{name}({reason})" for name, reason in price_changed[:10]]) or "없음"

    embed = {
        "title": f"📊 LoominAI 월간 DB 정기 점검 리포트 ({date_str})",
        "description": f"총 **{total}개** 도구 중 **{alive_count}개**가 생존해 있습니다.",
        "color": 3066993, # Green
        "fields": [
            {"name": "❌ 삭제된 도구", "value": f"{len(dead_tools)}개 (상위: {dead_text})", "inline": False},
            {"name": "💰 가격 변동 의심", "value": f"{len(price_changed)}개 (상위: {price_text})", "inline": False}
        ],
        "footer": {"text": "이 작업은 GitHub Actions에 의해 자동화되었습니다."}
    }
    requests.post(DISCORD_WEBHOOK_URL, json={"embeds": [embed]})

if __name__ == "__main__":
    run_monthly_check()
