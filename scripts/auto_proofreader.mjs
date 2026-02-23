import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../public/data/tools.jsonl');
const OUT_PATH = path.join(__dirname, '../public/data/tools.jsonl');

const lines = fs.readFileSync(DB_PATH, 'utf8').split('\n').filter(l => l.trim().length > 0);
const tools = lines.map(l => JSON.parse(l));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in environment");
    process.exit(1);
}

async function fetchMeta(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Safari/537.36)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
            },
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) return null;
        if (!(res.headers.get('content-type') || '').includes('text/html')) return null;

        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';

        let desc = '';
        const metaMatch = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
            html.match(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
        if (metaMatch) desc = metaMatch[1].trim();

        return { title, desc: desc.slice(0, 300) };
    } catch (err) {
        return null;
    }
}

async function checkWithGPT(tool, meta) {
    if (!meta || (!meta.title && !meta.desc)) return "KEEP";

    const prompt = `
You are an AI directory editor. Review this AI tool:
Name: ${tool.name}
Current Description: ${tool.description}

We scraped its live website and found:
Title: ${meta.title}
Meta Description: ${meta.desc}

If the current description is reasonably accurate and not completely outdated, reply with strictly "KEEP". Do NOT reply with anything else.
If the current description is completely wrong, missing key features from the meta, or if the meta shows a major pivot, rewrite the description concisely in Korean (1-2 sentences maximum, ending politely with ~입니다/합니다). Return ONLY the new Korean text, no quotes, no extra words.
`;

    try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                max_tokens: 150
            })
        });

        if (!res.ok) return "KEEP";
        const data = await res.json();
        const reply = data.choices[0].message.content.trim();
        return reply;
    } catch (err) {
        return "KEEP";
    }
}

async function run() {
    console.log(`Starting GPT Auto-Proofreader for ${tools.length} tools...`);
    let updatedCount = 0;

    // Create a backup
    fs.writeFileSync(DB_PATH + '.bak', fs.readFileSync(DB_PATH));

    const CONCURRENCY = 15;
    for (let i = 0; i < tools.length; i += CONCURRENCY) {
        const batch = tools.slice(i, i + CONCURRENCY);

        await Promise.all(batch.map(async (tool) => {
            const meta = await fetchMeta(tool.url);
            if (meta) {
                const decision = await checkWithGPT(tool, meta);
                if (decision !== "KEEP" && decision.length > 5 && !decision.includes("KEEP")) {
                    // Update the description
                    // console.log(`\n[UPDATED] ${tool.name}`);
                    // console.log(`  Old: ${tool.description}`);
                    // console.log(`  New: ${decision}`);
                    tool.description = decision;
                    updatedCount++;
                }
            }
        }));

        process.stdout.write(`\rProcessed ${Math.min(i + CONCURRENCY, tools.length)}/${tools.length} (Updated: ${updatedCount})`);

        // Incrementally save to be safe
        const outData = tools.map(t => JSON.stringify(t)).join('\n');
        fs.writeFileSync(OUT_PATH, outData, 'utf8');
    }

    console.log(`\n\nProofreading Complete! Updated ${updatedCount} descriptions.`);
}

run();
