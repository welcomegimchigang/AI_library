import os
import json
from dotenv import load_dotenv

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from pydantic import BaseModel, Field
import datetime

# 스크립트 위치 기준으로 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '../.dev.vars'))

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY가 환경변수나 .dev.vars 파일에 설정되지 않았습니다.")

JSONL_PATH = os.path.join(BASE_DIR, "../public/data/tools.jsonl")
FAISS_DB_DIR = os.path.join(BASE_DIR, "faiss_db")

def load_jsonl_to_documents(file_path):
    """JSONL 데이터를 읽어 LangChain Document 리스트로 변환합니다."""
    documents = []
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"JSONL 파일이 없습니다: {file_path}")
        
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                
                # 메타데이터 (부가 정보)
                meta = {
                    "id": str(data.get("id", "")),
                    "name": data.get("name", "Unknown"),
                    "url": data.get("url", ""),
                    "category": data.get("category", "")
                }
                
                # GPT가 이해하기 쉽도록 텍스트 컨텍스트 구성
                content = f"도구 이름: {data.get('name', '')}\n"
                if data.get('name_en'):
                    content += f"영문 이름: {data.get('name_en', '')}\n"
                content += f"카테고리: {data.get('category', '')}\n"
                content += f"서비스 설명: {data.get('description', '')}\n"
                if data.get('description_en'):
                    content += f"영문 설명: {data.get('description_en', '')}\n"
                content += f"유료/무료: {'무료' if data.get('isFree') else '유료 (또는 부분 유료)'}\n"
                
                docs = Document(page_content=content, metadata=meta)
                documents.append(docs)
                
            except Exception as e:
                print(f"JSON 파싱 에러 (라인 스킵): {e}")
                
    return documents

def log_missing_tool_kv(query: str, criteria: str):
    """
    조건에 맞는 도구가 없을 때 (Missing Tool)
    기존 Missing Tool KV 시스템과 동일한 형식으로 로컬 로그를 남기거나 API 페이로드를 생성합니다.
    (실제 프로덕션에서는 이 함수 내용을 Cloudflare KV 저장 로직이나 Discord Webhook 전송 등으로 교체 가능)
    """
    timestamp = datetime.datetime.now().isoformat()
    log_entry = {
        "query": query,
        "missing_criteria": criteria,
        "status": "pending",
        "timestamp": timestamp,
        "source": "rag_chatbot_cli"
    }
    
    # 임시로 터미널과 로컬 파일에 기록
    print(f"\n[Missing Tool KV 연동] 사용자가 찾는 도구가 현재 DB에 없습니다.")
    print(f"  - 요청 질의: {query}")
    print(f"  - 찾던 조건: {criteria}")
    
    # 로컬에 append 모드로 임시 저장
    log_file_path = os.path.join(BASE_DIR, "missing_tools_log.jsonl")
    try:
        with open(log_file_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
        print(f"[Missing Tool KV 연동] '{log_file_path}' 에 기록 완료.\n")
    except Exception as e:
        print(f"[Missing Tool KV 연동 에러] 파일 기록 실패: {e}\n")

def build_or_load_vector_db():
    """데이터를 벡터화하여 로컬 FAISS DB에 저장 및 로드합니다."""
    # text-embedding-3-small 이 가장 가성비 좋고 성능이 뛰어난 최신 임베딩 모델
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    
    # DB 디렉토리와 인덱스 파일이 없으면 처음부터 벡터화 (초기 인덱싱)
    if not os.path.exists(FAISS_DB_DIR) or not os.path.exists(os.path.join(FAISS_DB_DIR, "index.faiss")):
        print(f"👉 벡터 데이터베이스가 없습니다. [{JSONL_PATH}] 데이터를 인덱싱합니다. (잠시만 기다려주세요...)")
        documents = load_jsonl_to_documents(JSONL_PATH)
        
        # 문서들을 임베딩하여 로컬 디렉토리에 저장
        vectorstore = FAISS.from_documents(documents, embeddings)
        vectorstore.save_local(FAISS_DB_DIR)
        print(f"✅ 성공적으로 {len(documents)}개의 도구를 벡터 DB에 저장했습니다!\n")
    else:
        # 이미 인덱싱된 상태라면 로드만 수행하여 비용 절감
        vectorstore = FAISS.load_local(FAISS_DB_DIR, embeddings, allow_dangerous_deserialization=True)
        
    return vectorstore

def get_ai_recommendation(query):
    """사용자 질문에 맞는 도구를 FAISS DB에서 찾은 후, GPT로 조합하여 추천 답변을 반환합니다."""
    vectorstore = build_or_load_vector_db()
    
    # Retriever: 사용자의 질문에 가장 일치하는 문서 상위 10개(k=10)만 빠르고 정확하게 건져내기
    retriever = vectorstore.as_retriever(search_kwargs={"k": 10})
    
    # GPT에게 어떤 역할을 하고, 어떻게 대답할지 지시하는 메인 프롬프트
    template = """
당신은 현존하는 최고의 'AI 도구 큐레이터'입니다.
당신의 유일한 목적은 데이터베이스에 있는 AI 도구를 사용자에게 친절하게 추천하고 설명하는 것입니다.

[엄격한 행동 지침 - 필수 준수 사항]
1. (관련성 체크) 사용자의 질문이 'AI 도구 추천, AI 정보, 특정 AI 앱 검색'과 명확히 관련이 있는지 먼저 판단하세요.
   만약 코딩 작성(예: 크롤링 코드 짜줘), 일상 대화, 역사, 날씨 등 **AI 툴과 무관한 질문**이라면 무조건 `is_ai_related`를 false로 설정하고, 
   대답은 "저는 AI 추천 챗봇이기에 그러한 기능을 수행할 수 없습니다."라고 부드럽게 거절만 하고 넘어갑니다.

2. (DB 검색 및 매칭 체크) AI 관련 질문이라면, 제공된 [내부 데이터베이스 정보] 내에서 사용자의 상세 조건(예: 모바일, 윈도우, 특정 기능 등)을 만족하는 도구가 있는지 확인하세요.
   조건에 완벽히 부합하거나 매우 유사한 도구가 있다면 해당 도구들을 추천해주세요.
   만약 **조건에 맞는 도구가 데이터베이스에 아예 없다면**, 억지로 지어내지 말고 `has_matching_tools`를 false로 설정하세요.
   그리고 대답은 "아쉽게도 현재 해당 조건(예: 모바일 지원 등)을 만족하는 전용 툴은 없습니다."라고 명확히 안내해주세요.
   이때 사용자가 찾고자 했던 핵심 조건/기능을 `missing_criteria` 항목에 짧게 요약해서 적어주세요.

3. (정상 추천) 조건에 맞는 도구가 있다면, `has_matching_tools`를 true로 설정하고 추천 이유와 특징을 자연스럽게 설명해주세요.
   사용자가 특정 도구의 이름(한글/영문)을 언급했다면, 해당 내용을 우선적으로 찾아 추천합니다.

[내부 데이터베이스 정보]
{context}

[사용자 질문]
{question}
"""
    prompt = PromptTemplate.from_template(template)
    
    # LangChain Structured Output (Pydantic Schema)
    class ChatbotResponse(BaseModel):
        is_ai_related: bool = Field(description="사용자의 질문이 AI 툴 추천 및 정보 검색과 관련된 질문인지 여부")
        has_matching_tools: bool = Field(description="AI 관련 질문일 때, Context(DB) 안에 사용자의 세부 조건을 만족하는 툴이 존재하는지 여부")
        reply: str = Field(description="사용자에게 최종적으로 보여질 자연스러운 챗봇의 답변 텍스트")
        missing_criteria: str = Field(description="조건에 맞는 도구를 찾지 못했을 경우, 사용자가 찾으려 했던 핵심 조건 (예: '모바일 동영상 편집', '무료 한국어 TTS'). 찾았다면 빈 문자열.", default="")
    
    # 답변 생성용 LLM 설정 (gpt-5-mini 사용)
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
    # LLM에 스키마 강제 적용
    structured_llm = llm.with_structured_output(ChatbotResponse)
    
    # 여러 문서를 하나의 텍스트 덩어리로 합쳐주는 헬퍼
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)
        
    # LangChain Runnable 체인 구성
    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | structured_llm
    )
    
    response = rag_chain.invoke(query)
    
    # ---------------------------------------------------------
    # Structured Output을 활용한 로직 분리 제어 부
    # ---------------------------------------------------------
    
    if not response.is_ai_related:
        # AI 관련없는 질문 필터링
        return response.reply
        
    if response.is_ai_related and not response.has_matching_tools:
        # 조건에 맞는 툴이 없는 경우 Missing Tool KV(로컬 로그) 처리 넘김
        log_missing_tool_kv(query, response.missing_criteria)
        return response.reply
        
    # 정상 추천
    return response.reply

if __name__ == "__main__":
    print("========================================")
    print("🤖 AI 도구 추천 RAG 챗봇 시스템")
    print("========================================")
    print("질문을 입력해주세요 (종료: q)\n")
    
    while True:
        try:
            user_input = input(">> 당신: ")
            if user_input.lower() in ['q', 'exit', 'quit']:
                print("종료합니다.")
                break
            if not user_input.strip():
                continue
                
            print("\n[DB 검색 및 답변 생성 중...]")
            answer = get_ai_recommendation(user_input)
            print("========================================")
            print(f"💡 AI 추천 결과:\n{answer}\n")
            print("========================================")
            
        except KeyboardInterrupt:
            print("\n종료합니다.")
            break
        except Exception as e:
            print(f"\n❌ 오류 발생: {e}\n")
