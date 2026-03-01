"""
tools.jsonl의 모든 항목에 location(국내/해외)을 자동 분류하여 추가하는 스크립트.
- URL이 .kr이거나 알려진 국내 서비스명/브랜드이면 "국내" 처리
- 그 외는 "해외" 처리
"""
import json
import re

KOREAN_COMPANIES = {
    "네이버", "naver", "clova", "클로바", "카카오", "kakao",
    "뤼튼", "wrtn", "타입캐스트", "typecast", "ntt", "vllo",
    "sk", "kt", "lg", "lgu+", "riiid", "mathpresso", "매스프레소",
    "flitto", "플리토", "lunit", "루닛", "medibloc", "메디블록",
    "linewalks", "ncsoft", "nc소프트", "엔씨", "펄어비스",
    "krafton", "크래프톤", "smilegate", "스마일게이트",
    "comento", "코멘토", "jobis", "jobkorea", "saramin", "사람인",
    "zigbang", "직방", "daangn", "당근", "toss", "토스",
    "ncloud", "gabia", "가비아", "cafe24", "카페24",
    "spoon", "스푼", "pxd", "miricanvas", "미리캔버스",
    "ithinkso", "ithink", "dable", "dable.io", "selltics", "sellerboard",
    "altools", "알툴즈", "wisarang", "vixtec", "voiceware",
    "saltlux", "솔트룩스", "nttdata", "buzzvil", "버즈빌",
    "kakaobank", "kakaopage", "kakaostyle",
    "aidt", "ai타임스", "ai타임즈", "ainize", "ai.nize",
    "nearthlab", "aitrics", "lomin", "loominai"
}

def is_korean_text(text: str) -> bool:
    """텍스트에 한글 문자가 포함되어 있는지 확인"""
    return bool(re.search(r"[가-힣]", text))

def classify_location(tool: dict) -> str:
    raw_name = str(tool.get("name", "") or tool.get("serviceName", ""))
    # 괄호 안 한국어 번역명 제거 후 원래 서비스 이름만 추출
    name_without_parens = re.sub(r'\s*[\(\（].*?[\)\）]', '', raw_name).strip().lower()
    name_lower = raw_name.lower()
    url = str(tool.get("url", "") or tool.get("website", "")).lower()

    # 1. URL에 .kr 포함
    if ".kr/" in url or url.endswith(".kr") or "korea" in url:
        return "국내"

    # 2. 괄호 제거 후 이름 자체에 한글 포함 (서비스 이름이 한글인 경우)
    if is_korean_text(name_without_parens):
        return "국내"

    # 3. 알려진 국내 기업/서비스명 화이트리스트
    for keyword in KOREAN_COMPANIES:
        if keyword in name_lower or keyword in url:
            return "국내"

    return "해외"

def main():
    input_path = "public/data/tools.jsonl"
    output_path = "public/data/tools.jsonl"

    with open(input_path, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]

    tools = []
    for line in lines:
        try:
            tool = json.loads(line)
            tools.append(tool)
        except json.JSONDecodeError:
            continue

    total = len(tools)
    domestic = 0
    foreign = 0

    updated = []
    for tool in tools:
        loc = classify_location(tool)
        tool["location"] = loc
        updated.append(tool)
        if loc == "국내":
            domestic += 1
        else:
            foreign += 1

    with open(output_path, "w", encoding="utf-8") as f:
        for tool in updated:
            f.write(json.dumps(tool, ensure_ascii=False) + "\n")

    print(f"✅ 완료! 총 {total}개 툴")
    print(f"   🇰🇷 국내: {domestic}개")
    print(f"   🌍 해외: {foreign}개")

    # 국내 툴 샘플 출력
    domestic_samples = [t.get("name", t.get("serviceName", "")) for t in updated if t["location"] == "국내"][:20]
    print(f"\n국내 툴 샘플: {domestic_samples}")

if __name__ == "__main__":
    main()
