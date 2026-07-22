import { readFile } from "node:fs/promises";

const html = await readFile("data/ebay-store-page-1.html", "utf8");

const patterns = [
  "str-item-card__property-title",
  "str-item-card__property-displayPrice",
  "href=https://www.ebay.com/itm/",
  "class=str-item-card",
  'class="str-item-card',
  "ProductCard",
  "s-item__title",
];

for (const pattern of patterns) {
  console.log(pattern, html.split(pattern).length - 1);
}

const articleClasses = [...html.matchAll(/<article class=("[^"]+"|[^\s>]+)/g)]
  .map((match) => match[1])
  .filter((value) => value.includes("str-item-card"));
console.log(articleClasses.slice(0, 60));

const firstProduct = html.indexOf("str-item-card__property-displayPrice");
console.log(html.slice(Math.max(0, firstProduct - 1200), firstProduct + 800));
