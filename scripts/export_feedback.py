import requests
import json
import csv
import os
from datetime import datetime

# Configuration: Update this with your live URL and secret if not in environment
API_URL = "https://ai-library-dhm.pages.dev/api/feedback"
KV_API_SECRET = os.environ.get("KV_API_SECRET", "YOUR_SECRET_HERE")

def export_feedback():
    print("📡 유저 건의사항 데이터를 가져오는 중...")
    
    url = f"{API_URL}?action=list&secret={KV_API_SECRET}"
    try:
        resp = requests.get(url)
        resp.raise_for_status()
        res_data = resp.json()
        
        if not res_data.get("success"):
            print(f"❌ 데이터 가져오기 실패: {res_data.get('error')}")
            return

        feedback_list = res_data.get("data", [])
        if not feedback_list:
            print("📭 아직 등록된 건의사항이 없습니다.")
            return

        print(f"✅ {len(feedback_list)}개의 건의사항을 발견했습니다.")

        # CSV 파일 생성
        filename = f"user_feedback_{datetime.now().strftime('%Y%m%d')}.csv"
        
        with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            # 헤더 작성
            writer.writerow(["ID", "유형", "내용", "연락처", "시간"])
            
            for item in feedback_list:
                d = item.get("data", {})
                writer.writerow([
                    item.get("key"),
                    d.get("type", "기타"),
                    d.get("message", ""),
                    d.get("contact", "anonymous"),
                    d.get("timestamp", "")
                ])
        
        print(f"📊 엑셀(CSV) 파일이 생성되었습니다: {os.path.abspath(filename)}")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    if KV_API_SECRET == "YOUR_SECRET_HERE":
        print("⚠️  먼저 KV_API_SECRET를 설정하거나 스크립트 내에 입력해주세요.")
    else:
        export_feedback()
