import os
import json
from dotenv import load_dotenv

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# 스크립트 실행 위치(scripts 폴더) 기준으로 최상단 경로에 있는 .dev.vars 로드
load_dotenv('../.dev.vars')

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY가 환경변수나 .dev.vars 파일에 설정되지 않았습니다.")

# 파일 경로 상대 설정 (scripts 폴더 기준)
JSONL_PATH = "../public/data/tools.jsonl"
CHROMA_DB_DIR = "./chroma_db"

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
                content += f"카테고리: {data.get('category', '')}\n"
                content += f"서비스 설명: {data.get('description', '')}\n"
                content += f"유료/무료: {'무료' if data.get('isFree') else '유료 (또는 부분 유료)'}\n"
                
                docs = Document(page_content=content, metadata=meta)
                documents.append(docs)
                
            except Exception as e:
                print(f"JSON 파싱 에러 (라인 스킵): {e}")
                
    return documents

def build_or_load_vector_db():
    """데이터를 벡터화하여 로컬 ChromaDB에 저장 및 로드합니다."""
    # text-embedding-3-small 이 가장 가성비 좋고 성능이 뛰어난 최신 임베딩 모델
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    
    # DB 디렉토리가 없으면 처음부터 벡터화 (초기 인덱싱)
    if not os.path.exists(CHROMA_DB_DIR):
        print(f"👉 벡터 데이터베이스가 없습니다. [{JSONL_PATH}] 데이터를 인덱싱합니다. (잠시만 기다려주세요...)")
        documents = load_jsonl_to_documents(JSONL_PATH)
        
        # 문서들을 임베딩하여 로컬 디렉토리에 저장
        vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=embeddings,
            persist_directory=CHROMA_DB_DIR
        )
        print(f"✅ 성공적으로 {len(documents)}개의 도구를 벡터 DB에 저장했습니다!\n")
    else:
        # 이미 인덱싱된 상태라면 로드만 수행하여 비용 절감
        vectorstore = Chroma(
            persist_directory=CHROMA_DB_DIR, 
            embedding_function=embeddings
        )
        
    return vectorstore

def get_ai_recommendation(query):
    """사용자 질문에 맞는 도구를 ChromaDB에서 3개 찾은 후, GPT로 조합하여 추천 답변을 반환합니다."""
    vectorstore = build_or_load_vector_db()
    
    # Retriever: 사용자의 질문에 가장 일치하는 문서 상위 3개(k=3)만 빠르고 정확하게 건져내기
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    
    # GPT에게 어떤 역할을 하고, 어떻게 대답할지 지시하는 프롬프트
    template = """
당신은 현존하는 최고의 AI 도구 큐레이터입니다. 
아래 추출된 [내부 데이터베이스 정보]만을 바탕으로 사용자의 질문에 가장 꼭 맞는 AI 도구를 친절하게 추천해주세요.
각 도구의 특징과 추천하는 이유를 설명해주고, 데이터베이스에 적절한 도구가 없다면 데이터베이스에는 없다고 솔직하게 답변해주세요.

[내부 데이터베이스 정보]
{context}

[사용자 질문]
{question}

추천 답변:
"""
    prompt = PromptTemplate.from_template(template)
    
    # 답변 생성용 LLM 설정 (gpt-5-mini)
    llm = ChatOpenAI(model="gpt-5-mini", temperature=0.2)
    
    # 여러 문서를 하나의 텍스트 덩어리로 합쳐주는 헬퍼
    def format_docs(docs):
        # Retrieved 된 문서들의 내용을 확인해볼 수도 있습니다.
        # for d in docs: print(d.metadata['name'])
        return "\n\n".join(doc.page_content for doc in docs)
        
    # LangChain 구성 (LCEL 문법)
    # 질문 -> 리트리버(검색) -> 포맷변환 -> 프롬프트 템플릿 -> GPT -> 결과 텍스트
    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return rag_chain.invoke(query)

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
