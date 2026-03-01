import os
import requests
import pandas as pd
from datetime import datetime
import json

CF_ACCOUNT_ID = os.environ.get("CF_ACCOUNT_ID")
CF_DATABASE_ID = os.environ.get("CF_DATABASE_ID", "3de5cf7e-6b0f-4691-9f9a-085c67b4fb6c")
CF_API_TOKEN = os.environ.get("CF_API_TOKEN")
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL")

def query_d1(sql):
    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/d1/database/{CF_DATABASE_ID}/query"
    headers = {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {"sql": sql}
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()
    if data.get("success"):
        return data["result"][0]["results"]
    else:
        raise Exception(f"D1 Query failed: {data}")

def main():
    if not all([CF_ACCOUNT_ID, CF_DATABASE_ID, CF_API_TOKEN]):
        print("Missing Cloudflare credentials. Skipping report.")
        return

    # 1. Fetch data from D1 (last 30 days)
    sql = """
    SELECT 
        c.tool_name,
        c.category,
        s.user_gender as gender,
        s.user_job as job,
        CASE 
            WHEN (2026 - s.user_birth_year + 1) < 20 THEN '10대 이하'
            WHEN (2026 - s.user_birth_year + 1) BETWEEN 20 AND 29 THEN '20대'
            WHEN (2026 - s.user_birth_year + 1) BETWEEN 30 AND 39 THEN '30대'
            WHEN (2026 - s.user_birth_year + 1) BETWEEN 40 AND 49 THEN '40대'
            ELSE '50대 이상'
        END AS age_group
    FROM tool_clicks c
    LEFT JOIN (
        SELECT session_id, user_gender, user_job, user_birth_year
        FROM search_logs
        WHERE session_id IS NOT NULL 
        GROUP BY session_id
    ) s ON c.session_id = s.session_id
    WHERE strftime('%Y-%m', c.created_at) = strftime('%Y-%m', datetime('now', '-1 month'))
    """
    
    print("Fetching data from Cloudflare D1...")
    results = query_d1(sql)
    
    if not results:
        print("No data available for the last 30 days.")
        return
        
    df = pd.DataFrame(results)
    
    # Clean data
    df['gender'] = df['gender'].fillna('Unknown')
    df['job'] = df['job'].fillna('Unknown')
    df['age_group'] = df['age_group'].fillna('Unknown')
    
    print("Generating Pivot Tables...")
    
    # 2. Generate Pivot Tables (Cross Tabulation)
    pivot_gender = pd.crosstab(df['category'], df['gender'], margins=True, margins_name="Total")
    pivot_age = pd.crosstab(df['category'], df['age_group'], margins=True, margins_name="Total")
    pivot_job = pd.crosstab(df['category'], df['job'], margins=True, margins_name="Total")

    top_tools = df['tool_name'].value_counts().reset_index()
    top_tools.columns = ['Tool Name', 'Clicks']
    
    # 3. Save to Excel
    date_str = datetime.now().strftime("%Y-%m-%d")
    filename = f"LoominAI_Monthly_Report_{date_str}.xlsx"
    
    print(f"Saving to {filename}...")
    with pd.ExcelWriter(filename, engine='openpyxl') as writer:
        top_tools.to_excel(writer, sheet_name='Top Tools', index=False)
        pivot_gender.to_excel(writer, sheet_name='Category x Gender')
        pivot_age.to_excel(writer, sheet_name='Category x Age')
        pivot_job.to_excel(writer, sheet_name='Category x Job')

    # 4. Send to Discord
    if DISCORD_WEBHOOK_URL:
        print("Sending to Discord...")
        embed = {
            "title": f"📊 LoominAI 월간 데이터 리포트 ({date_str})",
            "description": f"지난 30일간 총 **{len(df)}**건의 툴 클릭 데이터가 집계되었습니다.\\n\\n다차원 인구통계(성별/연령/직업) 피벗 테이블이 포함된 전체 분석 리포트를 엑셀 파일로 첨부해 드립니다.",
            "color": 3447003,
            "footer": {"text": "이 알림은 GitHub Actions에서 자동 발송되었습니다."}
        }
        
        payload_json = {"embeds": [embed]}
        
        with open(filename, "rb") as f:
            response = requests.post(
                DISCORD_WEBHOOK_URL, 
                data={"payload_json": json.dumps(payload_json)},
                files={"file": (filename, f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
            )
            if response.ok:
                print("Successfully sent Discord notification.")
            else:
                print(f"Failed: {response.status_code} - {response.text}")
    else:
        print("DISCORD_WEBHOOK_URL not set. Skipping Discord notification.")

if __name__ == "__main__":
    main()
