/**
 * Cloudflare Pages Middleware for SEO Pre-rendering.
 * Intercepts requests from search engine crawlers (Googlebot, Bingbot, etc.)
 * and injects proper <title>, <meta>, and JSON-LD structured data into the HTML.
 * 
 * Self-contained: reads tools.jsonl directly instead of importing from _lib.
 */
const BOT_UA = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|embedly|quora|pinterest|discord|telegram|whatsapp|slack|ia_archiver|archive\.org_bot|semrushbot|ahrefsbot|mj12bot|chrome-lighthouse/i;

export async function onRequest(context) {
  const { request, next } = context;
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);

  // Only intercept bot requests for /tool/:id pages
  const toolMatch = url.pathname.match(/^\/tool\/(\d+)$/);
  if (!toolMatch || !BOT_UA.test(ua)) {
    return next();
  }

  const toolId = toolMatch[1];

  try {
    // Fetch tools.jsonl from our own static assets
    const toolsUrl = new URL("/data/tools.jsonl", url.origin);
    const res = await fetch(toolsUrl.toString());
    if (!res.ok) return next();

    const text = await res.text();
    const lines = text.split("\n").filter(l => l.trim());

    let tool = null;
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (String(parsed.id) === toolId) {
          tool = parsed;
          break;
        }
      } catch { }
    }

    if (!tool) return next();

    const name = tool.name || "";
    const desc = (tool.description || "").replace(/"/g, "&quot;").slice(0, 160);
    const category = tool.category || "";
    const toolUrl = tool.url || "";
    const isFree = tool.isFree;
    const thumbnail = tool.thumbnail || "";
    const siteUrl = `${url.origin}/tool/${toolId}`;

    // JSON-LD Structured Data
    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": name,
      "description": desc,
      "url": toolUrl,
      "applicationCategory": category,
      "offers": {
        "@type": "Offer",
        "price": isFree ? "0" : "",
        "priceCurrency": "KRW",
      },
      "image": thumbnail,
      "operatingSystem": "Web"
    });

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name} - AI 도구 상세 | foryou.ai</title>
  <meta name="description" content="${desc}" />
  <meta name="keywords" content="${name}, ${category}, AI 도구, AI tool, 인공지능" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${name} - AI 도구 리뷰 및 정보" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${siteUrl}" />
  <meta property="og:image" content="${thumbnail}" />
  <meta property="og:site_name" content="foryou.ai - AI 도구 도서관" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${name}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${thumbnail}" />
  <script type="application/ld+json">${jsonLd}</script>
  <link rel="canonical" href="${siteUrl}" />
</head>
<body>
  <div id="root">
    <main>
      <h1>${name}</h1>
      <p>${desc}</p>
      <p>카테고리: ${category}</p>
      <p>가격: ${isFree ? "무료" : "유료"}</p>
      <a href="${toolUrl}">공식 사이트 방문</a>
    </main>
  </div>
  <script>
    if (!/bot|crawl|spider|slurp|facebook|twitter|linkedin|discord|telegram|whatsapp/i.test(navigator.userAgent)) {
      window.location.replace('${siteUrl}');
    }
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return next();
  }
}
