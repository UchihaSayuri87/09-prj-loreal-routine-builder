/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsListEl = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view L'Oréal products
  </div>
`;

/* Keep track of selected products and chat messages for context */
let selectedProducts = [];
let chatMessages = [
  // A simple system message to instruct the assistant
  {
    role: "system",
    content: "You are a helpful skincare and product routine assistant.",
  },
];

/* Load product data from local JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards and attach click handler via event delegation */
function displayProducts(products) {
  if (!products || products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found for this category.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some(
        (p) => String(p.id) === String(product.id)
      );
      return `
    <div class="product-card ${isSelected ? "selected" : ""}" data-id="${
        product.id
      }" data-brand="${product.brand}" data-name="${escapeHtml(
        product.name
      )}" data-desc="${escapeHtml(product.description)}" data-image="${
        product.image
      }">
      <div style="display:flex; gap:12px; align-items:flex-start; width:100%;">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" />
        <div class="product-info" style="position:relative; flex:1;">
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.brand)}</p>
          <button class="info-btn" aria-expanded="false" style="margin-top:8px; font-size:13px; padding:6px 8px; cursor:pointer;">Details</button>
          <div class="desc" style="display:none; margin-top:8px; font-size:13px; color:#444;">${escapeHtml(
            product.description
          )}</div>
        </div>
      </div>
    </div>
  `;
    })
    .join("");

  // attach error handlers so broken images show a friendly inline fallback
  attachImageErrorHandlers(productsContainer);
}

/* Utility: basic escaping for inserted HTML (simple for beginner-level) */
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* Toggle selection when clicking on a product card (delegation)
   Also handle info button clicks to reveal descriptions without toggling selection */
productsContainer.addEventListener("click", (e) => {
  // Info button toggles description only
  const infoBtn = e.target.closest(".info-btn");
  if (infoBtn) {
    const infoWrapper = infoBtn.closest(".product-info");
    const desc = infoWrapper.querySelector(".desc");
    const expanded = infoBtn.getAttribute("aria-expanded") === "true";
    infoBtn.setAttribute("aria-expanded", String(!expanded));
    desc.style.display = expanded ? "none" : "block";
    e.stopPropagation();
    return;
  }

  // Otherwise toggle selection by card
  const card = e.target.closest(".product-card");
  if (!card) return;
  const id = card.dataset.id;
  const product = {
    id,
    brand: card.dataset.brand,
    name: card.dataset.name,
    description: card.dataset.desc,
    image: card.dataset.image,
  };

  const idx = selectedProducts.findIndex((p) => p.id === id);
  if (idx === -1) {
    selectedProducts.push(product);
    card.classList.add("selected");
  } else {
    selectedProducts.splice(idx, 1);
    card.classList.remove("selected");
  }
  renderSelectedProducts();
});

/* Render the selected products list (add remove button) */
function renderSelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsListEl.innerHTML = `<div class="placeholder-message">No products selected</div>`;
    return;
  }
  selectedProductsListEl.innerHTML = selectedProducts
    .map(
      (p) => `
    <div class="product-card selected-item" data-id="${
      p.id
    }" style="flex:0 0 48%; min-height:70px; padding:8px; align-items:center; position:relative;">
      <img src="${p.image}" alt="${escapeHtml(
        p.name
      )}" style="width:60px;height:60px;object-fit:contain;">
      <div class="product-info" style="margin-left:10px;">
        <h3 style="font-size:14px">${escapeHtml(p.name)}</h3>
        <p style="font-size:12px">${escapeHtml(p.brand)}</p>
      </div>
      <button class="remove-btn" aria-label="Remove ${escapeHtml(
        p.name
      )}" style="position:absolute; right:8px; top:8px; background:#fff; border:1px solid #ccc; padding:4px 6px; cursor:pointer;">✕</button>
    </div>
  `
    )
    .join("");

  // attach error handlers for selected-product thumbnails
  attachImageErrorHandlers(selectedProductsListEl);
}

/* Allow removal of items directly from the Selected Products list */
selectedProductsListEl.addEventListener("click", (e) => {
  const rem = e.target.closest(".remove-btn");
  if (!rem) return;
  const card = rem.closest("[data-id]");
  if (!card) return;
  const id = card.dataset.id;

  // remove from selectedProducts
  const idx = selectedProducts.findIndex((p) => p.id === id);
  if (idx !== -1) selectedProducts.splice(idx, 1);

  // un-highlight the corresponding product card in the grid if visible
  const gridCard = productsContainer.querySelector(
    `.product-card[data-id="${CSS.escape(id)}"]`
  );
  if (gridCard) gridCard.classList.remove("selected");

  renderSelectedProducts();
});

/* Filter and display products when category changes.
   Always use local products.json and only show products whose brand
   contains "L'Oréal" (case-insensitive). */
categoryFilter.addEventListener("change", async (e) => {
  const selectedCategory = e.target.value;

  // Load local data only
  const products = await loadProducts();

  // Keep only L'Oréal brand products (match "L'Oréal" or "L'Oréal Paris" etc.)
  const lorealProducts = products.filter(
    (p) =>
      String(p.brand || "")
        .toLowerCase()
        .includes("l'oréal".toLowerCase()) ||
      String(p.brand || "")
        .toLowerCase()
        .includes("loreal")
  );

  // If the filter is empty or not provided, show all L'Oréal products
  const filteredProducts = selectedCategory
    ? lorealProducts.filter((product) => product.category === selectedCategory)
    : lorealProducts;

  displayProducts(filteredProducts);
});

/* Chat form submission handler - send user message to OpenAI as follow-up */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("userInput");
  const text = input.value.trim();
  if (!text) return;

  // Show user's message in chat window
  appendChatMessage("You", text);
  input.value = "";

  // Add to messages history for context
  chatMessages.push({ role: "user", content: text });

  // Call OpenAI and display response
  await callOpenAIAndDisplay();
});

/* Generate Routine button: build JSON payload from selected products and send to OpenAI */
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    appendChatMessage(
      "Assistant",
      "Please select at least one product to generate a routine."
    );
    return;
  }

  // Build JSON of selected products (only required fields)
  const payload = selectedProducts.map((p) => ({
    name: p.name,
    brand: p.brand,
    category: p.category || "unknown",
    description: p.description || "",
  }));

  // Create a user message that includes the JSON payload; assistant should use only these items
  const userMessage = `Here are the selected products (JSON). Use ONLY these products to suggest a simple, safe routine (order + when to use: AM/PM). Return a short step-by-step routine and any brief notes:\n\n${JSON.stringify(
    { selected_products: payload },
    null,
    2
  )}`;

  appendChatMessage("You", "Requesting routine for selected products...");
  chatMessages.push({ role: "user", content: userMessage });

  await callOpenAIAndDisplay();
});

/* New: on page load show all L'Oréal products and render empty selected list */
window.addEventListener("DOMContentLoaded", async () => {
  renderSelectedProducts(); // show "No products selected" placeholder
  try {
    const products = await loadProducts();
    // show L'Oréal products by default
    const lorealProducts = products.filter(
      (p) =>
        String(p.brand || "")
          .toLowerCase()
          .includes("l'oréal".toLowerCase()) ||
        String(p.brand || "")
          .toLowerCase()
          .includes("loreal")
    );
    displayProducts(lorealProducts);
  } catch (err) {
    console.error("Failed to load products on start:", err);
    productsContainer.innerHTML = `<div class="placeholder-message">Unable to load products.</div>`;
  }

  // optional friendly assistant greeting
  appendChatMessage(
    "Assistant",
    "Hi — select products and click Generate Routine, or ask me a question."
  );
});

/* Call OpenAI Chat Completions endpoint using model "gpt-4o" and the messages array.
   The student should create a secrets.js file that sets window.OPENAI_API_KEY = "sk-..."; */
async function callOpenAIAndDisplay() {
  // Basic check for API key
  const key = window.OPENAI_API_KEY;
  if (!key) {
    appendChatMessage(
      "Assistant",
      "API key not found. Add a secrets.js that sets window.OPENAI_API_KEY."
    );
    return;
  }

  // Show a removable "Thinking..." message
  appendChatMessage("Assistant", "Thinking...");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatMessages,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${errText}`);
    }

    const data = await res.json();

    // We expect data.choices[0].message.content per your instructions
    const assistantMessage = data?.choices?.[0]?.message?.content;
    if (assistantMessage) {
      // Remove the "Thinking..." placeholder (appendChatMessage handles removal too)
      // Add assistant reply to messages history
      chatMessages.push({ role: "assistant", content: assistantMessage });
      appendChatMessage("Assistant", assistantMessage);
    } else {
      appendChatMessage(
        "Assistant",
        "No response from the AI. Check the API reply format."
      );
      console.log("OpenAI response:", data);
    }
  } catch (err) {
    console.error(err);
    appendChatMessage("Assistant", `Error: ${err.message}`);
  }
}

/* Helper to append messages to the chat window (simple rendering) */
function appendChatMessage(who, text) {
  // remove any existing "Thinking..." placeholder
  const thinking = chatWindow.querySelector(".thinking");
  if (thinking) thinking.remove();

  const el = document.createElement("div");
  el.style.marginBottom = "12px";

  // mark the 'Thinking...' assistant message so it can be removed before the real reply
  if (who === "Assistant" && text === "Thinking...") {
    el.classList.add("thinking");
    el.style.opacity = "0.8";
    el.innerHTML = `<strong>${escapeHtml(
      who
    )}:</strong> <div style="margin-top:6px; font-style:italic; color:#666;">${escapeHtml(
      text
    )}</div>`;
    chatWindow.appendChild(el);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return;
  }

  el.innerHTML = `<strong>${escapeHtml(
    who
  )}:</strong> <div style="margin-top:6px; white-space:pre-wrap;">${escapeHtml(
    text
  )}</div>`;
  chatWindow.appendChild(el);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Utility: short truncation */
function truncate(str = "", n = 100) {
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

/* New helper: attachImageErrorHandlers(rootEl)
   - rootEl: element containing <img> elements (e.g., productsContainer or selectedProductsListEl)
   - replaces broken images with an inline SVG data URL placeholder */
function attachImageErrorHandlers(rootEl) {
  const FALLBACK_SVG =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
         <rect width="100%" height="100%" fill="#fafafa"/>
         <g fill="#666" font-family="Arial, Helvetica, sans-serif" font-size="16">
           <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle">Image unavailable</text>
           <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-size="12">Please try reloading or check the file</text>
         </g>
       </svg>`
    );

  const imgs = (rootEl || document).querySelectorAll("img");
  imgs.forEach((img) => {
    // avoid re-wrapping the same handler
    if (img.dataset.errorHandlerAttached) return;
    img.dataset.errorHandlerAttached = "1";

    img.addEventListener("error", function () {
      // set fallback and ensure it fits the layout
      this.removeAttribute("src"); // avoid repeated error cycles
      this.src = FALLBACK_SVG;
      this.style.objectFit = "contain";
    });

    // if src is empty or the image failed to load earlier, proactively set fallback
    if (!img.src || (img.complete && img.naturalWidth === 0)) {
      img.src = FALLBACK_SVG;
    }
  });
}
