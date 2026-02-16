# AI Tool Recommender MVP (React + Vite + Cloudflare Pages Functions)

LLM/OpenAI 호출 없이 JSON DB + 룰 기반 필터링으로 추천하는 챗봇 MVP입니다.

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
5. Environment variables: not required

## Notes
- Cloudflare build runs only `npm run build`.
- If DB source changes, run `npm run build:data` locally and commit `public/data/tools.json`.
- Primary source: `AI툴_정리_데이터_cleaned.csv` if present.
- Fallback source: `Ai-library-DB.json`.
