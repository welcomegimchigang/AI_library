import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../public/data/tools.jsonl');
const OUT_PATH = path.join(__dirname, '../public/data/tools_verified.jsonl');

const lines = fs.readFileSync(DB_PATH, 'utf8').split('\n').filter(l => l.trim().length > 0);
const tools = lines.map(l => JSON.parse(l));

async function fetchMeta(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) {
            if (res.status === 403 || res.status === 401) {
                // Many AI sites block bots with 403, we shouldn't necessarily delete them.
                return { ok: true, status: res.status, title: 'Bot blocked (assumed alive)', desc: '' };
            }
            return { ok: false, status: res.status, error: `HTTP ${res.status}` };
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
            return { ok: true, status: res.status, title: 'Not HTML', desc: '' };
        }

        const html = await res.text();

        // Extract Title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';

        // Extract Meta Description
        let desc = '';
        const metaMatch = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
            html.match(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);

        if (metaMatch) {
            desc = metaMatch[1].trim();
        }

        return { ok: true, status: res.status, title, desc };

    } catch (err) {
        if (err.name === 'AbortError') {
            return { ok: false, status: 'TIMEOUT', error: 'Timeout' };
        }
        return { ok: false, status: 'ERROR', error: err.message };
    }
}

async function run() {
    console.log(`Starting verification for ${tools.length} tools...`);

    let validTools = [];
    let deadStats = [];

    // We'll run in batches of 10 to be polite and not exhaust sockets
    const BATCH_SIZE = 10;
    for (let i = 0; i < tools.length; i += BATCH_SIZE) {
        const batch = tools.slice(i, i + BATCH_SIZE);

        const promises = batch.map(async (tool) => {
            // Small random delay to avoid triggering rate limits instantly
            await new Promise(r => setTimeout(r, Math.random() * 1000));
            const result = await fetchMeta(tool.url);
            return { tool, result };
        });

        const results = await Promise.all(promises);

        for (const { tool, result } of results) {
            if (result.ok) {
                // If it's alive, keep it. Optionally update description if we want, but right now we just verify.
                // We will store the original tool block, maybe append the scraped meta for logging.
                validTools.push(tool);
                process.stdout.write(`\r✅ Verified: ${validTools.length}/${i + BATCH_SIZE} (${deadStats.length} Dead)`);
            } else {
                deadStats.push({ name: tool.name, url: tool.url, error: result.error });
            }
        }
    }

    console.log('\n\n--- COMPLETED ---');
    console.log(`Alive: ${validTools.length}`);
    console.log(`Dead : ${deadStats.length}`);
    console.log('\nSample Dead URLs:');
    console.log(deadStats.slice(0, 5));

    // Write new JSONL
    const outData = validTools.map(t => JSON.stringify(t)).join('\n');
    fs.writeFileSync(OUT_PATH, outData, 'utf8');
    console.log(`\nCleaned DB saved to: ${OUT_PATH}`);
}

run();
