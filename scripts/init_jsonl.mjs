import fs from 'fs';
import path from 'path';

const toolsJsonPath = path.join(process.cwd(), 'public/data/tools.json');
const outJsonlPath = path.join(process.cwd(), 'public/data/tools.jsonl');

const data = JSON.parse(fs.readFileSync(toolsJsonPath, 'utf8'));
const wstream = fs.createWriteStream(outJsonlPath);

function inferCategory(typeId) {
    if (!typeId) return "기타";
    const t = String(typeId).toLowerCase();
    if (t.includes("이미지") || t.includes("디자인") || t.includes("아트") || t.includes("그림") || t.includes("로고") || t.includes("image")) return "이미지/아트";
    if (t.includes("글") || t.includes("텍스트") || t.includes("문서") || t.includes("요약") || t.includes("text") || t.includes("번역") || t.includes("블로그")) return "텍스트/문서";
    if (t.includes("코드") || t.includes("개발") || t.includes("프로그래밍") || t.includes("code") || t.includes("dev")) return "개발/코드";
    if (t.includes("영상") || t.includes("비디오") || t.includes("음악") || t.includes("오디오") || t.includes("음성") || t.includes("video") || t.includes("audio")) return "비디오/오디오";
    return "기타";
}

for (const raw of data) {
    let desc = "";
    if (Array.isArray(raw.keyFeatures_list)) {
        desc = raw.keyFeatures_list.join(", ");
    } else if (typeof raw.keyFeatures_list === 'string') {
        desc = raw.keyFeatures_list;
    }

    const priceBucket = String(raw.price_bucket || "").toLowerCase();
    const isFree = priceBucket.includes('free') || priceBucket.includes('무료');

    const mapped = {
        id: raw.damoa_id || Math.floor(Math.random() * 100000),
        name: raw.serviceName || "Unknown Tool",
        description: desc || "No description provided.",
        category: inferCategory(raw.serviceType),
        url: raw.website || "https://example.com",
        isFree: isFree,
        thumbnail: raw.thumbnail || "https://www.damoa.ai/default-0.png"
    };

    wstream.write(JSON.stringify(mapped) + '\n');
}

wstream.end();
console.log(`Converted ${data.length} tools to ${outJsonlPath}`);
