import { api } from '../api.js';
import { showToast, customPrompt, customConfirm } from '../components/ui.js';

let expenseChart = null;
let allExpenses = [];

export async function initExpenses() {
  const container = document.getElementById('module-expenses');
  container.innerHTML = `
    <div class="flex justify-between items-center" style="margin-bottom: 2rem;">
      <h2>Expense Tracker</h2>
      <div class="flex gap-2">
        <select id="expense-filter" class="form-control" style="width: 150px; padding: 0.5rem;">
          <option value="all">All Time</option>
          <option value="month">This Month</option>
        </select>
        <button class="btn btn-success" id="btn-add-income" style="background-color: var(--success-color); border-color: var(--success-color); color: white;"><i class="fa-solid fa-plus"></i> Add Income</button>
        <button class="btn btn-danger" id="btn-add-expense" style="background-color: var(--danger-color); border-color: var(--danger-color); color: white;"><i class="fa-solid fa-minus"></i> Add Expense</button>
      </div>
    </div>
    
    <div class="grid grid-cols-3 gap-4" style="margin-bottom: 2rem;">
      <div class="card glass text-center">
        <h3 style="color: var(--success-color)">Total Income</h3>
        <h2 id="total-income">₹0.00</h2>
      </div>
      <div class="card glass text-center">
        <h3 style="color: var(--danger-color)">Total Expense</h3>
        <h2 id="total-expense">₹0.00</h2>
      </div>
      <div class="card glass text-center">
        <h3 style="color: var(--primary-color)">Balance</h3>
        <h2 id="net-balance">₹0.00</h2>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div class="card glass col-span-2" style="grid-column: span 2;">
        <table style="width: 100%; text-align: left; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--card-border);">
              <th style="padding: 1rem;">Date</th>
              <th style="padding: 1rem;">Category</th>
              <th style="padding: 1rem;">Amount</th>
              <th style="padding: 1rem; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody id="expense-list"></tbody>
        </table>
      </div>
      <div class="card glass flex-col">
        <h3 style="margin-bottom: 1rem; text-align: center;">Expenses by Category</h3>
        <div style="position: relative; height: 300px; width: 100%; display: flex; justify-content: center; align-items: center;">
          <canvas id="miniExpenseChart"></canvas>
        </div>
      </div>
    </div>
  `;

  await loadExpenses();

  document.getElementById('btn-add-income').onclick = () => showAddModal('Income');
  document.getElementById('btn-add-expense').onclick = () => showAddModal('Expense');
  document.getElementById('expense-filter').onchange = renderExpenses;

  window.addEventListener('ai_refresh_expenses', loadExpenses);
}

async function showAddModal(type) {
  const category = await customPrompt(`Enter category for ${type} (e.g. Salary, Groceries):`);
  if(!category) return;
  const amount = parseFloat(await customPrompt("Enter amount:"));
  
  if(category && amount) {
    // Optimistic array update
    const tempExpense = { _id: 'temp_' + Date.now(), type, category, amount, date: new Date().toISOString() };
    allExpenses.unshift(tempExpense); // Prepend to top
    renderExpenses();
    
    api.createExpense({ type, category, amount }).then(() => {
      showToast('Transaction added');
      loadExpenses(); // Fetch true DB IDs quietly
    }).catch(err => {
      showToast(err.message, 'error');
      loadExpenses(); // Revert
    });
  }
}

async function loadExpenses() {
  try {
    const res = await api.getExpenses();
    if(res.success) {
      allExpenses = res.data;
      renderExpenses();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderExpenses() {
  const list = document.getElementById('expense-list');
  const filter = document.getElementById('expense-filter').value;
  list.innerHTML = '';
  
  let income = 0;
  let expense = 0;
  const categoryTotals = {};

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  allExpenses.forEach(exp => {
    const expDate = new Date(exp.date);
    if(filter === 'month' && (expDate.getMonth() !== currentMonth || expDate.getFullYear() !== currentYear)) {
      return; // Skip
    }

    if(exp.type === 'Income') income += exp.amount;
    else {
      expense += exp.amount;
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    }

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--card-border)';
    const color = exp.type === 'Income' ? 'var(--success-color)' : 'var(--danger-color)';
    const sign = exp.type === 'Income' ? '+' : '-';
    
    tr.innerHTML = `
      <td style="padding: 1rem; font-size: 0.9rem; color: var(--text-muted);">${expDate.toLocaleDateString()}</td>
      <td style="padding: 1rem; font-weight: 500;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color}; margin-right:8px;"></span>
        ${exp.category}
      </td>
      <td style="padding: 1rem; font-weight: 600; color: ${color};">${sign}₹${exp.amount.toFixed(2)}</td>
      <td style="padding: 1rem; text-align: right;">
        <button class="btn btn-secondary btn-delete" style="padding: 0.2rem 0.5rem; border-radius: 4px;"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;

    tr.querySelector('.btn-delete').onclick = async () => {
      if(await customConfirm("Are you sure you want to delete this transaction?")) {
        // Optimistic update
        allExpenses = allExpenses.filter(e => e._id !== exp._id);
        renderExpenses(); // Sync local DOM instantly
        
        api.deleteExpense(exp._id).then(() => {
          showToast('Transaction deleted');
        }).catch(() => {
          showToast('Failed to delete', 'error');
          loadExpenses(); // Revert on failure
        });
      }
    };

    list.appendChild(tr);
  });

  document.getElementById('total-income').textContent = `₹${income.toFixed(2)}`;
  document.getElementById('total-expense').textContent = `₹${expense.toFixed(2)}`;
  document.getElementById('net-balance').textContent = `₹${(income - expense).toFixed(2)}`;

  updateChart(categoryTotals);
}

function updateChart(categories) {
  const ctx = document.getElementById('miniExpenseChart');
  if(!ctx) return;
  
  if(expenseChart) expenseChart.destroy();
  
  const labels = Object.keys(categories);
  const data = Object.values(categories);
  
  if(labels.length === 0) {
    labels.push('No Expenses');
    data.push(1);
  }

  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981'],
        borderWidth: 0,
        borderRadius: 12,
        spacing: 5,
        hoverOffset: 15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim(),
            padding: 20,
            font: { family: "'Poppins', sans-serif" }
          }
        },
        tooltip: {
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-tooltip-bg').trim(),
          titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim(),
          bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim(),
          borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card-border').trim(),
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8
        }
      },
      cutout: '80%',
      layout: {
        padding: 10
      }
    }
  });
}

window.addEventListener('themeChanged', () => {
  if (document.getElementById('module-expenses').classList.contains('active')) {
    renderExpenses();
  }
});
