import json
import os
import time

# 50 new hardcoded generic tools generated for the request
NEW_TOOLS = [
  {"id": 90001, "name": "ChatGPT", "description": "초거대 언어 모델 기반 다목적 AI 챗봇", "category": "텍스트/문서", "url": "https://chat.openai.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90002, "name": "Midjourney", "description": "텍스트 프롬프트 기반 고품질 이미지 생성 AI", "category": "이미지/아트", "url": "https://www.midjourney.com", "isFree": False, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90003, "name": "GitHub Copilot", "description": "개발자를 위한 AI 코드 자동 완성 및 제안", "category": "개발/코드", "url": "https://github.com/features/copilot", "isFree": False, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90004, "name": "Suno AI", "description": "프롬프트 입력만으로 즉석 음악 및 보컬 생성", "category": "비디오/오디오", "url": "https://suno.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90005, "name": "Runway", "description": "Gen-2 기반 비디오 생성 및 편집 도구 모음", "category": "비디오/오디오", "url": "https://runwayml.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90006, "name": "Notion AI", "description": "노션 내에서 문서 요약, 아이디어 초안 작성 보조", "category": "텍스트/문서", "url": "https://www.notion.so/product/ai", "isFree": False, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90007, "name": "HeyGen", "description": "AI 아바타를 활용한 비즈니스 프레젠테이션 영상 제작", "category": "비디오/오디오", "url": "https://www.heygen.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90008, "name": "Gamma", "description": "텍스트를 예쁜 프레젠테이션(PPT) 웹 문서로 변환", "category": "텍스트/문서", "url": "https://gamma.app", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90009, "name": "Leonardo.Ai", "description": "게임 리소스 및 일러스트레이션 특화 고품질 생성형 AI", "category": "이미지/아트", "url": "https://leonardo.ai", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90010, "name": "Cursor", "description": "ChatGPT가 내장된 AI 코딩 에디터 IDE", "category": "개발/코드", "url": "https://cursor.sh", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90011, "name": "Claude 3", "description": "Anthropic의 강력한 대화형 언어 모델 및 문서 분석", "category": "텍스트/문서", "url": "https://claude.ai", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90012, "name": "Perplexity", "description": "출처가 명확한 실시간 웹 검색 AI 엔진", "category": "텍스트/문서", "url": "https://www.perplexity.ai", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90013, "name": "Phind", "description": "개발자를 위한 코드 기반 AI 검색 엔진", "category": "개발/코드", "url": "https://www.phind.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90014, "name": "ElevenLabs", "description": "매우 자연스러운 AI 음성 합성 및 클론 TTS", "category": "비디오/오디오", "url": "https://elevenlabs.io", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90015, "name": "VREW", "description": "음성 인식 기반 텍스트 컷 편집 영상 프로그램", "category": "비디오/오디오", "url": "https://vrew.voyagerx.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90016, "name": "Canva Magic Studio", "description": "캔바 내 그래픽 디자인 보조 AI 툴 세트", "category": "이미지/아트", "url": "https://www.canva.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90017, "name": "Magnific AI", "description": "초고해상도 이미지 업스케일링 및 질감 향상 AI", "category": "이미지/아트", "url": "https://magnific.ai", "isFree": False, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90018, "name": "Vercel v0", "description": "텍스트 프롬프트를 쳐서 React/Tailwind UI 컴포넌트 생성", "category": "개발/코드", "url": "https://v0.dev", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90019, "name": "Descript", "description": "텍스트 에디터처럼 편집하는 오디오/비디오 AI 팟캐스트 도구", "category": "비디오/오디오", "url": "https://www.descript.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90020, "name": "Synthesia", "description": "대본을 입력하면 AI 가상 인간이 영상을 제작해줌", "category": "비디오/오디오", "url": "https://www.synthesia.io", "isFree": False, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90021, "name": "Luma Dream Machine", "description": "모바일과 웹에서 사용할 수 있는 고해상도 비디오 생성기", "category": "비디오/오디오", "url": "https://lumalabs.ai", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90022, "name": "Udio", "description": "고품질의 다양한 장르 노래를 생성하는 생성형 AI", "category": "비디오/오디오", "url": "https://www.udio.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90023, "name": "Napkin AI", "description": "텍스트 문서를 다이어그램과 인포그래픽으로 즉시 변환", "category": "이미지/아트", "url": "https://www.napkin.ai", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90024, "name": "Wrtn (뤼튼)", "description": "국내 사용자 맞춤형 오픈 AI 프롬프트 포털", "category": "텍스트/문서", "url": "https://wrtn.ai", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90025, "name": "Poe", "description": "Quora에서 만든 다수 AI 모델(GPT, Claude 등) 통합 채팅 봇", "category": "텍스트/문서", "url": "https://poe.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90026, "name": "KREA AI", "description": "실시간으로 변환 과정을 보며 이미지/비디오를 생성, 확대", "category": "이미지/아트", "url": "https://www.krea.ai", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90027, "name": "Figma AI", "description": "피그마 내에서 디자인 와이어프레임 및 애셋 구상 보조", "category": "이미지/아트", "url": "https://www.figma.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90028, "name": "Copilot in Windows", "description": "윈도우에 통합된 스마트 비서 컨트롤러", "category": "기타", "url": "https://www.microsoft.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90029, "name": "Gemini", "description": "구글 멀티모달 초거대 생성 언어 모델", "category": "텍스트/문서", "url": "https://gemini.google.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90030, "name": "Tome", "description": "멋진 스토리텔링 기반 슬라이드 및 문서를 빠르게 생성", "category": "텍스트/문서", "url": "https://tome.app", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90031, "name": "Jasper", "description": "마케팅 카피 및 블로그 포스팅 특화 기업용 AI 텍스트", "category": "텍스트/문서", "url": "https://www.jasper.ai", "isFree": False, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90032, "name": "ChatPDF", "description": "PDF 문서를 업로드하여 내부 내용을 챗봇 형태로 질문", "category": "텍스트/문서", "url": "https://www.chatpdf.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90033, "name": "Kling AI", "description": "물리법칙을 리얼하게 구현하는 압도적 퀄리티의 동영상 생성 AI", "category": "비디오/오디오", "url": "https://klingai.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90034, "name": "Pika Labs", "description": "웹과 디스코드를 통한 3D, 애니메이션 트렌지션 영상 생성기", "category": "비디오/오디오", "url": "https://pika.art", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90035, "name": "DeepL", "description": "문맥 파악이 가장 자연스러운 문장 특화 번역기", "category": "텍스트/문서", "url": "https://www.deepl.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90036, "name": "Wandb", "description": "AI/머신러닝 개발자들을 위한 학습 대시보드 및 트래킹", "category": "개발/코드", "url": "https://wandb.ai", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90037, "name": "Devin", "description": "자율적으로 코딩 프로젝트를 처음부터 완수하는 최초의 AI SW엔지니어", "category": "개발/코드", "url": "https://cognition.ai", "isFree": False, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90038, "name": "Hugging Face", "description": "수많은 AI 모델들과 데이터셋, 커뮤니티가 있는 허브", "category": "개발/코드", "url": "https://huggingface.co", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90039, "name": "Replicate", "description": "오픈소스 모델들을 API나 클라우드로 편하게 배포하고 테스트", "category": "개발/코드", "url": "https://replicate.com", "isFree": False, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90040, "name": "Groq", "description": "LPU 엔진 기반 세상에서 가장 빠른 속도의 LLM 추론 플랫폼", "category": "기타", "url": "https://groq.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90041, "name": "Tripo3D", "description": "텍스트나 이미지 1장만으로 하이퀄리티 3D 모델(GLB, FBX) 생성", "category": "이미지/아트", "url": "https://www.tripo3d.ai", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90042, "name": "Spline AI", "description": "브라우저 기반 3D 웹 디자인 앱에서 프롬프트로 에셋 만들기", "category": "이미지/아트", "url": "https://spline.design/ai", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90043, "name": "Grammarly", "description": "작성 중인 영문 이메일 및 문서를 교정하고 AI로 다시 써주는 보조 툴", "category": "텍스트/문서", "url": "https://www.grammarly.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90044, "name": "Adobe Firefly", "description": "포토샵에 탑재된 상업적 이용 가능한 생성형 채우기 모델", "category": "이미지/아트", "url": "https://firefly.adobe.com", "isFree": False, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90045, "name": "PlayHT", "description": "텍스트를 사람 다운 다양한 목소리의 음원으로 변환하는 서비스", "category": "비디오/오디오", "url": "https://play.ht", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90046, "name": "CapCut", "description": "자동 캡션 및 AI 효과가 다양하게 탑재된 크로스플랫폼 숏폼 편집기", "category": "비디오/오디오", "url": "https://www.capcut.com", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90047, "name": "Opus Clip", "description": "유튜브 롱폼 영상을 트렌디한 숏폼들로 다중 자동 커팅해주는 AI", "category": "비디오/오디오", "url": "https://www.opus.pro", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90048, "name": "Character.AI", "description": "다양한 페르소나와 성격의 AI 캐릭터들과 역할극하며 대화하는 서비스", "category": "기타", "url": "https://character.ai", "isFree": True, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90049, "name": "Beautiful.ai", "description": "입력하는 텍스트 양에 맞춰 레이아웃 구조가 자동 완성되는 프레젠테이션", "category": "텍스트/문서", "url": "https://www.beautiful.ai", "isFree": False, "thumbnail": "https://www.damoa.ai/default-0.png"},
  {"id": 90050, "name": "DALL-E 3", "description": "프롬프트를 정교하게 따르고 텍스트를 이미지화 하는 초거대 화가 모델", "category": "이미지/아트", "url": "https://openai.com/dall-e-3", "isFree": False, "thumbnail": "https://www.damoa.ai/default-0.png"},
]

def append_tools():
    filepath = os.path.join("public", "data", "tools.jsonl")
    
    # Check current highest ID to avoid duplicate increment logic if we add more later
    current_max_id = 90000
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        obj = json.loads(line)
                        if 'id' in obj and isinstance(obj['id'], int) and obj['id'] > current_max_id:
                            current_max_id = obj['id']
    except Exception as e:
        print("Error reading max id, using defaults", e)

    added = 0
    with open(filepath, 'a', encoding='utf-8') as f:
        for tool in NEW_TOOLS:
            # Simple unique ID attribution if needed, we overwrite the id to ensure no conflicts
            current_max_id += 1
            tool["id"] = current_max_id
            f.write(json.dumps(tool, ensure_ascii=False) + "\n")
            added += 1

    print(f"Successfully appended {added} new AI tools to tools.jsonl!")

if __name__ == "__main__":
    append_tools()
