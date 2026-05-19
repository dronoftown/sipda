const SIPDA_AUTH = {
  user: "Chavero",
  passwordHash: "2be9dd838eb3de8d0cca2a3c5abdeda38efc8a46ca59583a6c4718c57e996056",
  sessionKey: "sipda-authenticated"
};

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function setAuthState(isAuthenticated) {
  document.body.classList.toggle("is-authenticated", isAuthenticated);
  document.body.classList.toggle("is-locked", !isAuthenticated);
}

function startSession() {
  sessionStorage.setItem(SIPDA_AUTH.sessionKey, "true");
  setAuthState(true);
}

function endSession() {
  sessionStorage.removeItem(SIPDA_AUTH.sessionKey);
  setAuthState(false);
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const username = form.querySelector("#loginUser")?.value.trim() || "";
  const password = form.querySelector("#loginPassword")?.value || "";
  const message = document.getElementById("loginMessage");
  const passwordHash = await sha256(password);

  if (username === SIPDA_AUTH.user && passwordHash === SIPDA_AUTH.passwordHash) {
    if (message) message.textContent = "";
    startSession();
    return;
  }

  if (message) message.textContent = "Usuari o contrasenya incorrectes.";
}

function initAuth() {
  const isAuthenticated = sessionStorage.getItem(SIPDA_AUTH.sessionKey) === "true";
  setAuthState(isAuthenticated);

  const form = document.getElementById("loginForm");
  const logoutButton = document.getElementById("logoutButton");

  if (form) form.addEventListener("submit", handleLogin);
  if (logoutButton) logoutButton.addEventListener("click", endSession);
}

document.addEventListener("DOMContentLoaded", initAuth);
