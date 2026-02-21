import { rankTools } from "./functions/_lib/tools.js";
import fs from "fs";

function run() {
    const data = JSON.parse(fs.readFileSync("./public/data/tools.json", "utf-8"));

    // 모의 GPT 추출 파라미터 1: 카테고리 포함
    const filters1 = { category: "비디오/오디오", q: "노래추천" };
    const res1 = rankTools(data, filters1, "노래추천 해주는 ai 알려줘", 5);
    console.log("\n[Test 1] filters:", filters1);
    console.log("Results:", res1.length);
    res1.forEach(t => console.log(` - [${t.score}] ${t.serviceName} (${t.serviceType})`));

    // 모의 GPT 추출 파라미터 2: 검색어만 있을 경우
    const filters2 = { q: "노래추천" };
    const res2 = rankTools(data, filters2, "노래추천 해주는 ai 알려줘", 5);
    console.log("\n[Test 2] filters:", filters2);
    console.log("Results:", res2.length);
    res2.forEach(t => console.log(` - [${t.score}] ${t.serviceName} (${t.serviceType})`));
}
run();
