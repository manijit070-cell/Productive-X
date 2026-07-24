import { api } from './api.js';
import { showToast } from './components/ui.js';
import { initPomodoro } from './pages/pomodoro.js';
import { initFitness } from './pages/fitness.js';
import { initAI } from './ai.js';

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
  const loadedModules = new Set();

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
      if(target === 'dashboard') {
        loadDashboard();
      } else if (!loadedModules.has(target)) {
        if(target === 'tasks') import('./pages/tasks.js').then(m => { m.initTasks(); loadedModules.add('tasks'); });
        if(target === 'expenses') import('./pages/expenses.js').then(m => { m.initExpenses(); loadedModules.add('expenses'); });
        if(target === 'goals') import('./pages/goals.js').then(m => { m.initGoals(); loadedModules.add('goals'); });
        if(target === 'habits') import('./pages/habits.js').then(m => { m.initHabits(); loadedModules.add('habits'); });
        if(target === 'notes') import('./pages/notes.js').then(m => { m.initNotes(); loadedModules.add('notes'); });
        if(target === 'pomodoro') { initPomodoro(); loadedModules.add('pomodoro'); }
        if(target === 'fitness') { initFitness(); loadedModules.add('fitness'); }
      }
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

  // Theme Logic
  const themeBtn = document.getElementById('theme-toggle-btn');
  const themeCheckbox = document.getElementById('theme-toggle'); // Settings checkbox

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    if (theme === 'light') {
      themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
      if(themeCheckbox) themeCheckbox.checked = false;
    } else {
      themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
      if(themeCheckbox) themeCheckbox.checked = true;
    }
    
    window.dispatchEvent(new Event('themeChanged'));
  }

  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'light' ? 'dark' : 'light');
  });

  if (themeCheckbox) {
    themeCheckbox.addEventListener('change', (e) => {
      setTheme(e.target.checked ? 'dark' : 'light');
    });
  }

  // Initial load
  loadDashboard();

  // Initialize Global AI Assistant
  initAI();

  window.addEventListener('ai_refresh_dashboard', loadDashboard);
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
      document.getElementById('dash-balance').textContent = `₹${data.finance.balance}`;
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
