import { api } from './api.js';
import { showToast } from './components/ui.js';
import { initPomodoro } from './pages/pomodoro.js';
import { initFitness } from './pages/fitness.js';
import { initAI } from './ai.js';
import { MotionKit } from './animations.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!api.token) {
    window.location.href = '/index.html';
    return;
  }

  // Start profile and dashboard loading in parallel
  const loadProfilePromise = api.getProfile().then(profileRes => {
    if (profileRes.success) {
      document.getElementById('user-name-display').textContent = profileRes.name;
      document.getElementById('user-avatar').textContent = profileRes.name.charAt(0).toUpperCase();
      const heroGreeting = document.getElementById('dash-greeting-title');
      if (heroGreeting) {
        import('./pages/dashboard.js').then(m => {
          // Re-trigger header greeting with updated name if dashboard already loaded
          const greetingHour = new Date().getHours();
          let prefix = 'Good morning';
          if (greetingHour >= 12 && greetingHour < 17) prefix = 'Good afternoon';
          else if (greetingHour >= 17 && greetingHour < 22) prefix = 'Good evening';
          else if (greetingHour >= 22 || greetingHour < 5) prefix = 'Night owl mode';
          heroGreeting.textContent = `${prefix}, ${profileRes.name} ✨`;
        });
      }
    }
  }).catch(error => {
    console.error(error);
    showToast('Failed to load profile', 'error');
  });

  // Global Navigation with Framer Motion transitions
  const navItems = document.querySelectorAll('.nav-item[data-target], .bottom-nav-item[data-target], .mobile-more-item[data-target]');
  const sections = document.querySelectorAll('.module-section');
  const pageTitle = document.getElementById('page-title');
  const loadedModules = new Set();
  const mobileMoreModal = document.getElementById('mobile-more-modal');

  window.navigateToModule = function(target) {
    if (!target) return;

    // Update active nav items
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(nav => {
      if (nav.getAttribute('data-target') === target) {
        nav.classList.add('active');
      } else {
        nav.classList.remove('active');
      }
    });

    // Check if target is inside mobile more modal
    const moreItem = document.querySelector(`.mobile-more-item[data-target="${target}"]`);
    if (moreItem) {
      document.getElementById('btn-mobile-more')?.classList.add('active');
    }

    if (mobileMoreModal && mobileMoreModal.classList.contains('active')) {
      mobileMoreModal.classList.remove('active');
    }

    // Switch active section with Framer Motion transition
    const targetSection = document.getElementById(`module-${target}`);
    if (targetSection) {
      sections.forEach(sec => sec.classList.remove('active'));
      targetSection.classList.add('active');
      MotionKit.pageTransition(targetSection);
    }

    // Update page title
    const navItem = document.querySelector(`.nav-item[data-target="${target}"]`);
    if (navItem && pageTitle) {
      pageTitle.textContent = navItem.textContent.trim();
    }

    // Load specific module if not loaded yet
    if (target === 'dashboard') {
      loadDashboard();
    } else if (!loadedModules.has(target)) {
      if (target === 'tasks') import('./pages/tasks.js').then(m => { m.initTasks(); loadedModules.add('tasks'); });
      if (target === 'expenses') import('./pages/expenses.js').then(m => { m.initExpenses(); loadedModules.add('expenses'); });
      if (target === 'goals') import('./pages/goals.js').then(m => { m.initGoals(); loadedModules.add('goals'); });
      if (target === 'habits') import('./pages/habits.js').then(m => { m.initHabits(); loadedModules.add('habits'); });
      if (target === 'notes') import('./pages/notes.js').then(m => { m.initNotes(); loadedModules.add('notes'); });
      if (target === 'pomodoro') { initPomodoro(); loadedModules.add('pomodoro'); }
      if (target === 'fitness') { initFitness(); loadedModules.add('fitness'); }
    }
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      window.navigateToModule(target);
    });
  });

  // Logout
  function handleLogout() {
    api.setToken(null);
    window.location.href = '/index.html';
  }
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  if (document.getElementById('mobile-logout-btn')) {
    document.getElementById('mobile-logout-btn').addEventListener('click', handleLogout);
  }

  // Mobile More Modal Toggle
  const btnMobileMore = document.getElementById('btn-mobile-more');
  const btnCloseMore = document.getElementById('btn-close-more');
  
  if (btnMobileMore && btnCloseMore && mobileMoreModal) {
    btnMobileMore.addEventListener('click', () => {
      mobileMoreModal.classList.add('active');
    });
    btnCloseMore.addEventListener('click', () => {
      mobileMoreModal.classList.remove('active');
    });
    mobileMoreModal.addEventListener('click', (e) => {
      if (e.target === mobileMoreModal) {
        mobileMoreModal.classList.remove('active');
      }
    });
  }

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
  const loadDashboardPromise = loadDashboard();

  // Hide loader once both critical systems are loaded
  Promise.all([loadProfilePromise, loadDashboardPromise]).then(() => {
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 400); // Wait for fade out
    }
  });

  // Initialize Global AI Assistant
  initAI();

  window.addEventListener('ai_refresh_dashboard', loadDashboard);
});

// Dashboard logic
async function loadDashboard() {
  try {
    const [res, tasksRes] = await Promise.all([
      api.getDashboardSummary(),
      api.getTasks()
    ]);
    if(res.success && tasksRes.success) {
      const data = res.data;
      const tasks = tasksRes.data;
      import('./pages/dashboard.js').then(m => m.renderDashboard(data, tasks));
    }
  } catch(error) {
    console.error(error);
  }
}
