import { rankTools } from "./functions/_lib/tools.js";
import fs from "fs";

function run() {
    const data = JSON.parse(fs.readFileSync("./public/data/tools.json", "utf-8"));

    const queries = [
        "축구공 만드는 ai 알려줘",
        "반도체 회로설계 ai 있어?",
        "무료 영상 편집기"
    ];

    for (const q of queries) {
        const filters = { q };
        const result = rankTools(data, filters, q, 5);
        console.log(`\nQuery: "${q}"`);
        console.log(`Results: ${result.length} tools found.`);
        if (result.length > 0) {
            console.log(result.map(t => t.serviceName).join(", "));
        }
    }
}
run();
