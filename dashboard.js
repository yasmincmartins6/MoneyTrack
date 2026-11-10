const USERS_KEY = "moneytrack_demo_users_v1";
const SESSION_KEY = "moneytrack_demo_session_v1";
const TRANSACTIONS_PREFIX = "moneytrack_demo_transactions_v1_";
const $ = id => document.getElementById(id);

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || "null");
  } catch { return null; }
}
function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
  catch { return []; }
}
const session = getSession();
if (!session || !getUsers().some(user => user.id === session.userId)) {
  window.location.replace("index.html");
} else {
  startDashboard();
}

function startDashboard() {
  const users = getUsers();
  const user = users.find(item => item.id === session.userId);
  $("user-name").textContent = user.name;
  $("user-avatar").textContent = user.name.trim().charAt(0).toUpperCase();
  $("greeting").textContent = `Olá, ${user.name.trim().split(/\s+/)[0]}!`;
  $("transaction-date").value = new Date().toISOString().slice(0, 10);
  const storageKey = TRANSACTIONS_PREFIX + user.id;

  function getTransactions() {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }
  function saveTransactions(transactions) {
    localStorage.setItem(storageKey, JSON.stringify(transactions));
  }
  function money(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }
  function dateLabel(date) {
    if (!date) return "—";
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }
  function render() {
    const transactions = getTransactions().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    $("balance-value").textContent = money(income - expense);
    $("income-value").textContent = money(income);
    $("expense-value").textContent = money(expense);
    $("transactions-body").replaceChildren();
    $("empty-state").hidden = transactions.length > 0;

    transactions.forEach(transaction => {
      const tr = document.createElement("tr");
      const description = document.createElement("td");
      description.textContent = transaction.description;
      const date = document.createElement("td");
      date.textContent = dateLabel(transaction.date);
      const type = document.createElement("td");
      const pill = document.createElement("span");
      pill.className = `type-pill ${transaction.type}`;
      pill.textContent = transaction.type === "income" ? "Receita" : "Despesa";
      type.appendChild(pill);
      const amount = document.createElement("td");
      amount.className = `amount-cell ${transaction.type === "income" ? "income-text" : "expense-text"}`;
      amount.textContent = `${transaction.type === "income" ? "+" : "−"} ${money(transaction.amount)}`;
      const action = document.createElement("td");
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-transaction";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Excluir ${transaction.description}`);
      remove.title = "Excluir movimentação";
      remove.addEventListener("click", () => {
        const updated = getTransactions().filter(item => item.id !== transaction.id);
        saveTransactions(updated);
        render();
      });
      action.appendChild(remove);
      tr.append(description, date, type, amount, action);
      $("transactions-body").appendChild(tr);
    });
  }

  $("transaction-form").addEventListener("submit", event => {
    event.preventDefault();
    $("description-error").textContent = "";
    $("amount-error").textContent = "";
    $("transaction-status").textContent = "";
    const description = $("transaction-description").value.trim();
    const amount = Number($("transaction-amount").value);
    const type = $("transaction-type").value;
    const date = $("transaction-date").value;
    let valid = true;
    if (!description) { $("description-error").textContent = "Informe uma descrição."; valid = false; }
    if (!Number.isFinite(amount) || amount <= 0) { $("amount-error").textContent = "Informe um valor maior que zero."; valid = false; }
    if (!date) { $("transaction-status").textContent = "Informe a data da movimentação."; valid = false; }
    if (!valid) return;
    const transactions = getTransactions();
    transactions.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `transaction-${Date.now()}`,
      description, amount: Math.round(amount * 100) / 100, type, date, createdAt: Date.now()
    });
    saveTransactions(transactions);
    $("transaction-form").reset();
    $("transaction-date").value = new Date().toISOString().slice(0, 10);
    $("transaction-status").textContent = "Movimentação adicionada.";
    $("transaction-status").classList.add("success");
    render();
  });

  $("clear-transactions").addEventListener("click", () => {
    const transactions = getTransactions();
    if (!transactions.length) {
      $("transaction-status").textContent = "Não há movimentações para limpar.";
      return;
    }
    if (window.confirm("Tem certeza de que deseja apagar todas as movimentações desta conta?")) {
      saveTransactions([]);
      render();
      $("transaction-status").textContent = "Movimentações removidas.";
      $("transaction-status").classList.add("success");
    }
  });

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  }
  $("logout-button").addEventListener("click", logout);
  $("add-transaction-top").addEventListener("click", () => {
    $("transaction-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    $("transaction-description").focus({ preventScroll: true });
  });
  render();
}
