const catalog = window.HBAP_CATALOG || { store: {}, products: [] };
const products = catalog.products.map((product, index) => ({
  ...product,
  index,
  priceNumber: Number((product.price || "").replace(/[^\d.]/g, "")) || 0,
}));

const state = {
  query: "",
  brand: "all",
  sort: "featured",
};

const grid = document.querySelector("#productGrid");
const resultCount = document.querySelector("#resultCount");
const totalProducts = document.querySelector("#totalProducts");
const searchInput = document.querySelector("#searchInput");
const sortSelect = document.querySelector("#sortSelect");
const brandGroup = document.querySelector(".control-group");
const dialog = document.querySelector("#productDialog");
const dialogContent = document.querySelector("#dialogContent");

function uniqueBrands() {
  const preferred = ["YAMAHA", "HONDA", "TOYOTA", "MITSUBISHI", "KAWASAKI", "SUZUKI", "BRT", "TDR"];
  const present = new Set(products.map((product) => product.brand).filter(Boolean));
  return preferred.filter((brand) => present.has(brand));
}

function renderBrandFilters() {
  for (const brand of uniqueBrands()) {
    const button = document.createElement("button");
    button.className = "chip";
    button.type = "button";
    button.dataset.brand = brand;
    button.textContent = brand;
    brandGroup.appendChild(button);
  }
}

function productMatches(product) {
  const query = state.query.toLowerCase();
  const haystack = `${product.title} ${product.brand} ${product.id}`.toLowerCase();
  const brandMatches = state.brand === "all" || product.brand === state.brand;
  return brandMatches && (!query || haystack.includes(query));
}

function sortedProducts(list) {
  return [...list].sort((a, b) => {
    if (state.sort === "title") return a.title.localeCompare(b.title);
    if (state.sort === "price-low") return a.priceNumber - b.priceNumber;
    if (state.sort === "price-high") return b.priceNumber - a.priceNumber;
    return a.index - b.index;
  });
}

function productCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";
  article.innerHTML = `
    <img src="${product.image}" alt="${product.title}" loading="lazy" />
    <div class="product-body">
      <div class="brand-line">
        <span>${product.brand}</span>
        <span>#${product.id}</span>
      </div>
      <h3>${product.title}</h3>
      <div class="price">${product.price || "See eBay price"}</div>
    </div>
    <div class="card-actions">
      <button class="card-button secondary" type="button" aria-label="View ${product.title}">
        <i data-lucide="eye"></i>
      </button>
      <a class="card-button primary" href="${product.ebayUrl}" target="_blank" rel="noopener">
        <i data-lucide="shopping-cart"></i>
        <span>Buy on eBay</span>
      </a>
    </div>
  `;
  article.querySelector("button").addEventListener("click", () => openProduct(product));
  return article;
}

function renderProducts() {
  const filtered = sortedProducts(products.filter(productMatches));
  totalProducts.textContent = products.length.toLocaleString();
  resultCount.textContent = `${filtered.length.toLocaleString()} product${filtered.length === 1 ? "" : "s"} shown`;
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
  if (window.lucide) window.lucide.createIcons();
}

function openProduct(product) {
  dialogContent.innerHTML = `
    <div class="dialog-layout">
      <img src="${product.image}" alt="${product.title}" />
      <div>
        <p class="eyebrow">${product.brand} · Item #${product.id}</p>
        <h2>${product.title}</h2>
        <div class="price">${product.price || "See eBay price"}</div>
        <p>Checkout, shipping options, fitment notes, and buyer protection are handled through the official HBAutoPartShop eBay listing.</p>
        <div class="dialog-actions">
          <a class="card-button primary" href="${product.ebayUrl}" target="_blank" rel="noopener">
            <i data-lucide="external-link"></i>
            <span>Open eBay Listing</span>
          </a>
        </div>
      </div>
    </div>
  `;
  dialog.showModal();
  if (window.lucide) window.lucide.createIcons();
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderProducts();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderProducts();
});

brandGroup.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-brand]");
  if (!button) return;
  state.brand = button.dataset.brand;
  brandGroup.querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("active", chip === button));
  renderProducts();
});

document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());

renderBrandFilters();
renderProducts();
