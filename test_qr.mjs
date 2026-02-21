import { generateChatLayerWithGpt } from "./functions/_lib/openai.js";

async function run() {
    const testCases = [
        "무료만 다시 보기",
        "웹 위주로 보기",
        "비슷한 툴 더 보기",
        "유료 포함 보기"
    ];

    for (const msg of testCases) {
        const res = await generateChatLayerWithGpt({}, { message: msg });
        console.log(`\nQuery: "${msg}" -> Intent: ${res.intent}`);
    }
}
run();
