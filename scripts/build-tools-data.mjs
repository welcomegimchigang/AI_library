import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const csvPath = path.join(root, "AI툴_정리_데이터_cleaned.csv");
const fallbackJsonPath = path.join(root, "Ai-library-DB.json");
const outDir = path.join(root, "public", "data");
const outPath = path.join(outDir, "tools.json");

const KEEP_FIELDS = [
  "damoa_id",
  "serviceName",
  "website",
  "serviceType",
  "location",
  "keyFeatures_list",
  "price_bucket",
  "supportedPlatforms",
  "thumbnail",
  "releaseDate",
];

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
}

function parseFeatureList(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((x) => String(x).trim()).filter(Boolean);
  const text = String(input).trim();
  if (!text) return [];

  const normalized = text
    .replace(/^\[|\]$/g, "")
    .replace(/["']/g, "")
    .replace(/[|;/]/g, ",")
    .replace(/\s{2,}/g, " ");

  return normalized
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function toPriceBucket(raw) {
  const s = String(raw ?? "").toLowerCase();
  if (!s) return "unknown";
  const freeHit = /free|무료/.test(s);
  const paidHit = /paid|유료|\$|원|구독|월|연/.test(s);
  if (freeHit && paidHit) return "freemium/paid";
  if (freeHit) return "free";
  if (paidHit) return "paid";
  return "unknown";
}

function normalizeItem(item, index) {
  const normalized = {
    damoa_id: Number(item.damoa_id ?? item.id ?? index + 1),
    serviceName: String(item.serviceName ?? "").trim(),
    website: String(item.website ?? "").trim(),
    serviceType: String(item.serviceType ?? item.category ?? "").trim(),
    location: String(item.location ?? "").trim(),
    keyFeatures_list: parseFeatureList(item.keyFeatures_list ?? item.keyFeatures),
    price_bucket: String(item.price_bucket ?? "").trim() || toPriceBucket(item.price),
    supportedPlatforms: String(item.supportedPlatforms ?? item.platform ?? "").trim(),
    thumbnail: String(item.thumbnail ?? "").trim(),
    releaseDate: String(item.releaseDate ?? "").trim(),
  };

  KEEP_FIELDS.forEach((k) => {
    if (normalized[k] == null) normalized[k] = "";
  });

  return normalized;
}

function buildFromCsv() {
  const csvText = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(csvText);
  return rows.map((item, idx) => normalizeItem(item, idx)).filter((x) => x.serviceName);
}

function buildFromJsonFallback() {
  const raw = fs.readFileSync(fallbackJsonPath, "utf8");
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr)) throw new Error("Fallback JSON is not an array");
  return arr.map((item, idx) => normalizeItem(item, idx)).filter((x) => x.serviceName);
}

function main() {
  let tools = [];
  let source = "";

  if (fs.existsSync(csvPath)) {
    tools = buildFromCsv();
    source = "AI툴_정리_데이터_cleaned.csv";
  } else if (fs.existsSync(fallbackJsonPath)) {
    tools = buildFromJsonFallback();
    source = "Ai-library-DB.json (fallback)";
  } else {
    throw new Error("No data source found. Expected CSV or fallback JSON.");
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(tools, null, 2), "utf8");

  console.log(`Data built: ${tools.length} tools from ${source}`);
  console.log(`Output: ${outPath}`);
}

main();
