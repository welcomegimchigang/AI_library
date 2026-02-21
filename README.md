# AI Tool Recommender MVP (React + Vite + Cloudflare Pages Functions)

추천은 JSON DB + 룰 기반 필터링(코드)으로 결정하고, 대화 톤/티키타카는 GPT-5 mini가 담당하는 챗봇 MVP입니다.

## Architecture (Option A)
- DB file: `public/data/tools.json`
- Frontend와 Functions가 같은 정적 자산을 공유합니다.
- Functions는 `env.ASSETS.fetch('/data/tools.json')`로 안정적으로 로드합니다.

## Local Dev
1. `npm install`
2. `npm run dev`
3. `npm run build`
4. `npm run preview:cf`

## API
- `GET /api/health` -> `{ "ok": true }`
- `GET /api/tools?category=&budget=&location=&platform=&q=&limit=`
- `POST /api/chat` -> `{ "filters": {...}, "tools": [...], "workflow": [...] }`

## Cloudflare Pages Deploy
1. Connect repository
2. Build command: `npm run build`
3. Output directory: `dist`
4. Functions directory: `functions`
5. Environment variables:
   - `OPENAI_API_KEY` (required for GPT 대화 레이어)

## Notes
- Cloudflare build runs only `npm run build`.
- If DB source changes, run `npm run build:data` locally and commit `public/data/tools.json`.
- Primary source: `AI툴_정리_데이터_cleaned.csv` if present.
- Fallback source: `Ai-library-DB.json`.
- `/api/chat`은 후보 툴(최대 8개)만 GPT에 전달하며, 전체 DB를 모델에 넣지 않습니다.
