import { generateChatLayerWithGpt } from "./functions/_lib/openai.js";

async function run() {
    const env = {
        // OPENAI_API_KEY: process.env.OPENAI_API_KEY // Optional for testing actual API
    };

    const testCases = [
        "몇살이야?",
        "축구공 만드는 ai 알려줘",
        "반도체 회로설계 ai 있어?",
        "무료 영상 편집기"
    ];

    for (const msg of testCases) {
        console.log(`\n--- Testing: "${msg}" ---`);
        const gpt = await generateChatLayerWithGpt(env, { message: msg });
        console.log("GPT Output:", gpt);
    }
}
run();
