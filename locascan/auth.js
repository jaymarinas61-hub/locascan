const ACCOUNTS_KEY = "locascan.accounts";
const SESSION_KEY = "locascan.session";
const PASSWORD_ITERATIONS = 210000;

function readAccounts() {
  const savedAccounts = localStorage.getItem(ACCOUNTS_KEY);
  if (savedAccounts === null) return [];

  const accounts = JSON.parse(savedAccounts);
  if (!Array.isArray(accounts)) {
    throw new Error("Saved account data is invalid. Clear this site's browser data and try again.");
  }
  return accounts;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) {
    throw new Error("Saved account data is invalid. Clear this site's browser data and try again.");
  }
  return new Uint8Array(hex.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)));
}

async function hashPassword(password, salt, iterations) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("Secure password hashing is unavailable. Open this page using localhost or a secure web server.");
  }

  const key = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const result = await window.crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return bytesToHex(new Uint8Array(result));
}

function showPanel(panelName) {
  document.querySelectorAll(".auth-panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === panelName);
  });
  document.querySelector(".auth-page").classList.toggle("register-mode", panelName === "register");
}

function setFormMessage(form, message) {
  const messageId = form.id === "login-form" ? "#login-message" : "#register-message";
  form.querySelector(messageId).textContent = message;
}

function setFormBusy(form, busy) {
  form.querySelector('button[type="submit"]').disabled = busy;
}

function startSession(account) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    username: account.username,
    name: [account.firstName, account.middleName, account.lastName].filter(Boolean).join(" ")
  }));
  window.location.assign("index.html");
}

async function register(form) {
  const firstName = form.elements.firstName.value.trim();
  const middleName = form.elements.middleName.value.trim();
  const lastName = form.elements.lastName.value.trim();
  const username = form.elements.username.value.trim();
  const normalizedUsername = username.toLocaleLowerCase();
  const password = form.elements.password.value;

  if (!/^[A-Za-z0-9._-]{3,24}$/.test(username)) {
    setFormMessage(form, "Username must be 3-24 characters using letters, numbers, periods, underscores, or hyphens.");
    return;
  }

  const accounts = readAccounts();
  if (accounts.some((account) => account.username?.toLocaleLowerCase() === normalizedUsername)) {
    setFormMessage(form, "That username is already registered. Please choose another.");
    return;
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const account = {
    firstName,
    middleName,
    lastName,
    username,
    salt: bytesToHex(salt),
    passwordHash: await hashPassword(password, salt, PASSWORD_ITERATIONS),
    iterations: PASSWORD_ITERATIONS
  };

  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
  form.reset();
  document.querySelector("#login-username").value = username;
  document.querySelector("#login-password").value = "";
  document.querySelector("#login-success").textContent = "Registration done! You may now log in.";
  document.querySelector("#login-message").textContent = "";
  showPanel("login");
  window.location.hash = "login";
  document.querySelector("#login-password").focus();
}

async function login(form) {
  const username = form.elements.username.value.trim().toLocaleLowerCase();
  const password = form.elements.password.value;
  const account = readAccounts().find(
    (savedAccount) => savedAccount.username?.toLocaleLowerCase() === username
  );

  if (!account) {
    setFormMessage(form, "Username or password is incorrect.");
    return;
  }

  const salt = hexToBytes(account.salt);
  const hash = await hashPassword(password, salt, account.iterations);
  if (hash !== account.passwordHash) {
    setFormMessage(form, "Username or password is incorrect.");
    return;
  }

  startSession(account);
}

function connectForm(form, handler) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFormMessage(form, "");
    setFormBusy(form, true);

    try {
      await handler(form);
    } catch (error) {
      console.error("LocaScan authentication error:", error);
      setFormMessage(
        form,
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setFormBusy(form, false);
    }
  });
}

const registerForm = document.querySelector("#register-form");
const loginForm = document.querySelector("#login-form");
const logoutButton = document.querySelector("#logout-button");

if (registerForm && loginForm) {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) {
      window.location.replace("index.html");
    }
  } catch (error) {
    console.error("Unable to read LocaScan session:", error);
  }

  showPanel(window.location.hash === "#register" ? "register" : "login");
  window.addEventListener("hashchange", () => {
    showPanel(window.location.hash === "#register" ? "register" : "login");
  });

  connectForm(registerForm, register);
  connectForm(loginForm, login);
}

if (logoutButton) {
  try {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      window.location.replace("auth.html#login");
    }
  } catch (error) {
    console.error("Unable to read LocaScan session:", error);
    window.location.replace("auth.html#login");
  }

  logoutButton.addEventListener("click", () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.replace("auth.html#login");
    } catch (error) {
      console.error("Unable to end LocaScan session:", error);
      window.alert("Could not log out. Please check your browser storage settings and try again.");
    }
  });
}
