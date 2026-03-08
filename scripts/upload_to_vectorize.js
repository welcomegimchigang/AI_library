
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// 환경 변수 설정 (로컬 실행 시 필요)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const VECTOR_INDEX_NAME = 'ai-tools-index';

if (!OPENAI_API_KEY || !CF_ACCOUNT_ID || !CF_API_TOKEN) {
    console.error('❌ 에러: OPENAI_API_KEY, CF_ACCOUNT_ID, CF_API_TOKEN 환경 변수가 필요합니다.');
    process.exit(1);
}

const JSONL_PATH = path.join(process.cwd(), 'public', 'data', 'tools.jsonl');

async function getEmbedding(text) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text,
        }),
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI API Error: ${err}`);
    }
    const json = await res.json();
    return json.data[0].embedding;
}

async function upsertToVectorize(vectors) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/vectorize/v2/indexes/${VECTOR_INDEX_NAME}/insert`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(vectors),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error(`❌ Cloudflare Vectorize Error: ${err}`);
        return false;
    }
    return true;
}

async function main() {
    console.log('🚀 데이터 임베딩 및 업로드 시작...');
    const fileStream = fs.createReadStream(JSONL_PATH);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let batch = [];
    const BATCH_SIZE = 20;
    let count = 0;

    for await (const line of rl) {
        if (!line.trim()) continue;
        const tool = JSON.parse(line);

        // 임베딩할 텍스트 조합 (이름 + 설명 + 카테고리)
        const textToEmbed = `이름: ${tool.name}\n카테고리: ${tool.category}\n설명: ${tool.description}`;

        try {
            const embedding = await getEmbedding(textToEmbed);
            batch.push({
                id: tool.id.toString(),
                values: embedding,
                metadata: {
                    name: tool.name,
                    category: tool.category,
                    description: tool.description,
                    url: tool.url
                }
            });

            count++;
            process.stdout.write(`\r- 진행 중: ${count}개 완료...`);

            if (batch.length >= BATCH_SIZE) {
                await upsertToVectorize(batch);
                batch = [];
            }
        } catch (e) {
            console.error(`\n❌ [${tool.name}] 처리 중 오류:`, e.message);
        }
    }

    if (batch.length > 0) {
        await upsertToVectorize(batch);
    }

    console.log(`\n✅ 완료! 총 ${count}개의 도구가 Vectorize에 업로드되었습니다.`);
}

main();
