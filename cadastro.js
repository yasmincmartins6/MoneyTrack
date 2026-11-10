// Cadastro local demonstrativo compatível com o login do index.html.
const $ = id => document.getElementById(id);
const USERS_KEY = "moneytrack_demo_users_v1";

function getUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(users) ? users : [];
  } catch {
    return [];
  }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function setError(inputId, errorId, message) {
  const input = $(inputId);
  $(errorId).textContent = message;
  input.classList.toggle("invalid", Boolean(message));
  input.setAttribute("aria-invalid", message ? "true" : "false");
}
function clearErrors() {
  document.querySelectorAll(".field-error").forEach(item => item.textContent = "");
  document.querySelectorAll("input").forEach(item => {
    item.classList.remove("invalid");
    item.removeAttribute("aria-invalid");
  });
  $("signup-status").textContent = "";
  $("signup-status").classList.remove("success");
}
function showStatus(message, success = false) {
  $("signup-status").textContent = message;
  $("signup-status").classList.toggle("success", success);
}
function toBase64(bytes) {
  let binary = "";
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}
async function hashPassword(password, salt) {
  if (!window.crypto?.subtle) {
    throw new Error("O navegador não disponibiliza a proteção de senha necessária. Use um navegador atualizado e abra o projeto por um servidor local, como o Live Server do VS Code.");
  }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256
  );
  return new Uint8Array(bits);
}

document.querySelectorAll("[data-toggle]").forEach(button => {
  button.addEventListener("click", () => {
    const input = $(button.dataset.toggle);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
    button.setAttribute("aria-pressed", String(show));
  });
});

$("signup-form").addEventListener("submit", async event => {
  event.preventDefault();
  clearErrors();
  const name = $("name").value.trim();
  const email = normalizeEmail($("email").value);
  const password = $("password").value;
  const confirm = $("confirm").value;
  let valid = true;

  if (name.length < 2) { setError("name", "name-error", "Informe seu nome completo."); valid = false; }
  if (!email) { setError("email", "email-error", "Informe seu e-mail."); valid = false; }
  else if (!validEmail(email)) { setError("email", "email-error", "Digite um e-mail válido."); valid = false; }
  if (password.length < 8) { setError("password", "password-error", "A senha precisa ter pelo menos 8 caracteres."); valid = false; }
  if (!confirm || confirm !== password) { setError("confirm", "confirm-error", "As senhas não coincidem."); valid = false; }
  if (!$("accept-terms").checked) { $("terms-error").textContent = "Marque a opção para continuar."; valid = false; }
  if (!valid) return;

  const users = getUsers();
  if (users.some(user => user.email === email)) {
    setError("email", "email-error", "Já existe uma conta com esse e-mail. Entre ou use outro endereço.");
    return;
  }

  const button = $("submit-button");
  button.disabled = true;
  button.querySelector("span").textContent = "Criando conta...";
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const passwordHash = await hashPassword(password, salt);
    const user = {
      id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`,
      name,
      email,
      salt: toBase64(salt),
      passwordHash: toBase64(passwordHash),
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    $("signup-form").reset();
    showStatus("Conta criada com sucesso! Você será direcionado para a tela de login.", true);
    window.setTimeout(() => {
      window.location.href = "index.html?cadastro=sucesso";
    }, 900);
  } catch (error) {
    showStatus(error.message || "Não foi possível criar a conta. Tente novamente.");
  } finally {
    button.disabled = false;
    button.querySelector("span").textContent = "Criar conta";
  }
});
