// MoneyTrack: autenticação demonstrativa local.
// Importante: armazenamento no navegador não substitui autenticação segura de produção.
const $ = (id) => document.getElementById(id);
const USERS_KEY = "moneytrack_demo_users_v1";
const SESSION_KEY = "moneytrack_demo_session_v1";

const loginView = $("login-view");
const signupView = $("signup-view");
const signedInView = $("signed-in-view");
const loginForm = $("login-form");
const signupForm = $("signup-form");

function getUsers() {
  try {
    const data = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(data) ? data : [];
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
function showView(view) {
  loginView.hidden = view !== "login";
  signupView.hidden = view !== "signup";
  signedInView.hidden = view !== "signed-in";
  clearMessages();
  const heading = view === "login" ? $("email") : view === "signup" ? $("signup-name") : $("logout-button");
  if (heading) heading.focus();
}
function clearMessages() {
  document.querySelectorAll(".field-error").forEach(el => el.textContent = "");
  document.querySelectorAll("input").forEach(el => el.classList.remove("invalid"));
  document.querySelectorAll(".status-message").forEach(el => { el.textContent = ""; el.classList.remove("success"); });
}
function setFieldError(inputId, errorId, message) {
  const input = $(inputId), error = $(errorId);
  if (error) error.textContent = message;
  if (input) {
    input.classList.toggle("invalid", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }
}
function showStatus(id, message, success = false) {
  const element = $(id);
  element.textContent = message;
  element.classList.toggle("success", success);
}

// Hash de senha com PBKDF2. Se o navegador não disponibilizar Web Crypto,
// o cadastro/login informa a limitação em vez de salvar a senha em texto puro.
function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}
function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
function randomSalt() {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return salt;
}
async function hashPassword(password, saltBytes) {
  if (!window.crypto || !crypto.subtle) {
    throw new Error("Este navegador não disponibiliza a função de proteção de senha necessária. Abra o projeto em um navegador atualizado ou execute-o por um servidor local.");
  }
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations: 120000, hash: "SHA-256" }, keyMaterial, 256);
  return new Uint8Array(bits);
}
function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

$("brand-link").addEventListener("click", event => {
  event.preventDefault();
  showView("login");
});
$("show-login").addEventListener("click", event => { event.preventDefault(); showView("login"); });

document.querySelectorAll("[data-toggle]").forEach(button => {
  button.addEventListener("click", () => {
    const input = $(button.dataset.toggle);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
    button.setAttribute("aria-pressed", String(show));
  });
});
$("toggle-password").addEventListener("click", () => {
  const input = $("password");
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  $("toggle-password").setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha");
  $("toggle-password").setAttribute("aria-pressed", String(show));
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  clearMessages();
  const email = normalizeEmail($("email").value);
  const password = $("password").value;
  let valid = true;
  if (!email) { setFieldError("email", "email-error", "Informe seu e-mail."); valid = false; }
  else if (!validEmail(email)) { setFieldError("email", "email-error", "Digite um e-mail válido."); valid = false; }
  if (!password) { setFieldError("password", "password-error", "Informe sua senha."); valid = false; }
  if (!valid) return;

  const button = $("submit-button");
  button.disabled = true;
  button.querySelector("span").textContent = "Verificando...";
  try {
    const user = getUsers().find(item => item.email === email);
    if (!user) {
      showStatus("login-status", "Conta não encontrada. Confira o e-mail ou crie uma conta.");
      return;
    }
    const salt = base64ToBytes(user.salt);
    const calculated = await hashPassword(password, salt);
    const stored = base64ToBytes(user.passwordHash);
    if (!bytesEqual(calculated, stored)) {
      showStatus("login-status", "E-mail ou senha incorretos. Tente novamente.");
      return;
    }
    const session = { userId: user.id, name: user.name, email: user.email, signedInAt: Date.now() };
    const remember = $("remember").checked;
    if (remember) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    // Após autenticar, encaminha o usuário para a página inicial do sistema.
    window.location.href = "dashboard.html";
  } catch (error) {
    showStatus("login-status", error.message || "Não foi possível realizar o login.");
  } finally {
    button.disabled = false;
    button.querySelector("span").textContent = "Entrar";
  }
});

signupForm.addEventListener("submit", async event => {
  event.preventDefault();
  clearMessages();
  const name = $("signup-name").value.trim();
  const email = normalizeEmail($("signup-email").value);
  const password = $("signup-password").value;
  const confirm = $("signup-confirm").value;
  let valid = true;
  if (name.length < 2) { setFieldError("signup-name", "name-error", "Informe seu nome completo."); valid = false; }
  if (!email) { setFieldError("signup-email", "signup-email-error", "Informe seu e-mail."); valid = false; }
  else if (!validEmail(email)) { setFieldError("signup-email", "signup-email-error", "Digite um e-mail válido."); valid = false; }
  if (password.length < 8) { setFieldError("signup-password", "signup-password-error", "A senha precisa ter pelo menos 8 caracteres."); valid = false; }
  if (confirm !== password || !confirm) { setFieldError("signup-confirm", "confirm-error", "As senhas não coincidem."); valid = false; }
  if (!$("accept-terms").checked) { $("terms-error").textContent = "Confirme que entende que esta é uma demonstração local."; valid = false; }
  if (!valid) return;

  const users = getUsers();
  if (users.some(user => user.email === email)) {
    setFieldError("signup-email", "signup-email-error", "Já existe uma conta com este e-mail. Entre ou use outro endereço.");
    return;
  }
  const button = signupForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const salt = randomSalt();
    const passwordHash = await hashPassword(password, salt);
    const user = {
      id: (window.crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      name,
      email,
      salt: bytesToBase64(salt),
      passwordHash: bytesToBase64(passwordHash),
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    loginForm.reset();
    $("email").value = email;
    showView("login");
    showStatus("login-status", "Conta criada com sucesso! Agora entre com seu e-mail e senha.", true);
  } catch (error) {
    showStatus("signup-status", error.message || "Não foi possível criar a conta.");
  } finally {
    button.disabled = false;
  }
});

$("forgot-link").addEventListener("click", event => {
  event.preventDefault();
  showStatus("login-status", "A recuperação automática por e-mail não está disponível nesta versão offline. Se esquecer a senha, será necessário remover a conta demonstrativa e criar outra.");
});
$("logout-button").addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  loginForm.reset();
  showView("login");
});

// Restaura apenas a sessão local demonstrativa, se houver.
function restoreSession() {
  let session = null;
  try {
    session = JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || "null");
  } catch { session = null; }
  if (!session) return;
  const user = getUsers().find(item => item.id === session.userId);
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  $("signed-in-title").textContent = `Olá, ${user.name.split(/\s+/)[0]}!`;
  $("signed-in-description").textContent = "Você continua conectado nesta demonstração local.";
  showView("signed-in");
}
restoreSession();
if (new URLSearchParams(window.location.search).get("cadastro") === "sucesso") {
  showStatus("login-status", "Conta criada com sucesso! Entre com seu e-mail e senha.", true);
}
