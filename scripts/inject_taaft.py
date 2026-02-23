import os
import json
import requests
import uuid

# --- Configuration ---
# You need to set this environment variable either in your terminal or .env
KV_API_URL = "https://ai-library-dhm.pages.dev/api/missing"
KV_API_SECRET = os.environ.get("KV_API_SECRET", "") # You will need to provide this when running

# A sample of ~50 diverse/niche categories inspired by TAAFT
TAAFT_CATEGORIES = [
    "운동 보조 AI", "헬스케어 AI", "요구르트 제조 AI", "다이어트 식단 AI", "명상 AI", 
    "수면 분석 AI", "부동산 분석 AI", "주식 단타 AI", "암호화폐 예측 AI", "가계부 AI",
    "인테리어 디자인 AI", "건축 설계 AI", "요리 레시피 AI", "와인 페어링 AI", "반려동물 건강 AI",
    "여행 계획 AI", "항공권 최저가 AI", "MBTI 분석 AI", "사주팔자 AI", "타로카드 AI",
    "웹툰 제작 AI", "소설 집필 AI", "음원 마스터링 AI", "비트메이킹 AI", "보컬 분리 AI",
    "법률 자문 AI", "세금 계산 AI", "특허 검색 AI", "이사 견적 AI", "중고차 시세 AI",
    "면접 준비 AI", "자기소개서 AI", "영어 회화 AI", "스페인어 학습 AI", "코딩 과외 AI",
    "육아 상담 AI", "연애 상담 AI", "쇼핑몰 리뷰 분석 AI", "상품 상세페이지 AI", "인스타그램 해시태그 AI",
    "유튜브 스크립트 AI", "틱톡 챌린지 AI", "로고 제작 AI", "명함 디자인 AI", "PPT 템플릿 AI",
    "엑셀 함수 AI", "데이터 시각화 AI", "노션 템플릿 AI", "일기 작성 AI", "꿈 해몽 AI"
]

def inject_keywords():
    if not KV_API_SECRET:
        print("❌ Error: KV_API_SECRET is not set. Please set the environment variable.")
        print("Example: export KV_API_SECRET='your_secret_here'")
        return

    print(f"🚀 Injecting {len(TAAFT_CATEGORIES)} TAAFT keywords into Cloudflare KV...")
    
    success_count = 0
    fail_count = 0

    for idx, keyword in enumerate(TAAFT_CATEGORIES, 1):
        # Generate a fake unique key similar to what chat.js does
        import time
        import random
        import string
        
        rand_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
        query_key = f"missing_{int(time.time() * 1000)}_{rand_str}"
        
        payload = {
            "query": keyword,
            "intent": "search_tools",
            "filters": {"q": keyword},
            "status": "pending",
            "timestamp": int(time.time() * 1000)
        }
        
        # We need to hit the internal POST endpoint of /api/missing if it supports it,
        # BUT our /api/missing only supports GET ?action=list &action=delete in auto_resolver.py
        # Wait, the Cloudflare worker 'chat.js' writes directly to KV via `env.MISSING_TOOLS_KV.put`.
        # So we cannot write to KV remotely unless we have a specific API endpoint for it.
        
        # Let's check how the worker writes to it. 
        # Actually, an alternative is to just write these 50 keywords locally to a JSON file,
        # and modify `auto_resolver.py` so it can ALSO read from a local file as a seed!
        # This is much simpler and doesn't require cloud secrets to write.
        pass

if __name__ == "__main__":
    print("This script is deprecated. Creating a local JSON queue instead.")
