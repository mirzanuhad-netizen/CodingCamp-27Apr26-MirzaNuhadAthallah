/* =============================================
   Expense & Budget Visualizer
   Vanilla JS — No frameworks
   Data stored in localStorage
   ============================================= */

'use strict';

// ── Constants ────────────────────────────────
const STORAGE_KEY   = 'budget_transactions';
const LIMIT_KEY     = 'budget_spending_limit';
const THEME_KEY     = 'budget_theme';

const CATEGORY_COLORS = {
  Food:         '#10b981',
  Fun:          '#f59e0b',
  Gadget:       '#8b5cf6',
  Medicine:     '#ef4444',
  Outfit:       '#ec4899',
  Skincare:     '#f472b6',
  Subscription: '#6366f1',
  Supplies:     '#84cc16',
  Tools:        '#0ea5e9',
  Transport:    '#3b82f6',
  Other:        '#94a3b8',
};

const CATEGORY_ICONS = {
  Food:         'Food',
  Fun:          'Fun',
  Gadget:       'Gadget',
  Medicine:     'Medicine',
  Outfit:       'Outfit',
  Skincare:     'Skincare',
  Subscription: 'Subscription',
  Supplies:     'Supplies',
  Tools:        'Tools',
  Transport:    'Transport',
  Other:        'Other',
};

// ── State ─────────────────────────────────────
let transactions  = [];
let spendingLimit = 0;
let chartInstance = null;

// ── DOM References ────────────────────────────
const totalBalanceEl    = document.getElementById('totalBalance');
const spendingWarningEl = document.getElementById('spendingWarning');
const transactionForm   = document.getElementById('transactionForm');
const itemNameInput     = document.getElementById('itemName');
const amountInput       = document.getElementById('amount');
const categorySelect    = document.getElementById('category');
const otherGroup        = document.getElementById('otherGroup');
const otherDescInput    = document.getElementById('otherDesc');
const otherError        = document.getElementById('otherError');
const transactionList   = document.getElementById('transactionList');
const emptyStateEl      = document.getElementById('emptyState');
const sortBySelect      = document.getElementById('sortBy');
const chartCanvas       = document.getElementById('spendingChart');
const chartEmptyEl      = document.getElementById('chartEmpty');
const themeToggleBtn    = document.getElementById('themeToggle');
const spendingLimitInput = document.getElementById('spendingLimit');
const setLimitBtn       = document.getElementById('setLimitBtn');
const limitDisplayEl    = document.getElementById('limitDisplay');
const limitModal        = document.getElementById('limitModal');
const modalDismiss      = document.getElementById('modalDismiss');

// Error elements
const nameError     = document.getElementById('nameError');
const amountError   = document.getElementById('amountError');
const categoryError = document.getElementById('categoryError');

// ── Initialise ────────────────────────────────
function init() {
  loadFromStorage();
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  renderAll();
  bindEvents();
}

// ── Storage ───────────────────────────────────
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    transactions = raw ? JSON.parse(raw) : [];
  } catch {
    transactions = [];
  }
  spendingLimit = parseFloat(localStorage.getItem(LIMIT_KEY)) || 0;
  if (spendingLimit > 0) {
    spendingLimitInput.value = spendingLimit;
    updateLimitDisplay();
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ── Events ────────────────────────────────────
function bindEvents() {
  transactionForm.addEventListener('submit', handleFormSubmit);
  sortBySelect.addEventListener('change', renderTransactionList);
  themeToggleBtn.addEventListener('click', toggleTheme);
  setLimitBtn.addEventListener('click', handleSetLimit);
  modalDismiss.addEventListener('click', closeModal);
  limitModal.addEventListener('click', (e) => {
    if (e.target === limitModal) closeModal();
  });
  categorySelect.addEventListener('change', () => {
    const isOther = categorySelect.value === 'Other';
    otherGroup.hidden = !isOther;
    if (!isOther) {
      otherDescInput.value = '';
      otherError.textContent = '';
      otherDescInput.classList.remove('invalid');
    }
  });
}

// ── Form Submit ───────────────────────────────
function handleFormSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const category  = categorySelect.value;
  const otherDesc = category === 'Other' ? otherDescInput.value.trim() : '';
  const amount    = parseFloat(amountInput.value);
  const currentTotal = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Show warning pop-up if already over limit, then save anyway after dismiss
  if (spendingLimit > 0 && currentTotal >= spendingLimit) {
    openModal(() => commitTransaction(category, otherDesc, amount));
    return;
  }

  commitTransaction(category, otherDesc, amount);
}

function commitTransaction(category, otherDesc, amount) {
  const transaction = {
    id:        crypto.randomUUID(),
    name:      itemNameInput.value.trim(),
    amount,
    category,
    otherDesc,
    date:      new Date().toISOString(),
  };

  transactions.push(transaction);
  saveTransactions();
  renderAll();
  transactionForm.reset();
  otherGroup.hidden = true;
  clearErrors();
}

// ── Modal ─────────────────────────────────────
let pendingCallback = null;

function openModal(callback) {
  pendingCallback = callback;
  limitModal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  modalDismiss.focus();
}

function closeModal() {
  limitModal.classList.remove('is-open');
  document.body.style.overflow = '';
  if (pendingCallback) {
    pendingCallback();
    pendingCallback = null;
  }
}

// ── Validation ────────────────────────────────
function validateForm() {
  let valid = true;
  clearErrors();

  const name     = itemNameInput.value.trim();
  const amount   = amountInput.value.trim();
  const category = categorySelect.value;

  if (!name) {
    showError(itemNameInput, nameError, 'Item name is required.');
    valid = false;
  }

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    showError(amountInput, amountError, 'Enter a valid amount greater than 0.');
    valid = false;
  }

  if (!category) {
    showError(categorySelect, categoryError, 'Please select a category.');
    valid = false;
  }

  if (category === 'Other' && !otherDescInput.value.trim()) {
    showError(otherDescInput, otherError, 'Please describe the activity.');
    valid = false;
  }

  return valid;
}

function showError(inputEl, errorEl, message) {
  inputEl.classList.add('invalid');
  errorEl.textContent = message;
}

function clearErrors() {
  [itemNameInput, amountInput, categorySelect, otherDescInput].forEach(el => el.classList.remove('invalid'));
  [nameError, amountError, categoryError, otherError].forEach(el => (el.textContent = ''));
}

// ── Delete ────────────────────────────────────
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  renderAll();
}

// ── Spending Limit ────────────────────────────
function handleSetLimit() {
  const val = parseFloat(spendingLimitInput.value);
  if (isNaN(val) || val < 0) {
    limitDisplayEl.textContent = 'Enter a valid positive number.';
    return;
  }
  spendingLimit = val;
  localStorage.setItem(LIMIT_KEY, spendingLimit);
  updateLimitDisplay();
  renderBalance();
}

function updateLimitDisplay() {
  if (spendingLimit > 0) {
    limitDisplayEl.textContent = `Limit set: ${formatCurrency(spendingLimit)}`;
  } else {
    limitDisplayEl.textContent = 'No limit set.';
  }
}

// ── Render All ────────────────────────────────
function renderAll() {
  renderBalance();
  renderTransactionList();
  renderChart();
}

// ── Balance ───────────────────────────────────
function renderBalance() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  totalBalanceEl.textContent = formatCurrency(total);

  const isOverLimit = spendingLimit > 0 && total > spendingLimit;
  spendingWarningEl.hidden = !isOverLimit;
}

// ── Transaction List ──────────────────────────
function renderTransactionList() {
  const sorted = getSortedTransactions();
  const total  = transactions.reduce((sum, t) => sum + t.amount, 0);

  // Toggle empty state
  emptyStateEl.style.display = sorted.length === 0 ? 'block' : 'none';

  // Remove existing items (keep emptyState li)
  Array.from(transactionList.querySelectorAll('.transaction-item')).forEach(el => el.remove());

  sorted.forEach(t => {
    const isOverLimit = spendingLimit > 0 && total > spendingLimit;
    const li = createTransactionItem(t, isOverLimit);
    transactionList.appendChild(li);
  });
}

function createTransactionItem(t, highlightOverLimit) {
  const li = document.createElement('li');
  li.className = 'transaction-item' + (highlightOverLimit ? ' over-limit' : '');
  li.dataset.id = t.id;

  const dotClass = `dot-${t.category.toLowerCase()}`;
  const dateStr  = formatDate(t.date);
  const metaLabel = t.category === 'Other' && t.otherDesc
    ? escapeHtml(t.otherDesc)
    : t.category;

  li.innerHTML = `
    <span class="category-dot ${dotClass}" aria-hidden="true"></span>
    <div class="transaction-info">
      <div class="transaction-name">${escapeHtml(t.name)}</div>
      <div class="transaction-meta">${metaLabel} &middot; ${dateStr}</div>
    </div>
    <span class="transaction-amount">${formatCurrency(t.amount)}</span>
    <button class="btn-delete" aria-label="Delete ${escapeHtml(t.name)}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  li.querySelector('.btn-delete').addEventListener('click', () => deleteTransaction(t.id));
  return li;
}

// ── Sorting ───────────────────────────────────
function getSortedTransactions() {
  const mode = sortBySelect.value;
  const copy = [...transactions];

  switch (mode) {
    case 'date-asc':
      return copy.sort((a, b) => new Date(a.date) - new Date(b.date));
    case 'date-desc':
      return copy.sort((a, b) => new Date(b.date) - new Date(a.date));
    case 'amount-desc':
      return copy.sort((a, b) => b.amount - a.amount);
    case 'amount-asc':
      return copy.sort((a, b) => a.amount - b.amount);
    case 'category-asc':
      return copy.sort((a, b) => a.category.localeCompare(b.category));
    default:
      return copy;
  }
}

// ── Chart ─────────────────────────────────────
function renderChart() {
  const totals = {};
  transactions.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(totals);
  const data   = Object.values(totals);
  const colors = labels.map(l => CATEGORY_COLORS[l] || '#94a3b8');

  const hasData = labels.length > 0;
  chartEmptyEl.style.display = hasData ? 'none' : 'block';
  chartCanvas.style.display  = hasData ? 'block' : 'none';

  if (!hasData) {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  if (chartInstance) {
    chartInstance.data.labels          = labels;
    chartInstance.data.datasets[0].data   = data;
    chartInstance.data.datasets[0].backgroundColor = colors;
    chartInstance.update();
    return;
  }

  chartInstance = new Chart(chartCanvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: getComputedStyle(document.documentElement)
          .getPropertyValue('--bg-card').trim() || '#fff',
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            font: { size: 13 },
            color: getComputedStyle(document.documentElement)
              .getPropertyValue('--text-primary').trim() || '#1e293b',
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${formatCurrency(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

// ── Theme Toggle ──────────────────────────────
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const themeIcon = document.getElementById('themeIcon');
  themeIcon.src = theme === 'dark' ? 'icons/sun.svg' : 'icons/moon.svg';
  themeIcon.alt = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  // Re-render chart so legend colours update
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
    renderChart();
  }
}

// ── Helpers ───────────────────────────────────
function formatCurrency(amount) {
  return '€' + amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Boot ──────────────────────────────────────
init();
