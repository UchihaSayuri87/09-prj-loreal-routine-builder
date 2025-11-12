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
    Select a category to view products
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

/* Try to load makeup products from external API.
   If it fails, return empty array so caller can fallback to local data. */
async function loadMakeupAPIProducts() {
  try {
    const url = "http://makeup-api.herokuapp.com/api/v1/products.json";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Makeup API request failed");
    const data = await res.json();
    // Map the external API shape to our simpler product shape (take first 30 items)
    return data.slice(0, 30).map((p, idx) => ({
      id: `makeup-${p.id || idx}`,
      brand: p.brand || "Unknown",
      name: p.name || p.product_type || "Makeup Product",
      category: "makeup",
      image: p.image_link || "",
      description:
        p.description || p.long_description || p.product_description || "",
    }));
  } catch (err) {
    console.error("Makeup API error:", err);
    return [];
  }
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
    .map(
      (product) => `
    <div class="product-card" data-id="${product.id}" data-brand="${
        product.brand
      }" data-name="${escapeHtml(product.name)}" data-desc="${escapeHtml(
        product.description
      )}" data-image="${product.image}">
      <img src="${product.image}" alt="${escapeHtml(product.name)}">
      <div class="product-info">
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.brand)}</p>
      </div>
    </div>
  `
    )
    .join("");
}

/* Utility: basic escaping for inserted HTML (simple for beginner-level) */
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* Toggle selection when clicking on a product card (delegation) */
productsContainer.addEventListener("click", (e) => {
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
    card.style.borderColor = "#000";
    card.style.background = "#fffbe6";
  } else {
    selectedProducts.splice(idx, 1);
    card.style.borderColor = "#ccc";
    card.style.background = "";
  }
  renderSelectedProducts();
});

/* Render the selected products list */
function renderSelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsListEl.innerHTML = `<div class="placeholder-message">No products selected</div>`;
    return;
  }
  selectedProductsListEl.innerHTML = selectedProducts
    .map(
      (p) => `
    <div class="product-card" style="flex:0 0 48%; min-height:70px; padding:8px;">
      <img src="${p.image}" alt="${escapeHtml(
        p.name
      )}" style="width:60px;height:60px;object-fit:contain;">
      <div class="product-info">
        <h3 style="font-size:14px">${escapeHtml(p.name)}</h3>
        <p style="font-size:12px">${escapeHtml(p.brand)}</p>
      </div>
    </div>
  `
    )
    .join("");
}

/* Filter and display products when category changes.
   If the category is "makeup", try the external Makeup API first. */
categoryFilter.addEventListener("change", async (e) => {
  const selectedCategory = e.target.value;

  if (selectedCategory === "makeup") {
    // try external API
    const externalProducts = await loadMakeupAPIProducts();
    if (externalProducts.length > 0) {
      displayProducts(externalProducts);
      return;
    }
    // if external failed, fall through to local data
  }

  const products = await loadProducts();

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

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

/* Generate Routine button: build a prompt summarizing selected products,
   ask the assistant to generate a simple morning/evening routine. */
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    appendChatMessage(
      "Assistant",
      "Please select at least one product to generate a routine."
    );
    return;
  }

  // Build a simple user message summarizing selected products
  const productSummaries = selectedProducts
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} (${p.brand}) - ${truncate(p.description, 140)}`
    )
    .join("\n");

  const userMessage = `I selected these products:\n${productSummaries}\n\nPlease suggest a simple, safe routine (order + when to use: AM/PM) using only these products. Keep instructions short and beginner-friendly.`;
  appendChatMessage("You", userMessage);
  chatMessages.push({ role: "user", content: userMessage });

  await callOpenAIAndDisplay();
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
  // remove any "Thinking..." placeholder
  const thinking = chatWindow.querySelector(".thinking");
  if (thinking) thinking.remove();

  const el = document.createElement("div");
  el.style.marginBottom = "12px";
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
