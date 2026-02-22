"""
카테고리 자동 재분류 스크립트
tools.jsonl에서 "기타"로 분류된 도구를 키워드 기반으로 적절한 카테고리로 재분류합니다.
"""
import json
import os
import re

TARGET_JSONL = os.path.join("public", "data", "tools.jsonl")

CATEGORY_KEYWORDS = {
    "이미지/아트": [
        "image", "이미지", "사진", "photo", "design", "디자인", "art", "아트",
        "draw", "그림", "paint", "canvas", "logo", "로고", "graphic", "그래픽",
        "illustration", "icon", "avatar", "wallpaper", "banner", "poster",
        "midjourney", "stable diffusion", "dall-e", "dalle", "canva", "figma",
    ],
    "텍스트/문서": [
        "text", "텍스트", "write", "글쓰기", "writing", "문서", "document", "doc",
        "summary", "요약", "translate", "번역", "grammar", "문법", "essay",
        "blog", "블로그", "article", "기사", "copy", "카피", "content", "콘텐츠",
        "email", "이메일", "chat", "chatbot", "챗봇", "gpt", "llm", "language model",
        "paraphrase", "proofread", "seo", "marketing", "마케팅",
    ],
    "개발/코드": [
        "code", "코드", "coding", "코딩", "develop", "개발", "programming", "프로그래밍",
        "github", "git", "api", "sql", "database", "데이터베이스", "debug", "디버그",
        "terminal", "shell", "devops", "deploy", "배포", "docker", "kubernetes",
        "compiler", "ide", "vscode", "copilot", "cursor", "tabnine", "codeium",
    ],
    "비디오/오디오": [
        "video", "비디오", "영상", "movie", "film", "animation", "애니메이션",
        "audio", "오디오", "음악", "music", "sound", "사운드", "voice", "음성",
        "tts", "stt", "speech", "podcast", "팟캐스트", "subtitle", "자막",
        "edit", "편집", "stream", "스트리밍", "youtube", "유튜브", "shorts", "쇼츠",
        "song", "노래", "sing", "beat", "remix", "dj",
    ],
}

def classify_tool(tool):
    """키워드 기반으로 도구 카테고리를 추론합니다."""
    text = f"{tool.get('name', '')} {tool.get('description', '')}".lower()
    
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = 0
        for kw in keywords:
            if kw.lower() in text:
                score += 1
        if score > 0:
            scores[category] = score
    
    if scores:
        return max(scores, key=scores.get)
    return "기타"

def run_reclassify():
    print("=== 카테고리 재분류 시작 ===")
    
    if not os.path.exists(TARGET_JSONL):
        print(f"Error: {TARGET_JSONL} not found")
        return
    
    lines = []
    reclassified = 0
    total = 0
    
    with open(TARGET_JSONL, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                tool = json.loads(line)
                total += 1
                
                if tool.get("category") == "기타":
                    new_cat = classify_tool(tool)
                    if new_cat != "기타":
                        old = tool["category"]
                        tool["category"] = new_cat
                        reclassified += 1
                        print(f"  [{tool['name']}] {old} → {new_cat}")
                
                lines.append(json.dumps(tool, ensure_ascii=False))
            except json.JSONDecodeError:
                lines.append(line)
    
    with open(TARGET_JSONL, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    
    print(f"\n=== 완료: {total}개 중 {reclassified}개 재분류됨 ===")

if __name__ == "__main__":
    run_reclassify()
