import os
import json
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings

# 스크립트 위치 기준으로 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '../.dev.vars'))

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY가 환경변수나 .dev.vars 파일에 설정되지 않았습니다.")

JSONL_PATH = os.path.join(BASE_DIR, "../public/data/tools.jsonl")
OUTPUT_PATH = os.path.join(BASE_DIR, "vectors.ndjson")

def process_and_embed():
    print(f"데이터를 읽고 임베딩을 시작합니다: {JSONL_PATH}")
    
    if not os.path.exists(JSONL_PATH):
        raise FileNotFoundError(f"JSONL 파일이 없습니다: {JSONL_PATH}")
        
    embeddings_model = OpenAIEmbeddings(model="text-embedding-3-small")
    
    documents = []
    metadatas = []
    ids = []
    
    # JSONL 읽기
    with open(JSONL_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            data = json.loads(line)
            
            tool_id = str(data.get("id", ""))
            
            # 메타데이터 준비 (Vectorize 메타데이터에는 중첩 객체 허용안되거나 제한적일 수 있으니 기본 타입만)
            meta = {
                "name": data.get("name", "Unknown"),
                "url": data.get("url", ""),
                "category": data.get("category", "")
            }
            
            # 텍스트 컨텍스트 구성
            content = f"도구 이름: {data.get('name', '')}\n"
            if data.get('name_en'):
                content += f"영문 이름: {data.get('name_en', '')}\n"
            content += f"카테고리: {data.get('category', '')}\n"
            content += f"서비스 설명: {data.get('description', '')}\n"
            if data.get('description_en'):
                content += f"영문 설명: {data.get('description_en', '')}\n"
            content += f"유료/무료: {'무료' if data.get('isFree') else '유료 (또는 부분 유료)'}\n"
            
            documents.append(content)
            metadatas.append(meta)
            ids.append(tool_id)
            
    print(f"총 {len(documents)}개의 문서를 임베딩합니다...")
    
    # 한 번에 임베딩 (LangChain 내부적으로 배치 처리됨)
    vectors = embeddings_model.embed_documents(documents)
    
    # ndjson 형식으로 저장
    print(f"임베딩 완료. {OUTPUT_PATH} 파일로 저장합니다...")
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as out_f:
        for tool_id, vector, meta in zip(ids, vectors, metadatas):
            record = {
                "id": tool_id,
                "values": vector,
                "metadata": meta
            }
            out_f.write(json.dumps(record, ensure_ascii=False) + "\n")
            
    print("✅ 모든 작업이 완료되었습니다! 이제 다음 명령어로 Cloudflare Vectorize에 업로드할 수 있습니다:")
    print("npx wrangler vectorize insert ai-tools-index --file scripts/vectors.ndjson")

if __name__ == "__main__":
    process_and_embed()
