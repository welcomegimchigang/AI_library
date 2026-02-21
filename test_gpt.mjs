import { generateChatLayerWithGpt } from "./functions/_lib/openai.js";

async function run() {
    const env = {
        // 로컬이 아니라 실제 API 찌를 때 필요한 키 
        // OPENAI_API_KEY: process.env.OPENAI_API_KEY 
    };

    const gpt = await generateChatLayerWithGpt(env, { message: "노래추천 해주는 ai 알려줘" });
    console.log("GPT Output:", gpt);
}
run();
