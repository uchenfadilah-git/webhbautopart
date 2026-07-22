const catalog = window.HBAP_CATALOG || { store: {}, products: [] };

const partRules = [
  ["Engine", /\b(engine|cylinder|piston|crank|camshaft|valve|gasket|bore|injector|throttle|mount)\b/i],
  ["Brake", /\b(brake|caliper|disc|rotor|pad|pedal)\b/i],
  ["Electrical", /\b(coil|sensor|abs|ecu|module|actuator|switch|relay|ignition|wire|lamp|light)\b/i],
  ["Suspension", /\b(shock|fork|spring|strut|absorber|suspension)\b/i],
  ["Drivetrain", /\b(chain|sprocket|clutch|gear|shaft|bearing|belt)\b/i],
  ["Body", /\b(cover|seat|clip|mirror|panel|fender|tank|fairing|emblem)\b/i],
  ["Wheel", /\b(wheel|tire|tyre|rim|hub)\b/i],
];

function inferKind(title) {
  if (/\b(oem|genuine)\b/i.test(title)) return "Genuine";
  if (/\b(brt|tdr|racing|race)\b/i.test(title)) return "Racing";
  if (/\b(aftermarket|replacement)\b/i.test(title)) return "Aftermarket";
  return "Parts";
}

function inferPartType(title) {
  return partRules.find(([, pattern]) => pattern.test(title))?.[0] || "Other";
}

function parsePrice(price = "") {
  const raw = price.replace(/[^\d.]/g, "");
  return Number(raw) || 0;
}

const products = catalog.products.map((product, index) => {
  const kind = inferKind(product.title);
  const partType = inferPartType(product.title);
  const priceNumber = parsePrice(product.price);
  return {
    ...product,
    index,
    kind,
    partType,
    priceNumber,
    searchText: `${product.title} ${product.brand} ${product.id} ${kind} ${partType}`.toLowerCase(),
  };
});

const state = {
  query: "",
  brand: "all",
  partType: "all",
  kind: "all",
  priceMin: "",
  priceMax: "",
  sort: "featured",
};

const grid = document.querySelector("#productGrid");
const resultCount = document.querySelector("#resultCount");
const totalProducts = document.querySelector("#totalProducts");
const searchInput = document.querySelector("#searchInput");
const navSearchInput = document.querySelector("#navSearchInput");
const sortSelect = document.querySelector("#sortSelect");
const brandGroup = document.querySelector("#brandChips");
const categoryList = document.querySelector("#categoryList");
const kindList = document.querySelector("#kindList");
const priceMin = document.querySelector("#priceMin");
const priceMax = document.querySelector("#priceMax");
const clearFilters = document.querySelector("#clearFilters");
const dialog = document.querySelector("#productDialog");
const dialogContent = document.querySelector("#dialogContent");

function setIcon() {
  if (window.lucide) window.lucide.createIcons();
}

function countBy(key) {
  return products.reduce((map, product) => {
    const value = product[key] || "Other";
    map.set(value, (map.get(value) || 0) + 1);
    return map;
  }, new Map());
}

function sortedValues(key, preferred = []) {
  const counts = countBy(key);
  const values = [...counts.keys()];
  return [
    ...preferred.filter((value) => counts.has(value)),
    ...values.filter((value) => !preferred.includes(value)).sort(),
  ];
}

function renderChips(container, key, values, allLabel) {
  container.replaceChildren();
  const all = document.createElement("button");
  all.className = "chip active";
  all.type = "button";
  all.dataset[key] = "all";
  all.textContent = allLabel;
  container.appendChild(all);

  for (const value of values) {
    const button = document.createElement("button");
    button.className = "chip";
    button.type = "button";
    button.dataset[key] = value;
    button.textContent = value;
    container.appendChild(button);
  }
}

function renderFilterList(container, key, values) {
  const counts = countBy(key);
  container.replaceChildren();
  for (const value of values) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset[key] = value;
    button.innerHTML = `<span>${value}</span><strong>${counts.get(value) || 0}</strong>`;
    container.appendChild(button);
  }
}

function syncSearch(value) {
  state.query = value;
  searchInput.value = value;
  navSearchInput.value = value;
  renderProducts();
}

function productMatches(product) {
  const brandMatches = state.brand === "all" || product.brand === state.brand;
  const partMatches = state.partType === "all" || product.partType === state.partType;
  const kindMatches = state.kind === "all" || product.kind === state.kind;
  const minMatches = !state.priceMin || product.priceNumber >= Number(state.priceMin);
  const maxMatches = !state.priceMax || product.priceNumber <= Number(state.priceMax);
  const queryMatches = !state.query || product.searchText.includes(state.query.toLowerCase());
  return brandMatches && partMatches && kindMatches && minMatches && maxMatches && queryMatches;
}

function sortedProducts(list) {
  return [...list].sort((a, b) => {
    if (state.sort === "title") return a.title.localeCompare(b.title);
    if (state.sort === "price-low") return a.priceNumber - b.priceNumber;
    if (state.sort === "price-high") return b.priceNumber - a.priceNumber;
    if (state.sort === "newest") return Number(b.id) - Number(a.id);
    return a.index - b.index;
  });
}

function badgeClass(kind) {
  if (kind === "Genuine") return "badge badge-green";
  if (kind === "Racing") return "badge badge-blue";
  if (kind === "Aftermarket") return "badge badge-red";
  return "badge";
}

function productCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";
  article.innerHTML = `
    <a class="product-image" href="#/product/${product.id}" aria-label="View ${product.title}">
      <img src="${product.image}" alt="${product.title}" loading="lazy" />
      <span class="${badgeClass(product.kind)}">${product.kind}</span>
    </a>
    <div class="product-body">
      <div class="brand-line">
        <span>${product.brand}</span>
        <span>${product.partType}</span>
      </div>
      <h3><a href="#/product/${product.id}">${product.title}</a></h3>
      <div class="price">${product.price || "See eBay price"}</div>
      <div class="mini-meta">
        <span><i data-lucide="shield-check"></i> eBay checkout</span>
        <span>#${product.id}</span>
      </div>
    </div>
    <div class="card-actions">
      <a class="card-button secondary" href="#/product/${product.id}" aria-label="View ${product.title}">
        <i data-lucide="eye"></i>
      </a>
      <a class="card-button primary" href="${product.ebayUrl}" target="_blank" rel="noopener">
        <i data-lucide="shopping-cart"></i>
        <span>Buy on eBay</span>
      </a>
    </div>
  `;
  return article;
}

function renderProducts() {
  const filtered = sortedProducts(products.filter(productMatches));
  totalProducts.textContent = products.length.toLocaleString();
  resultCount.textContent = `${filtered.length.toLocaleString()} products shown`;
  grid.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No matching parts found.";
    grid.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const product of filtered) fragment.appendChild(productCard(product));
  grid.appendChild(fragment);
  setIcon();
}

function openProduct(product, updateHash = true) {
  dialogContent.innerHTML = `
    <div class="dialog-layout">
      <img src="${product.image}" alt="${product.title}" />
      <div>
        <div class="dialog-badges">
          <span class="${badgeClass(product.kind)}">${product.kind}</span>
          <span class="badge">${product.brand}</span>
          <span class="badge">${product.partType}</span>
        </div>
        <h2>${product.title}</h2>
        <div class="price">${product.price || "See eBay price"}</div>
        <dl class="spec-list">
          <div><dt>Item ID</dt><dd>${product.id}</dd></div>
          <div><dt>Seller</dt><dd>HBAutoPartShop</dd></div>
          <div><dt>Checkout</dt><dd>Securely handled on eBay</dd></div>
          <div><dt>Shipping</dt><dd>Options shown on eBay listing</dd></div>
        </dl>
        <p>Fitment, condition notes, shipping cost, taxes, and buyer protection stay on the official eBay listing.</p>
        <div class="dialog-actions">
          <a class="card-button primary" href="${product.ebayUrl}" target="_blank" rel="noopener">
            <i data-lucide="external-link"></i>
            <span>Open eBay Listing</span>
          </a>
          <a class="card-button secondary" href="#catalog">
            <i data-lucide="arrow-left"></i>
            <span>Back to Catalog</span>
          </a>
        </div>
      </div>
    </div>
  `;
  dialog.showModal();
  if (updateHash) history.replaceState(null, "", `#/product/${product.id}`);
  setIcon();
}

function closeProduct() {
  dialog.close();
  if (location.hash.startsWith("#/product/")) history.replaceState(null, "", "#catalog");
}

function openRoute() {
  const id = location.hash.match(/^#\/product\/(\d+)/)?.[1];
  if (!id) return;
  const product = products.find((item) => item.id === id);
  if (product) openProduct(product, false);
}

function setActive(container, selector, active) {
  container.querySelectorAll(selector).forEach((button) => {
    const value = button.dataset.brand || button.dataset.partType || button.dataset.kind;
    button.classList.toggle("active", value === active);
  });
}

function resetFilters() {
  state.brand = "all";
  state.partType = "all";
  state.kind = "all";
  state.priceMin = "";
  state.priceMax = "";
  priceMin.value = "";
  priceMax.value = "";
  setActive(brandGroup, "button", "all");
  categoryList.querySelectorAll("button").forEach((button) => button.classList.remove("active"));
  kindList.querySelectorAll("button").forEach((button) => button.classList.remove("active"));
  renderProducts();
}

renderChips(
  brandGroup,
  "brand",
  sortedValues("brand", ["YAMAHA", "HONDA", "TOYOTA", "MITSUBISHI", "KAWASAKI", "SUZUKI", "BRT", "TDR"]),
  "All"
);
renderFilterList(categoryList, "partType", sortedValues("partType", partRules.map(([name]) => name)));
renderFilterList(kindList, "kind", sortedValues("kind", ["Genuine", "Racing", "Aftermarket", "Parts"]));

searchInput.addEventListener("input", (event) => syncSearch(event.target.value));
navSearchInput.addEventListener("input", (event) => syncSearch(event.target.value));

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderProducts();
});

brandGroup.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-brand]");
  if (!button) return;
  state.brand = button.dataset.brand;
  setActive(brandGroup, "button", state.brand);
  renderProducts();
});

categoryList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-part-type]");
  if (!button) return;
  state.partType = state.partType === button.dataset.partType ? "all" : button.dataset.partType;
  categoryList.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item.dataset.partType === state.partType));
  renderProducts();
});

kindList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-kind]");
  if (!button) return;
  state.kind = state.kind === button.dataset.kind ? "all" : button.dataset.kind;
  kindList.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item.dataset.kind === state.kind));
  renderProducts();
});

priceMin.addEventListener("input", (event) => {
  state.priceMin = event.target.value;
  renderProducts();
});

priceMax.addEventListener("input", (event) => {
  state.priceMax = event.target.value;
  renderProducts();
});

clearFilters.addEventListener("click", resetFilters);
document.querySelector(".dialog-close").addEventListener("click", closeProduct);
dialog.addEventListener("close", () => {
  if (location.hash.startsWith("#/product/")) history.replaceState(null, "", "#catalog");
});
window.addEventListener("hashchange", openRoute);

renderProducts();
openRoute();
