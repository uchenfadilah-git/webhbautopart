import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = "https://www.ebay.com/str/hbautopartshop";
const headers = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
};

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return decodeHtml(value.replace(/<[^>]*>/g, " "));
}

function cleanUrl(value = "") {
  return decodeHtml(value)
    .replace(/\\u002F/g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/;?(_sp|hash|itmmeta)=.*$/i, "")
    .trim();
}

function normalizeImage(url = "") {
  return cleanUrl(url).replace(/\/s-l\d+\.(jpg|png|webp)/i, "/s-l1000.$1");
}

function extractProducts(html) {
  const cards = [];
  const linkPattern = /href=(https:\/\/www\.ebay\.com\/itm\/[^\s>]+)/g;
  let match;

  while ((match = linkPattern.exec(html))) {
    const start = Math.max(0, html.lastIndexOf("<article", match.index));
    const next = html.indexOf("href=https://www.ebay.com/itm/", match.index + 1);
    const end = next === -1 ? html.indexOf("</section>", match.index) : next;
    cards.push(html.slice(start, end));
  }

  return cards
    .map((card) => {
      const linkMatch = card.match(/href=(https:\/\/www\.ebay\.com\/itm\/[^\s>]+)/);
      const idMatch = linkMatch?.[1]?.match(/\/itm\/(\d+)/);
      const titleMatch = card.match(/str-item-card__property-title[\s\S]*?<span class=str-text-span[^>]*>([\s\S]*?)<\/span>/);
      const priceMatch = card.match(/str-item-card__property-displayPrice[^>]*>([\s\S]*?)<\/span>/);
      const imageMatch = card.match(/<img[^>]+src=(https:\/\/i\.ebayimg\.com\/[^\s>]+)/);

      if (!linkMatch || !idMatch || !titleMatch) return null;

      const title = stripTags(titleMatch[1]);
      const brandMatch = title.match(/\b(Yamaha|Honda|Toyota|Mitsubishi|Kawasaki|Suzuki|BRT|TDR|OEM)\b/i);

      return {
        id: idMatch[1],
        title,
        price: stripTags(priceMatch?.[1] ?? ""),
        image: normalizeImage(imageMatch?.[1] ?? ""),
        ebayUrl: cleanUrl(linkMatch[1]),
        brand: brandMatch ? brandMatch[1].toUpperCase() : "Parts",
        source: "eBay HBAutoPartShop",
      };
    })
    .filter(Boolean);
}

await mkdir("data", { recursive: true });

const productsById = new Map();
let pageCount = 0;

for (let page = 1; page <= 4; page += 1) {
  const url = `${baseUrl}?_tab=shop&_ipg=240&_pgn=${page}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    console.warn(`Skip page ${page}: ${response.status}`);
    continue;
  }

  const html = await response.text();
  await writeFile(`data/ebay-store-page-${page}.html`, html);

  const products = extractProducts(html);
  if (products.length === 0 && page > 1) break;

  pageCount += 1;
  for (const product of products) {
    productsById.set(product.id, product);
  }
}

const products = [...productsById.values()].sort((a, b) => a.title.localeCompare(b.title));
const payload = {
  store: {
    name: "HBAutoPartShop",
    domain: "hbautopartshop.com",
    ebayStore: baseUrl,
    description:
      "Official catalog for HBAutoPartShop. Checkout is completed securely through each eBay listing.",
    updatedAt: new Date().toISOString(),
  },
  products,
};

await writeFile("data/products.json", JSON.stringify(payload, null, 2));
await writeFile("data/products.js", `window.HBAP_CATALOG = ${JSON.stringify(payload, null, 2)};\n`);

console.log(JSON.stringify({ pageCount, products: products.length }, null, 2));
