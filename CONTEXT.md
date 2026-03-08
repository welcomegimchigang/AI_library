# 📦 AI-library (LoominAI) 프로젝트 컨텍스트

> 마지막 업데이트: 2026-03-01  
> ⚠️ 새 작업을 시작하기 전에 이 파일부터 읽어주세요.

---

## 1. 프로젝트 개요

- **서비스명**: LoominAI
- **목적**: 유저가 원하는 AI 툴을 대화형 챗봇으로 추천받고, 카테고리별로 탐색하는 웹 서비스
- **로컬 경로**: `c:\Users\sungu\Desktop\AI-library`
- **배포**: Cloudflare Pages (wrangler)

---

## 2. 기술 스택

| 레이어 | 기술 |
|---|---|
| 프론트엔드 | React 19 + TypeScript + Vite 7 |
| 스타일링 | Tailwind CSS v4 |
| 라우팅 | react-router-dom v7 |
| 다국어 | i18next (한/영) |
| 백엔드 | Cloudflare Pages Functions (Edge JS) |
| AI 엔진 | OpenAI `gpt-4o-mini` (JSON mode) |
| DB | Cloudflare D1 (SQL) + KV (캐시/Rate limit) |
| 정적 에셋 | Cloudflare ASSETS 바인딩 (`tools.jsonl`) |
| 데이터 파이프라인 | Python 스크립트 (scripts/) |

---

## 3. 디렉토리 구조

```
AI-library/
├── src/
│   ├── pages/              # 페이지 컴포넌트
│   │   ├── home-page.tsx
│   │   ├── chat-page.tsx           ← 챗봇 UI
│   │   ├── tool-detail-page.tsx    ← 툴 상세 + 클릭 추적
│   │   ├── admin-page.tsx          ← 관리자 대시보드
│   │   ├── profile-page.tsx
│   │   ├── feedback-page.tsx
│   │   ├── submit-tool-page.tsx
│   │   └── ...
│   ├── components/
│   │   ├── tool-library.tsx    ← 메인 툴 목록 + 필터 UI (핵심)
│   │   ├── ai-tool-card.tsx
│   │   ├── header.tsx
│   │   ├── persona-modal.tsx   ← 유저 페르소나 입력 모달
│   │   └── ...
│   ├── contexts/               # React Context (인증 등)
│   ├── lib/                    # 클라이언트 유틸리티
│   └── locales/                # 한/영 번역 JSON
│
├── functions/
│   ├── _middleware.js          # Cloudflare 전역 미들웨어 (CORS, 인증)
│   ├── _lib/
│   │   ├── tools.js            ← 툴 로딩·필터링·랭킹 핵심 로직 (★)
│   │   └── openai.js           ← GPT 호출 래퍼 (의도 분류 + 필터 추출) (★)
│   └── api/
│       ├── chat.js             ← POST /api/chat 챗봇 메인 엔드포인트 (★)
│       ├── tools.js
│       ├── feedback.js
│       ├── submit-tool.js
│       ├── missing.js          # 누락 툴 KV 처리
│       └── db/
│           ├── init.js         # D1 테이블 초기화
│           ├── clicks.js       # 툴 클릭 이벤트 저장
│           ├── reviews.js
│           ├── upvotes.js
│           └── bookmarks.js
│
├── scripts/                    # 데이터 관리 스크립트
│   ├── rag_chatbot.py          # RAG 챗봇 (LangChain + ChromaDB + OpenAI)
│   ├── build-tools-data.mjs    # tools.jsonl → 정적 파일 빌드
│   ├── add_50_tools.py         # GPT로 새 툴 데이터 자동 생성
│   ├── update_global_ranks.py  # monthly_visits 랭킹 업데이트
│   ├── reclassify.py           # 카테고리 재분류
│   ├── add_location.py         ← location 필드 추가 (최근 작업)
│   ├── verify_links.mjs        # 링크 유효성 검사
│   ├── notify_discord.py       # Discord 웹훅 알림
│   ├── monthly_reporter.py     # 월간 통계 리포트
│   └── pipeline.bat            # 전체 파이프라인 일괄 실행
│
├── data/                       # 원본 데이터
├── public/data/tools.jsonl     ← 배포용 AI 툴 데이터베이스 (JSONL, 핵심)
├── CONTEXT.md                  ← 이 파일
├── package.json
└── vite.config.ts
```

---

## 4. 핵심 시스템 설계

### 4-1. 챗봇 요청 흐름 (`/api/chat`)

```
유저 메시지 POST /api/chat
  { message, history, filters, persona, session_id, userEmail }
  ↓
[Rate Limiting] KV 기반 / 게스트 10회·유저 30회 (일일)
  ↓
[관리자 슬래시 커맨드]
  /adminsupernovatoken  → 토큰 초기화
  /adminsupernova {툴} → KV 수집 대기열에 수동 추가
  ↓
[GPT Intent 분류] openai.js > generateChatLayerWithGpt()
  → intent: "search_tools" | "off_topic"
  → filters: { category, budget, platform, location, q }
  → reply: 챗봇 답변 텍스트
  ↓
[툴 필터링 + 랭킹] tools.js > rankTools()
  필터: budget, platform, location, q
  스코어: 키워드 매칭 → 2차: monthly_visits(트래픽)
  ↓
[D1 로그 저장] search_logs INSERT (비동기 waitUntil)
  ↓
[결과 반환]
  매칭 0 → KV missing 저장 + Discord 알림 → 빈 결과
  매칭 있음 → tools 배열 반환 (최대 5개)
```

### 4-2. GPT 프롬프트 규칙 (`openai.js`)

- **모델**: `gpt-4o-mini`, JSON mode, max_tokens: 200
- 완제품 텍스트 요청 → `off_topic`
- 도구를 **찾는** 뉘앙스 → 단어 불문 `search_tools`
- **후속 메시지는 history 전체 고려** (system prompt에 history 삽입)
- 필터 `q` 추출 시 서술어 금지 (예: `헬스 루틴 짜주는` → `헬스 루틴`)
- `location`: 국내 표현 → `"국내"`, 해외 → `"해외"` (문자열)

### 4-3. 툴 필터링/랭킹 (`tools.js`)

| 함수 | 역할 |
|---|---|
| `matchBudget(tool, budget)` | free / paid / freemium 매칭 |
| `matchLocation(tool, location)` | `tool.location` 필드 기반 국내/해외 |
| `matchPlatform(tool, platform)` | web / mobile / windows / mac |
| `matchQ(tool, q)` | 한국어 어미 제거 후 키워드 포함 여부 |
| `scoreTool(tool, filters, message)` | 관련도 점수 계산 |
| `rankTools(tools, filters, message, limit)` | 필터 → 스코어 → monthly_visits 순 정렬 |

---

## 5. D1 데이터베이스 스키마

| 테이블 | 주요 컬럼 | 용도 |
|---|---|---|
| `search_logs` | user_query, gpt_intent, gpt_filters, matched_count, user_gender, user_birth_year, user_job, session_id | 검색 로그 |
| `tool_clicks` | tool_id, tool_name, user_email, session_id, clicked_at | 클릭 추적 |
| `reviews` | tool_id, user_email, rating, content | 리뷰 |
| `upvotes` | tool_id, user_email | 추천수 |
| `bookmarks` | tool_id, user_email | 북마크 |

**KV 네임스페이스: `MISSING_TOOLS_KV`**
- `missing_*` → 검색 실패 툴 대기열
- `usage_*` → Rate limit 카운터 (TTL 24h)

---

## 6. tools.jsonl 툴 데이터 필드

```json
{
  "damoa_id": 101,
  "serviceName": "ChatGPT",
  "website": "https://chat.openai.com",
  "serviceType": "글쓰기/컨텐츠",
  "location": "해외",
  "keyFeatures_list": ["자연어 처리", "대화형 AI"],
  "price_bucket": "freemium/paid",
  "supportedPlatforms": "web, mobile",
  "thumbnail": "https://...",
  "releaseDate": "2022-11-01",
  "monthly_visits": 1800000000,
  "description": "..."
}
```

> **location 필드**: `"국내"` 또는 `"해외"` (문자열, matchLocation()에서 참조)  
> **price_bucket**: `"free"` / `"paid"` / `"freemium/paid"` / `"unknown"`

---

## 7. 환경 변수 (Cloudflare)

| 변수명 | 용도 |
|---|---|
| `OPENAI_API_KEY` | GPT API 키 |
| `DISCORD_WEBHOOK_URL` | 알림 웹훅 |
| `DB` | D1 바인딩 |
| `MISSING_TOOLS_KV` | KV 바인딩 |
| `ASSETS` | 정적 파일 바인딩 (tools.jsonl 로딩) |

---

## 8. 최근 작업 이력

| 날짜 | 작업 | 관련 파일 |
|---|---|---|
| 2026-03-01 | 챗봇 후속 질문 컨텍스트 이슈 수정 (history 전달, location 필터 정규화) | `openai.js`, `tools.js`, `chat.js` |
| 2026-02-28 | 툴 클릭 추적 기능 구현 (D1 tool_clicks 테이블, API, 관리자 위젯) | `api/db/clicks.js`, `tool-detail-page.tsx`, `admin-page.tsx` |
| 2026-02-28 | 홈 화면 배경 이미지 수정 | `home-page.tsx`, `public/` |
| 2026-02-28 | 홈 화면 UI 리디자인 (Teal/Brown 팔레트, Atomic Design) | `home-page.tsx`, `index.css` |
| 2026-02-23 | 툴 랭킹 로직 개선 (`monthly_visits` 기반 2차 정렬) | `tools.js`, `update_global_ranks.py` |
| 2026-02-21 | RAG 시스템 구현 (LangChain + ChromaDB) | `scripts/rag_chatbot.py` |

---

## 9. 현재 알려진 이슈 / TODO

- [ ] RAG 챗봇(`rag_chatbot.py`)과 Cloudflare 챗봇은 별개 운영 → 통합 검토
- [ ] `monthly_visits`는 휴리스틱 기반 → 실제 트래픽 데이터 수집 방안 필요
- [ ] Rate limit KV와 missing KV가 같은 `MISSING_TOOLS_KV` 공유 → 분리 검토
- [ ] 챗봇 history를 클라이언트가 관리 → 세션 유실 시 컨텍스트 손실 가능

---

## 10. 로컬 개발 명령어

```bash
npm run dev          # Vite 개발 서버
npm run preview:cf   # Cloudflare Pages 로컬 미리보기 (wrangler)
npm run build:data   # tools.jsonl → data/ 빌드
npm run build        # 프로덕션 빌드
```

---

## 11. 스타트업 팀 (Agents)

서비스 운영과 개발을 위해 다음 4인의 가상 팀원(Agent)이 구성되어 있습니다. 상세 정의는 `.agents/` 폴더를 참조하세요.

| 이름 | 역할 | 주요 업무 |
|---|---|---|
| **Sarah** | **Product Manager** | 전체 로드맵 관리, 업무 배분, 결과물 최종 검토 |
| **Leo** | **Full-Stack Developer** | React UI 및 API 개발, 버그 수정, 기술 설계 |
| **Alex** | **Data Engineer** | `tools.jsonl` 데이터 관리, Python 파이프라인 운영 |
| **Chloe** | **Growth Marketer** | 홍보 카피 작성, SEO 최적화, 피드백 분석 |

**협업 모델**: Sarah가 목표를 설정하면 각 팀원이 전문 분야에 맞춰 업무를 수행하고 최종적으로 Sarah의 승인을 거쳐 반영합니다.
