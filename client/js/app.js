import { api } from './api.js';
import { showToast } from './components/ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!api.token) {
    window.location.href = '/index.html';
    return;
  }

  try {
    // Load User Profile
    const profileRes = await api.getProfile();
    if (profileRes.success) {
      document.getElementById('user-name-display').textContent = profileRes.name;
      document.getElementById('user-avatar').textContent = profileRes.name.charAt(0).toUpperCase();
    }
  } catch (error) {
    showToast('Failed to load profile', 'error');
  }

  // Navigation Logic
  const navItems = document.querySelectorAll('.nav-item[data-target]');
  const sections = document.querySelectorAll('.module-section');
  const pageTitle = document.getElementById('page-title');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Update active nav
      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Update active section
      const target = item.getAttribute('data-target');
      sections.forEach(sec => sec.classList.remove('active'));
      document.getElementById(`module-${target}`).classList.add('active');

      // Update Title
      pageTitle.textContent = item.textContent.trim();

      // Mobile: close sidebar on click
      if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
      }

      // Load specific module data if needed
      if(target === 'dashboard') loadDashboard();
      if(target === 'tasks') import('./pages/tasks.js').then(m => m.initTasks());
      if(target === 'expenses') import('./pages/expenses.js').then(m => m.initExpenses());
      if(target === 'goals') import('./pages/goals.js').then(m => m.initGoals());
      if(target === 'habits') import('./pages/habits.js').then(m => m.initHabits());
      if(target === 'notes') import('./pages/notes.js').then(m => m.initNotes());
      if(target === 'pomodoro') import('./pages/pomodoro.js').then(m => m.initPomodoro());
    });
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    api.setToken(null);
    window.location.href = '/index.html';
  });

  // Mobile Toggle
  document.getElementById('mobile-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('active');
  });

  // Initial load
  loadDashboard();
});

// Dashboard logic
async function loadDashboard() {
  try {
    const res = await api.getDashboardSummary();
    const tasksRes = await api.getTasks();
    if(res.success && tasksRes.success) {
      const data = res.data;
      const tasks = tasksRes.data;

      document.getElementById('dash-pending-tasks').textContent = data.pendingTasks;
      document.getElementById('dash-balance').textContent = `$${data.finance.balance}`;
      document.getElementById('dash-active-goals').textContent = data.activeGoals.length;
      document.getElementById('dash-habits-tracked').textContent = data.habits.length;

      // Real task data
      const todo = tasks.filter(t => t.status === 'To Do').length;
      const inprog = tasks.filter(t => t.status === 'In Progress' || t.status === 'Review').length;
      const comp = tasks.filter(t => t.status === 'Completed').length;

      const taskData = [todo, inprog, comp];
      
      let income = data.finance.totalIncome || 0;
      let expense = data.finance.totalExpense || 0;
      if (income === 0 && expense === 0) {
        income = 1; // Prevent empty pie chart crash
      }
      const expenseData = [income, expense];
      
      import('./pages/dashboard.js').then(m => m.initCharts(taskData, expenseData));
    }
  } catch(error) {
    console.error(error);
  }
}
