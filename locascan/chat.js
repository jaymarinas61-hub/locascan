const conversation = document.querySelector("#conversation");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const sendButton = document.querySelector("#send-button");
const chatStatus = document.querySelector("#chat-status");
const suggestionButtons = document.querySelectorAll(".suggestion");
const chatHistory = [];
const storeListings = [
  {
    name: "Manito Central Pharmacy",
    category: "Medicines",
    product: "Paracetamol 500mg",
    distance: 0.3,
    address: "Poblacion, Manito, Albay",
    query: "Manito Central Pharmacy, Poblacion, Manito, Albay",
    aliases: ["central pharmacy", "pharmacy", "pharmacies", "pharmacist", "drugstore", "drug store", "paracetamol", "pain relief"]
  },
  {
    name: "Albay Mart - Manito Branch",
    category: "Drinks",
    product: "Bottled Mineral Water 1L",
    distance: 0.8,
    address: "Poblacion, Manito, Albay",
    query: "Albay Mart Manito Branch, Manito, Albay",
    aliases: ["albay mart", "water", "bottled water", "mineral water", "drink", "drinks", "beverage"]
  },
  {
    name: "Aling Nena Grocery",
    category: "Foods",
    product: "Rice, canned goods, and snacks",
    distance: 1.2,
    address: "Poblacion, Manito, Albay",
    query: "Aling Nena Grocery, Manito, Albay",
    aliases: ["aling nena", "grocery", "groceries", "rice", "canned goods", "snacks"]
  },
  {
    name: "Manito Community Pharmacy",
    category: "Medicines",
    product: "First-aid and essential medicines",
    distance: 2.6,
    address: "Manito, Albay",
    query: "Pharmacy, Manito, Albay",
    aliases: ["community pharmacy", "medicine", "medicines", "medication", "first aid", "first-aid"]
  },
  {
    name: "Bicol Fresh Market",
    category: "Foods",
    product: "Fresh fruits and vegetables",
    distance: 4.4,
    address: "Manito, Albay",
    query: "Market, Manito, Albay",
    aliases: ["fresh market", "market", "fruit", "fruits", "vegetable", "vegetables", "produce"]
  },
  {
    name: "Manito Refreshment Store",
    category: "Drinks",
    product: "Juice and bottled drinks",
    distance: 7.5,
    address: "Manito, Albay",
    query: "Store, Manito, Albay",
    aliases: ["refreshment store", "juice", "bottled drinks"]
  }
];

document.body.classList.toggle("embedded-chat", new URLSearchParams(window.location.search).has("embedded"));

function addMessage(role, text, typing = false, actions = []) {
  const message = document.createElement("article");
  message.className = `message ${role === "user" ? "user-message" : "assistant-message"}`;

  if (role !== "user") {
    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "L";
    message.append(avatar);
  }

  const bubble = document.createElement("p");
  bubble.className = `message-bubble${typing ? " typing-indicator" : ""}`;
  bubble.textContent = text;
  message.append(bubble);

  if (role !== "user" && actions.length) {
    const actionList = document.createElement("div");
    actionList.className = "message-actions";
    actions.forEach((action) => {
      const link = document.createElement("a");
      link.className = "message-action";
      link.href = action.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = action.label;
      actionList.append(link);
    });
    message.append(actionList);
  }

  conversation.append(message);
  conversation.scrollTop = conversation.scrollHeight;
  return message;
}

function directionsLink(name, address) {
  const destination = encodeURIComponent(`${name}, ${address}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving&dir_action=navigate`;
}

function getLocalAnswer(question) {
  const normalized = question.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const matchedStores = storeListings.filter((store) =>
    [store.name, ...store.aliases].some((term) => normalized.includes(term.toLocaleLowerCase())) ||
    normalized.includes(store.product.toLocaleLowerCase())
  );
  const isMedicineQuestion = /\b(pharmacy|pharmacies|pharmacist|drugstore|drug store|medicine|medicines|medication|first aid)\b/.test(normalized);
  const isFoodQuestion = /\b(food|foods)\b/.test(normalized);
  const isDrinkQuestion = /\b(drink|drinks|beverage|beverages)\b/.test(normalized);
  const categoryStores = storeListings.filter((store) =>
    (isMedicineQuestion && store.category === "Medicines") ||
    (isFoodQuestion && store.category === "Foods") ||
    (isDrinkQuestion && store.category === "Drinks")
  );
  const isStoreListQuestion =
    /\b(all|list|show|which|what)\b.*\b(stores|shops|items|products|essentials)\b|\b(stores|shops|items|products|essentials)\b.*\b(all|list|show|which|what)\b/.test(normalized) ||
    /\b(what|which|list|show|tell me)\b.*\b(sell|have|available|offer|carry|buy)\b/.test(normalized) ||
    /\b(where are|where is)\b.*\b(stores|shops)\b/.test(normalized);
  const selectedStores = categoryStores.length
    ? categoryStores
    : matchedStores.length
      ? matchedStores
      : isStoreListQuestion
        ? storeListings
        : [];

  if (selectedStores.length) {
    const descriptions = selectedStores.map((store) =>
      `${store.name} is listed ${store.distance} km away in ${store.address}; its listed ${store.category.toLowerCase()} item is ${store.product}.`
    );
    const actions = selectedStores.map((store) => ({
      label: `Directions · ${store.name} (${store.distance} km)`,
      href: directionsLink(store.name, store.address)
    }));
    const answer = selectedStores.length > 1
      ? `${descriptions.join(" ")} Tap a Directions link to open a route in Google Maps. These are sample listings, so check with the store to confirm current stock or hours.`
      : `${descriptions[0]} Tap Directions to open a route in Google Maps. This is a sample listing, so check with the store to confirm current stock or hours.`;
    return { answer, actions };
  }

  if (/\b(closest|nearest)\b/.test(normalized)) {
    const nearbyStores = storeListings.filter((store) => store.distance <= 2);
    return {
      answer: `The closest listed places are ${nearbyStores.map((store) => `${store.name} (${store.distance} km)`).join(", ")}. These distances come from sample listings and may not match your exact starting location.`,
      actions: nearbyStores.map((store) => ({
        label: `Directions · ${store.name}`,
        href: directionsLink(store.name, store.address)
      }))
    };
  }

  if (/\b(distance|radius|how far|kilometer|kilometre|km)\b/.test(normalized)) {
    return {
      answer: "Choose 1, 2, 5, or 10 km in Distance Radius Tracker to set how far away stores can be. The default is 2 km; a 5 km radius will include Manito Community Pharmacy at 2.6 km."
    };
  }

  if (/\b(search|find|filter|look for|looking for)\b/.test(normalized)) {
    return {
      answer: "Type a store, category, product, or address into the search box. The results update as you type and only include stores inside your selected distance."
    };
  }

  if (/\b(map|direction|directions|navigate|location|where is)\b/.test(normalized)) {
    return {
      answer: "Choose View Map on a store card to open a route in Google Maps. Allow location access there to get directions from your current location and navigation that follows your trip."
    };
  }

  if (/\b(qr|scan)\b/.test(normalized)) {
    return {
      answer: "The QR scanner is not available in this LocaScan demo yet. You can still search for nearby stores and open their map links."
    };
  }

  if (/\b(login|log in|register|registration|account|logout|log out|sign in|password)\b/.test(normalized)) {
    return {
      answer: "Use the account page to register or log in. Your browser session keeps you signed in until you choose Log out. Account recovery is not available in this demo."
    };
  }

  if (/\b(available|availability|products|items|essentials|stock)\b/.test(normalized)) {
    return {
      answer: `LocaScan currently shows these sample items: ${storeListings.map((store) => `${store.product} at ${store.name} (${store.distance} km)`).join("; ")}. The listings do not confirm live stock or opening hours.`,
      actions: storeListings.map((store) => ({
        label: `Directions · ${store.name}`,
        href: directionsLink(store.name, store.address)
      }))
    };
  }

  if (/\b(locascan|system|app|feature|features|homepage|home page)\b/.test(normalized)) {
    return {
      answer: "LocaScan helps you search sample nearby food, drinks, and medicines in Manito. Search by store, product, category, or address; choose a 1, 2, 5, or 10 km radius; and open a store's map or directions. You can also register, log in, and log out. Store availability and hours are not live-verified."
    };
  }

  const isSystemQuestion = /\b(locascan|nearby|store|stores|shop|shops|food|drink|medicine|medicines|product|products|manito|albay|essential|essentials)\b/.test(normalized);
  if (isSystemQuestion) {
    return {
      answer: "I can help with listed stores, nearby food, drinks or medicines, search, distance, maps, and accounts. I only have the sample store information shown in LocaScan, so I can't confirm live stock or opening hours."
    };
  }

  return null;
}

function setBusy(busy) {
  sendButton.disabled = busy;
  chatInput.disabled = busy;
  suggestionButtons.forEach((button) => {
    button.disabled = busy;
  });
}

async function sendQuestion(question) {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion || sendButton.disabled) return;

  chatStatus.textContent = "";
  chatInput.value = "";
  chatInput.style.height = "";
  addMessage("user", normalizedQuestion);

  const pendingMessage = addMessage("assistant", "Thinking…", true);
  setBusy(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: normalizedQuestion,
        history: chatHistory.slice(-6)
      }),
      signal: AbortSignal.timeout(40_000)
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "The guide couldn't answer just now. Please try again.");
    }
    if (typeof result.answer !== "string" || !result.answer.trim()) {
      throw new Error("The guide returned an empty answer. Please try again.");
    }

    pendingMessage.querySelector(".message-bubble").textContent = result.answer;
    pendingMessage.querySelector(".message-bubble").classList.remove("typing-indicator");
    if (Array.isArray(result.actions)) {
      pendingMessage.remove();
      addMessage("assistant", result.answer, false, result.actions);
    }
    chatHistory.push(
      { role: "user", text: normalizedQuestion },
      { role: "assistant", text: result.answer }
    );
    if (chatHistory.length > 12) chatHistory.splice(0, chatHistory.length - 12);
  } catch (error) {
    pendingMessage.remove();
    console.error("LocaScan chat error:", error);
    const fallback = getLocalAnswer(normalizedQuestion);
    addMessage(
      "assistant",
      fallback?.answer || "I can help you search the listed shops, find products by category, change the distance filter, open store directions, or use your LocaScan account.",
      false,
      fallback?.actions || []
    );
  } finally {
    setBusy(false);
    chatInput.focus();
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendQuestion(chatInput.value);
});

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 130)}px`;
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

suggestionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    sendQuestion(button.textContent);
  });
});
