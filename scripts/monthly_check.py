import json
import os
import requests
import concurrent.futures
from datetime import datetime
import re

# 스마트 주소 복구를 위한 검색 라이브러리
try:
    from duckduckgo_search import DDGS
except ImportError:
    DDGS = None

TARGET_JSONL = os.path.join("public", "data", "tools.jsonl")
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL")

# Timeout in seconds
REQ_TIMEOUT = 10

def detect_pricing_info(text):
    """
    본문 텍스트에서 가격 관련 키워드를 찾아 유료/무료 여부를 추측합니다.
    """
    if not text:
        return None
        
    text = text.lower()
    free_keywords = ['free plan', 'free version', 'forever free', '100% free', 'completely free']
    paid_keywords = ['pricing', 'subscription', 'plans starting at', 'premium plan', 'buy now', 'purchase']
    
    has_free = any(k in text for k in free_keywords)
    has_paid = any(k in text for k in paid_keywords)
    
    if has_free and not has_paid:
        return True
    if has_paid:
        return "freemium"
    return None

def recover_url(tool_name):
    """
    데드링크인 경우 검색을 통해 새로운 URL을 찾아봅니다.
    """
    if not DDGS:
        return None
        
    print(f"🔍 '{tool_name}'의 새로운 주소를 찾는 중...")
    try:
        with DDGS() as ddgs:
            # 도구 이름으로 검색 (최초 3개 결과 확인)
            results = list(ddgs.text(tool_name, max_results=3))
            
            for r in results:
                new_url = r.get('href', '')
                # 너무 일반적인 사이트(GitHub, Twitter, LinkedIn 등)는 제외
                if any(social in new_url.lower() for social in ['github.com', 'twitter.com', 'x.com', 'linkedin.com', 'facebook.com']):
                    continue
                
                # 새 주소가 살아있는지 확인
                try:
                    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
                    res = requests.get(new_url, headers=headers, timeout=5)
                    if res.status_code < 400:
                        print(f"✅ 새 주소 발견: {new_url}")
                        return new_url
                except:
                    continue
    except Exception as e:
        print(f"⚠️ 검색 중 오류 발생: {e}")
        
    return None

def check_url(tool):
    """
    Check if a tool's URL is still alive and guess pricing.
    """
    url = tool.get("url", "")
    if not url:
        return tool, None, False, "No URL", None
        
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        res = requests.get(url, headers=headers, timeout=REQ_TIMEOUT, stream=True)
        
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
    print("📅 LoominAI 월간 DB 정기 점검 및 스마트 주소 복구 봇 가동 🤖")
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
    recovered_tools = []

    # 병렬 검사 시작
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_tool = {executor.submit(check_url, tool): tool for tool in all_tools}
        
        for idx, future in enumerate(concurrent.futures.as_completed(future_to_tool), 1):
            tool, status, is_alive, error_type, guessed_status = future.result()
            
            if idx % 50 == 0:
                print(f"진행 상황: {idx}/{total_count} 검사 완료...")

            if is_alive:
                alive_tools.append(tool)
                
                # 가격 변동 감지
                current_is_free = tool.get("isFree", False)
                if current_is_free and guessed_status == "freemium":
                    price_changed_tools.append((tool.get("name"), "무료 -> 부분 유료(의심)"))
                elif not current_is_free and guessed_status is True:
                     price_changed_tools.append((tool.get("name"), "유료 -> 무료(의심)"))
            else:
                # 🛠️ 스마트 주소 복구 시도
                new_url = recover_url(tool.get("name_en", tool.get("name")))
                if new_url:
                    tool["url"] = new_url
                    alive_tools.append(tool)
                    recovered_tools.append((tool.get("name"), new_url))
                else:
                    dead_tools.append((tool.get("name"), error_type))

    # 데이터 저장
    alive_tools.sort(key=lambda x: x.get('id', 0), reverse=True)
    with open(TARGET_JSONL, 'w', encoding='utf-8') as f:
        for tool in alive_tools:
            f.write(json.dumps(tool, ensure_ascii=False) + '\n')
    print(f"\n{TARGET_JSONL} 갱신 완료.")

    # Discord 보고
    if DISCORD_WEBHOOK_URL:
        send_discord_report(total_count, len(alive_tools), dead_tools, price_changed_tools, recovered_tools)
    else:
        print("\nDiscord 알림 스킵됨 (Webhook URL 없음)")

def send_discord_report(total, alive_count, dead_tools, price_changed, recovered):
    date_str = datetime.now().strftime("%Y년 %m월")
    
    dead_text = ", ".join([name for name, err in dead_tools[:10]]) or "없음"
    price_text = ", ".join([f"{name}({reason})" for name, reason in price_changed[:10]]) or "없음"
    recovered_text = ", ".join([f"{name}" for name, url in recovered[:10]]) or "없음"

    embed = {
        "title": f"📊 LoominAI 월간 DB 정기 점검 리포트 ({date_str})",
        "description": f"총 **{total}개** 도구 중 **{alive_count}개**가 운영 중입니다.",
        "color": 3447003, # Blue
        "fields": [
            {"name": "✅ 자동 복구 완료 (Smart Recovery)", "value": f"**{len(recovered)}개**의 이사 간 사이트를 찾아 복구했습니다. (상위: {recovered_text})", "inline": False},
            {"name": "💰 가격 변동 의심", "value": f"{len(price_changed)}개 (상위: {price_text})", "inline": False},
            {"name": "❌ 최종 삭제된 도구", "value": f"{len(dead_tools)}개 (상위: {dead_text})", "inline": False}
        ],
        "footer": {"text": "이 작업은 스마트 주소 복구 로직에 의해 자동화되었습니다."}
    }
    requests.post(DISCORD_WEBHOOK_URL, json={"embeds": [embed]})

if __name__ == "__main__":
    run_monthly_check()
