import { rankTools } from "./functions/_lib/tools.js";
import fs from "fs";

function run() {
    const data = JSON.parse(fs.readFileSync("./public/data/tools.json", "utf-8"));

    // The exact output from local GPT fallback
    const filters = { q: "노래추천 해주는 ai 알려줘" };
    const res = rankTools(data, filters, "노래추천 해주는 ai 알려줘", 5);

    console.log("\nResults:", res.length);
    res.forEach(t => console.log(` - [${t.score}] ${t.serviceName} (${t.serviceType})`));
}
run();
