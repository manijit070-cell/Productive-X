import { api } from '../api.js';
import { showToast, customPrompt } from '../components/ui.js';
import { MotionKit } from '../animations.js';

let taskChartInstance = null;
let expenseChartInstance = null;
let lastDashboardData = null;
let lastTasksData = null;

function getThemeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/**
 * Format currency in Indian Rupees format or standard
 */
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Get greeting based on current local hour
 */
function getGreeting(userName = 'Explorer') {
  const hour = new Date().getHours();
  let timeGreeting = 'Good morning';
  if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
  else if (hour >= 17 && hour < 22) timeGreeting = 'Good evening';
  else if (hour >= 22 || hour < 5) timeGreeting = 'Night owl mode';

  return `${timeGreeting}, ${userName} ✨`;
}

/**
 * Get formatted current date
 */
function getFormattedDate() {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Main render function for the upgraded Dashboard
 */
export function renderDashboard(data, tasks = []) {
  lastDashboardData = data;
  lastTasksData = tasks;

  // 1. Setup Hero Greeting & Date
  const userName = document.getElementById('user-name-display')?.textContent || 'Friend';
  const greetingEl = document.getElementById('dash-greeting-title');
  if (greetingEl) greetingEl.textContent = getGreeting(userName);

  const dateEl = document.getElementById('dash-date-display');
  if (dateEl) dateEl.textContent = getFormattedDate();

  // 2. Compute Productivity Momentum Score
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const taskRate = totalTasks > 0 ? (completedTasks / totalTasks) : 0.8;
  
  const habits = data.habits || [];
  const todayStr = new Date().toDateString();
  const habitsDoneToday = habits.filter(h => 
    (h.tracking || []).some(d => new Date(d).toDateString() === todayStr)
  ).length;
  const habitRate = habits.length > 0 ? (habitsDoneToday / habits.length) : 0.7;

  // Weighted score (50% tasks, 30% habits, 20% active engagement)
  let productivityScore = Math.round((taskRate * 50) + (habitRate * 30) + 15);
  productivityScore = Math.min(100, Math.max(30, productivityScore));

  const scoreValEl = document.getElementById('dash-score-value');
  if (scoreValEl) scoreValEl.textContent = `${productivityScore}%`;

  const scoreCircle = document.getElementById('dash-score-circle');
  if (scoreCircle) {
    // Circle circumference for r=30 is ~188.5
    const circumference = 188.5;
    const offset = circumference - (circumference * productivityScore) / 100;
    scoreCircle.style.strokeDashoffset = offset;
  }

  const scoreStatusEl = document.getElementById('dash-score-status');
  if (scoreStatusEl) {
    if (productivityScore >= 80) scoreStatusEl.innerHTML = '<i class="fa-solid fa-bolt text-warning"></i> Peak Flow';
    else if (productivityScore >= 60) scoreStatusEl.innerHTML = '<i class="fa-solid fa-fire text-primary"></i> High Momentum';
    else scoreStatusEl.innerHTML = '<i class="fa-solid fa-seedling text-success"></i> Warming Up';
  }

  // 3. KPI Metric 1: Pending Tasks
  const pendingCount = data.pendingTasks ?? tasks.filter(t => t.status !== 'Completed').length;
  const pendingEl = document.getElementById('dash-pending-tasks');
  if (pendingEl) pendingEl.textContent = pendingCount;
  MotionKit.animateCounter('dash-pending-tasks', pendingCount);

  // Compute tasks due today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const dueTodayTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === 'Completed') return false;
    const d = new Date(t.dueDate);
    return d >= todayStart && d < todayEnd;
  }).length;

  const tasksDueEl = document.getElementById('dash-tasks-due-today');
  if (tasksDueEl) {
    tasksDueEl.textContent = dueTodayTasks > 0 ? `${dueTodayTasks} due today` : (pendingCount > 0 ? `${pendingCount} in queue` : 'All caught up 🎉');
  }

  const tasksBarEl = document.getElementById('dash-tasks-bar');
  if (tasksBarEl) {
    const taskCompletionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    MotionKit.animateProgressBar(tasksBarEl, taskCompletionPercent);
  }

  // 4. KPI Metric 2: Net Balance & Cash Flow
  const balance = data.finance ? data.finance.balance : 0;
  const income = data.finance ? data.finance.totalIncome : 0;
  const expense = data.finance ? data.finance.totalExpense : 0;
  
  const balanceEl = document.getElementById('dash-balance');
  if (balanceEl) balanceEl.textContent = formatCurrency(balance);
  MotionKit.animateCounter('dash-balance', balance, { prefix: '₹', isCurrency: true });

  const incomePill = document.getElementById('dash-income-pill');
  if (incomePill) incomePill.innerHTML = `<i class="fa-solid fa-arrow-down"></i> ${formatCurrency(income)}`;

  const expensePill = document.getElementById('dash-expense-pill');
  if (expensePill) expensePill.innerHTML = `<i class="fa-solid fa-arrow-up"></i> ${formatCurrency(expense)}`;

  const balanceBar = document.getElementById('dash-balance-bar');
  if (balanceBar) {
    const totalFlow = income + expense;
    const savingsPercent = totalFlow > 0 ? Math.round((income / totalFlow) * 100) : 60;
    MotionKit.animateProgressBar(balanceBar, savingsPercent);
  }

  // 5. KPI Metric 3: Active Goals
  const activeGoals = data.activeGoals || [];
  const goalsEl = document.getElementById('dash-active-goals');
  if (goalsEl) goalsEl.textContent = activeGoals.length;
  MotionKit.animateCounter('dash-active-goals', activeGoals.length);

  const goalsSummaryEl = document.getElementById('dash-goals-summary');
  if (goalsSummaryEl) {
    goalsSummaryEl.textContent = activeGoals.length > 0 ? `${activeGoals.length} milestones active` : 'Set your first goal';
  }

  const goalsBar = document.getElementById('dash-goals-bar');
  if (goalsBar && activeGoals.length > 0) {
    const avgProgress = Math.round(activeGoals.reduce((acc, g) => acc + (g.progress || 0), 0) / activeGoals.length);
    MotionKit.animateProgressBar(goalsBar, avgProgress);
  } else if (goalsBar) {
    MotionKit.animateProgressBar(goalsBar, 0);
  }

  // 6. KPI Metric 4: Habits & Streaks
  const habitsEl = document.getElementById('dash-habits-tracked');
  if (habitsEl) habitsEl.textContent = habits.length;
  MotionKit.animateCounter('dash-habits-tracked', habits.length);

  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
  const streakSummaryEl = document.getElementById('dash-streak-summary');
  if (streakSummaryEl) {
    streakSummaryEl.textContent = bestStreak > 0 ? `🔥 ${bestStreak}d best streak` : `${habitsDoneToday}/${habits.length} checked today`;
  }

  const habitsBar = document.getElementById('dash-habits-bar');
  if (habitsBar && habits.length > 0) {
    const habitPercent = Math.round((habitsDoneToday / habits.length) * 100);
    MotionKit.animateProgressBar(habitsBar, habitPercent);
  }

  // 7. Render Priority Tasks Widget
  renderPriorityTasks(tasks);

  // 8. Render Active Goals Widget
  renderGoalsWidget(activeGoals);

  // 9. Render Habits Checklist Widget
  renderHabitsWidget(habits);

  // 10. Render Sage AI Daily Pulse Widget
  renderSagePulse(tasks, data.finance, habits);

  // 11. Render Modern Doughnut Charts
  const todo = tasks.filter(t => t.status === 'To Do').length;
  const inprog = tasks.filter(t => t.status === 'In Progress' || t.status === 'Review').length;
  const comp = completedTasks;
  const taskChartData = [todo, inprog, comp];
  const expenseChartData = [income || 1, expense || 0];

  initCharts(taskChartData, expenseChartData, totalTasks, income, expense);

  // 12. Run Framer Motion Stagger Animation on Cards
  MotionKit.staggerCards('.motion-card', {
    y: 16,
    duration: 0.5,
    staggerDelay: 0.05
  });

  // 13. Bind Interactive Quick Actions
  setupDashboardActions();
}

/**
 * Render Priority Tasks with instant interactive completion
 */
function renderPriorityTasks(tasks) {
  const container = document.getElementById('dash-priority-tasks-list');
  if (!container) return;

  const pendingTasks = tasks.filter(t => t.status !== 'Completed').slice(0, 4);

  if (pendingTasks.length === 0) {
    container.innerHTML = `
      <div class="dash-empty-state">
        <i class="fa-solid fa-circle-check text-success"></i>
        <p><strong>All clear!</strong> No pending tasks in your queue.</p>
        <button class="btn btn-secondary btn-sm" id="btn-empty-add-task" style="margin-top: 0.5rem;">
          <i class="fa-solid fa-plus"></i> Add New Task
        </button>
      </div>
    `;
    const btnEmpty = document.getElementById('btn-empty-add-task');
    if (btnEmpty) {
      btnEmpty.onclick = () => window.triggerQuickTask?.();
    }
    return;
  }

  container.innerHTML = pendingTasks.map(task => {
    let priorityBadge = '';
    if (task.priority === 'High') {
      priorityBadge = '<span class="priority-badge high">High</span>';
    } else if (task.priority === 'Medium') {
      priorityBadge = '<span class="priority-badge med">Med</span>';
    } else {
      priorityBadge = '<span class="priority-badge low">Low</span>';
    }

    let dueDateTag = '';
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      const isPast = d < new Date();
      dueDateTag = `<span class="task-due-tag ${isPast ? 'overdue' : ''}"><i class="fa-regular fa-clock"></i> ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>`;
    }

    return `
      <div class="dash-task-row" data-task-id="${task._id}">
        <label class="custom-checkbox-wrap">
          <input type="checkbox" class="dash-task-check" data-task-id="${task._id}" />
          <span class="custom-checkbox-mark"></span>
        </label>
        <div class="dash-task-info">
          <div class="dash-task-title">${escapeHtml(task.title)}</div>
          <div class="dash-task-meta">
            ${priorityBadge}
            ${dueDateTag}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach interactive checkbox listeners
  container.querySelectorAll('.dash-task-check').forEach(chk => {
    chk.addEventListener('change', async (e) => {
      const taskId = e.target.getAttribute('data-task-id');
      const row = e.target.closest('.dash-task-row');
      
      if (row) {
        row.classList.add('completed-anim');
        MotionKit.springBounce(row);
        MotionKit.burstConfetti(row);
      }

      try {
        await api.updateTask(taskId, { status: 'Completed' });
        showToast('Task completed! Great job! 🎉');
        setTimeout(() => {
          window.dispatchEvent(new Event('ai_refresh_dashboard'));
        }, 350);
      } catch (err) {
        showToast(err.message, 'error');
        if (row) row.classList.remove('completed-anim');
      }
    });
  });
}

/**
 * Render Active Goals with progress bar and quick progress bump
 */
function renderGoalsWidget(goals) {
  const container = document.getElementById('dash-active-goals-list');
  if (!container) return;

  if (goals.length === 0) {
    container.innerHTML = `
      <div class="dash-empty-state">
        <i class="fa-solid fa-bullseye text-primary"></i>
        <p>No active goals yet. What would you like to achieve next?</p>
        <button class="btn btn-secondary btn-sm" id="btn-empty-add-goal" style="margin-top: 0.5rem;">
          <i class="fa-solid fa-plus"></i> Set a Milestone
        </button>
      </div>
    `;
    const btnEmpty = document.getElementById('btn-empty-add-goal');
    if (btnEmpty) {
      btnEmpty.onclick = () => window.triggerQuickGoal?.();
    }
    return;
  }

  container.innerHTML = goals.slice(0, 3).map(goal => {
    const progress = Math.min(100, Math.max(0, goal.progress || 0));
    
    // Deadline calculation
    const dl = new Date(goal.deadline);
    const now = new Date();
    const daysLeft = Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
    let deadlinePill = '';
    if (daysLeft < 0) {
      deadlinePill = '<span class="deadline-pill overdue"><i class="fa-solid fa-triangle-exclamation"></i> Overdue</span>';
    } else if (daysLeft === 0) {
      deadlinePill = '<span class="deadline-pill soon"><i class="fa-solid fa-clock"></i> Due Today</span>';
    } else {
      deadlinePill = `<span class="deadline-pill normal"><i class="fa-regular fa-calendar"></i> ${daysLeft}d left</span>`;
    }

    return `
      <div class="dash-goal-row" data-goal-id="${goal._id}">
        <div class="dash-goal-top">
          <div class="dash-goal-title">${escapeHtml(goal.title)}</div>
          <div class="dash-goal-actions">
            ${deadlinePill}
            <button class="btn-goal-bump" data-goal-id="${goal._id}" data-current="${progress}" title="Bump progress +10%">
              +10%
            </button>
          </div>
        </div>
        <div class="dash-goal-meter">
          <div class="dash-goal-track">
            <div class="dash-goal-fill" style="width: ${progress}%;"></div>
          </div>
          <span class="dash-goal-num">${progress}%</span>
        </div>
      </div>
    `;
  }).join('');

  // Interactive quick progress bump
  container.querySelectorAll('.btn-goal-bump').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const goalId = btn.getAttribute('data-goal-id');
      const current = Number(btn.getAttribute('data-current')) || 0;
      const nextProgress = Math.min(100, current + 10);
      
      MotionKit.springBounce(btn);
      if (nextProgress === 100) MotionKit.burstConfetti(btn);

      try {
        await api.updateGoal(goalId, { progress: nextProgress });
        showToast(nextProgress === 100 ? 'Goal reached! Incredible achievement! 🏆' : `Progress updated to ${nextProgress}%`);
        window.dispatchEvent(new Event('ai_refresh_dashboard'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  });
}

/**
 * Render Habits Checklist Widget with one-click today check-in
 */
function renderHabitsWidget(habits) {
  const container = document.getElementById('dash-today-habits-list');
  if (!container) return;

  if (habits.length === 0) {
    container.innerHTML = `
      <div class="dash-empty-state">
        <i class="fa-solid fa-calendar-check text-warning"></i>
        <p>No habits tracked yet. Consistency begins with one small ritual.</p>
        <button class="btn btn-secondary btn-sm" id="btn-empty-add-habit" style="margin-top: 0.5rem;">
          <i class="fa-solid fa-plus"></i> Add Habit
        </button>
      </div>
    `;
    const btnEmpty = document.getElementById('btn-empty-add-habit');
    if (btnEmpty) {
      btnEmpty.onclick = () => window.triggerQuickHabit?.();
    }
    return;
  }

  const todayStr = new Date().toDateString();

  container.innerHTML = habits.slice(0, 4).map(habit => {
    const trackedDates = habit.tracking || [];
    const isDoneToday = trackedDates.some(d => new Date(d).toDateString() === todayStr);

    return `
      <div class="dash-habit-row ${isDoneToday ? 'is-done' : ''}" data-habit-id="${habit._id}">
        <div class="habit-left">
          <div class="habit-streak-badge">
            <i class="fa-solid fa-fire"></i>
            <span>${habit.streak || 0}</span>
          </div>
          <div class="habit-title">${escapeHtml(habit.name)}</div>
        </div>
        <button class="dash-habit-check-btn ${isDoneToday ? 'done' : ''}" data-habit-id="${habit._id}" ${isDoneToday ? 'disabled' : ''}>
          ${isDoneToday ? '<i class="fa-solid fa-check"></i> Done' : '<i class="fa-solid fa-plus"></i> Check In'}
        </button>
      </div>
    `;
  }).join('');

  // Attach check in buttons
  container.querySelectorAll('.dash-habit-check-btn:not([disabled])').forEach(btn => {
    btn.onclick = async () => {
      const habitId = btn.getAttribute('data-habit-id');
      const habit = habits.find(h => h._id === habitId);
      if (!habit) return;

      MotionKit.springBounce(btn);
      MotionKit.burstConfetti(btn);

      const tracking = habit.tracking || [];
      tracking.push(new Date());
      const newStreak = (habit.streak || 0) + 1;

      try {
        await api.updateHabit(habitId, { streak: newStreak, tracking });
        showToast(`Habit checked in! Streak: ${newStreak} days 🔥`);
        window.dispatchEvent(new Event('ai_refresh_dashboard'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  });
}

/**
 * Sage AI Productivity Briefing Widget
 */
function renderSagePulse(tasks, finance = {}, habits = []) {
  const tipEl = document.getElementById('dash-sage-tip');
  const focusEl = document.getElementById('dash-sage-focus-val');
  const financeEl = document.getElementById('dash-sage-finance-val');
  const habitEl = document.getElementById('dash-sage-habit-val');

  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const highPriority = pendingTasks.filter(t => t.priority === 'High');

  // Dynamic advice
  if (highPriority.length > 0) {
    if (tipEl) tipEl.textContent = `You have ${highPriority.length} high-priority task${highPriority.length > 1 ? 's' : ''} waiting. Knocking one out before lunch unlocks maximum momentum.`;
    if (focusEl) focusEl.textContent = 'High Urgency';
  } else if (pendingTasks.length > 0) {
    if (tipEl) tipEl.textContent = `A steady queue of ${pendingTasks.length} tasks is ahead. Try a 25-minute Pomodoro focus block to get in the zone.`;
    if (focusEl) focusEl.textContent = 'Balanced Flow';
  } else {
    if (tipEl) tipEl.textContent = `All tasks are complete! It's a great window to review long-term milestones or recharge with fitness.`;
    if (focusEl) focusEl.textContent = 'All Clear 🎉';
  }

  // Finance status
  if (financeEl) {
    const balance = finance.balance || 0;
    if (balance > 1000) {
      financeEl.textContent = 'Healthy Surplus';
      financeEl.className = 'val text-success';
    } else if (balance >= 0) {
      financeEl.textContent = 'Balanced';
      financeEl.className = 'val text-primary';
    } else {
      financeEl.textContent = 'Deficit Warning';
      financeEl.className = 'val text-danger';
    }
  }

  // Habit status
  if (habitEl) {
    const todayStr = new Date().toDateString();
    const habitsDoneToday = habits.filter(h => (h.tracking || []).some(d => new Date(d).toDateString() === todayStr)).length;
    if (habitsDoneToday === habits.length && habits.length > 0) {
      habitEl.textContent = '100% Perfect';
      habitEl.className = 'val text-success';
    } else {
      habitEl.textContent = `${habitsDoneToday}/${habits.length} Done`;
      habitEl.className = 'val text-warning';
    }
  }
}

/**
 * Setup Dashboard Quick Action Button Handlers
 */
function setupDashboardActions() {
  // Quick Task
  const btnQuickTask = document.getElementById('dash-quick-task-btn');
  window.triggerQuickTask = async () => {
    MotionKit.springBounce(btnQuickTask);
    const title = await customPrompt('Create a new task:', 'e.g. Finish client presentation');
    if (title && title.trim()) {
      try {
        await api.createTask({ title: title.trim(), status: 'To Do', priority: 'Medium' });
        showToast('Task added to your queue ✨');
        window.dispatchEvent(new Event('ai_refresh_dashboard'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };
  if (btnQuickTask) btnQuickTask.onclick = window.triggerQuickTask;

  // Quick Expense
  const btnQuickExpense = document.getElementById('dash-quick-expense-btn');
  if (btnQuickExpense) {
    btnQuickExpense.onclick = async () => {
      MotionKit.springBounce(btnQuickExpense);
      const title = await customPrompt('Expense description:', 'e.g. Coffee & breakfast');
      if (!title || !title.trim()) return;
      const amtStr = await customPrompt('Amount (₹):', '150');
      const amount = parseFloat(amtStr);
      if (isNaN(amount) || amount <= 0) return;

      try {
        await api.createExpense({ title: title.trim(), amount, type: 'Expense' });
        showToast('Expense recorded successfully 💳');
        window.dispatchEvent(new Event('ai_refresh_dashboard'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }

  // Quick Focus (Pomodoro)
  const btnQuickFocus = document.getElementById('dash-quick-focus-btn');
  if (btnQuickFocus) {
    btnQuickFocus.onclick = () => {
      MotionKit.springBounce(btnQuickFocus);
      if (typeof window.navigateToModule === 'function') {
        window.navigateToModule('pomodoro');
      }
    };
  }

  // Quick Sage Chat
  const btnQuickSage = document.getElementById('dash-quick-sage-btn');
  const btnConsultSage = document.getElementById('dash-consult-sage-btn');
  const triggerSage = () => {
    const chatPanel = document.getElementById('ai-chat-panel');
    if (chatPanel) {
      chatPanel.style.display = 'flex';
      const input = document.getElementById('ai-chat-input');
      if (input) input.focus();
    }
  };
  if (btnQuickSage) btnQuickSage.onclick = triggerSage;
  if (btnConsultSage) btnConsultSage.onclick = triggerSage;

  // Quick 25m Sprint
  const btnPomoSprint = document.getElementById('dash-pomo-quick-btn');
  if (btnPomoSprint) {
    btnPomoSprint.onclick = () => {
      if (typeof window.navigateToModule === 'function') {
        window.navigateToModule('pomodoro');
        setTimeout(() => {
          document.getElementById('pomodoro-start')?.click();
        }, 300);
      }
    };
  }

  // Navigation Links from widgets
  document.getElementById('dash-view-all-tasks')?.addEventListener('click', () => {
    window.navigateToModule?.('tasks');
  });
  document.getElementById('dash-view-all-goals')?.addEventListener('click', () => {
    window.navigateToModule?.('goals');
  });
  document.getElementById('dash-view-all-habits')?.addEventListener('click', () => {
    window.navigateToModule?.('habits');
  });

  // Quick Goal Trigger
  window.triggerQuickGoal = async () => {
    const title = await customPrompt('Milestone or Goal title:', 'e.g. Read 5 chapters');
    if (!title || !title.trim()) return;
    const deadline = await customPrompt('Target deadline (YYYY-MM-DD):', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    if (title && deadline) {
      try {
        await api.createGoal({ title: title.trim(), deadline, progress: 0 });
        showToast('Milestone set! Let\'s crush it 🎯');
        window.dispatchEvent(new Event('ai_refresh_dashboard'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  // Quick Habit Trigger
  window.triggerQuickHabit = async () => {
    const name = await customPrompt('New daily habit:', 'e.g. Drink 2L water');
    if (name && name.trim()) {
      try {
        await api.createHabit({ name: name.trim() });
        showToast('Habit tracker started! 🌟');
        window.dispatchEvent(new Event('ai_refresh_dashboard'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };
}

function formatShortCurrency(amount) {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  return `${sign}₹${abs}`;
}

/**
 * Adorable & Dynamic Chart.js doughnut initializations
 */
export function initCharts(taskData = [0, 0, 0], expenseData = [1, 0], totalTasks = 0, income = 0, expense = 0) {
  const tCtx = document.getElementById('taskChart');
  const eCtx = document.getElementById('expenseChart');
  
  if (tCtx && eCtx) {
    if (taskChartInstance) taskChartInstance.destroy();
    if (expenseChartInstance) expenseChartInstance.destroy();

    const [todo, inprog, comp] = taskData;
    const balance = income - expense;

    // 1. Setup Task Chart Centerpiece & Chips
    const taskEmojiEl = document.getElementById('task-center-emoji');
    const taskValEl = document.getElementById('task-center-val');
    const taskSubEl = document.getElementById('task-center-sub');
    const taskChipsEl = document.getElementById('task-legend-chips');
    const chartBadgeTasks = document.getElementById('dash-chart-total-tasks');

    if (chartBadgeTasks) chartBadgeTasks.textContent = `${totalTasks} ${totalTasks === 1 ? 'Task' : 'Tasks'}`;

    const setDefaultTaskCenter = () => {
      if (!taskEmojiEl || !taskValEl || !taskSubEl) return;
      if (totalTasks === 0) {
        taskEmojiEl.textContent = '🌱';
        taskValEl.textContent = '0';
        taskSubEl.textContent = 'All Clear!';
      } else if (comp === totalTasks) {
        taskEmojiEl.textContent = '🏆';
        taskValEl.textContent = `${comp}/${totalTasks}`;
        taskSubEl.textContent = '100% Crushed! 🎉';
      } else if (comp > 0) {
        taskEmojiEl.textContent = '⚡';
        const pct = Math.round((comp / totalTasks) * 100);
        taskValEl.textContent = `${comp}/${totalTasks}`;
        taskSubEl.textContent = `${pct}% Completed ✨`;
      } else {
        taskEmojiEl.textContent = '🎯';
        taskValEl.textContent = `${totalTasks}`;
        taskSubEl.textContent = 'In Progress 🚀';
      }
    };
    setDefaultTaskCenter();

    // Populate Task Legend Chips
    if (taskChipsEl) {
      taskChipsEl.innerHTML = `
        <div class="cute-chip" data-idx="0">
          <span class="cute-chip-dot" style="background:#818cf8;"></span>
          <span>To Do: <b>${todo}</b></span>
        </div>
        <div class="cute-chip" data-idx="1">
          <span class="cute-chip-dot" style="background:#f59e0b;"></span>
          <span>In Progress: <b>${inprog}</b></span>
        </div>
        <div class="cute-chip" data-idx="2">
          <span class="cute-chip-dot" style="background:#10b981;"></span>
          <span>Completed: <b>${comp}</b></span>
        </div>
      `;

      taskChipsEl.querySelectorAll('.cute-chip').forEach(chip => {
        const idx = Number(chip.getAttribute('data-idx'));
        chip.addEventListener('mouseenter', () => {
          if (idx === 0) {
            if (taskEmojiEl) taskEmojiEl.textContent = '📝';
            if (taskValEl) taskValEl.textContent = `${todo}`;
            if (taskSubEl) taskSubEl.textContent = 'To Do 🟣';
          } else if (idx === 1) {
            if (taskEmojiEl) taskEmojiEl.textContent = '🔥';
            if (taskValEl) taskValEl.textContent = `${inprog}`;
            if (taskSubEl) taskSubEl.textContent = 'In Progress 🟡';
          } else if (idx === 2) {
            if (taskEmojiEl) taskEmojiEl.textContent = '🎉';
            if (taskValEl) taskValEl.textContent = `${comp}`;
            if (taskSubEl) taskSubEl.textContent = 'Completed 🟢';
          }
        });
        chip.addEventListener('mouseleave', setDefaultTaskCenter);
      });
    }

    // 2. Setup Expense Chart Centerpiece & Chips
    const expEmojiEl = document.getElementById('expense-center-emoji');
    const expValEl = document.getElementById('expense-center-val');
    const expSubEl = document.getElementById('expense-center-sub');
    const expChipsEl = document.getElementById('expense-legend-chips');
    const chartBadgeSavings = document.getElementById('dash-chart-savings-rate');

    const totalCash = (income || 0) + (expense || 0);
    const savingsPercent = totalCash > 0 ? Math.round(((income - expense) / totalCash) * 100) : 0;
    if (chartBadgeSavings) {
      chartBadgeSavings.textContent = `${savingsPercent >= 0 ? '+' : ''}${savingsPercent}% Margin`;
      chartBadgeSavings.className = `chart-badge-count cute-badge ${savingsPercent >= 0 ? 'success' : 'text-danger'}`;
    }

    const setDefaultExpenseCenter = () => {
      if (!expEmojiEl || !expValEl || !expSubEl) return;
      if (balance > 10000) {
        expEmojiEl.textContent = '💎';
        expValEl.textContent = formatShortCurrency(balance);
        expSubEl.textContent = 'Net Surplus 🌟';
      } else if (balance >= 0) {
        expEmojiEl.textContent = '🐷';
        expValEl.textContent = formatShortCurrency(balance);
        expSubEl.textContent = 'Saved In Stash 💖';
      } else {
        expEmojiEl.textContent = '⚠️';
        expValEl.textContent = formatShortCurrency(balance);
        expSubEl.textContent = 'Net Deficit 💸';
      }
    };
    setDefaultExpenseCenter();

    // Populate Expense Legend Chips
    if (expChipsEl) {
      expChipsEl.innerHTML = `
        <div class="cute-chip" data-idx="0">
          <span class="cute-chip-dot" style="background:#10b981;"></span>
          <span>Inflow: <b>${formatShortCurrency(income)}</b></span>
        </div>
        <div class="cute-chip" data-idx="1">
          <span class="cute-chip-dot" style="background:#f43f5e;"></span>
          <span>Outflow: <b>${formatShortCurrency(expense)}</b></span>
        </div>
      `;

      expChipsEl.querySelectorAll('.cute-chip').forEach(chip => {
        const idx = Number(chip.getAttribute('data-idx'));
        chip.addEventListener('mouseenter', () => {
          if (idx === 0) {
            if (expEmojiEl) expEmojiEl.textContent = '🤑';
            if (expValEl) expValEl.textContent = `+${formatShortCurrency(income)}`;
            if (expSubEl) expSubEl.textContent = 'Total Earned 💚';
          } else if (idx === 1) {
            if (expEmojiEl) expEmojiEl.textContent = '💸';
            if (expValEl) expValEl.textContent = `-${formatShortCurrency(expense)}`;
            if (expSubEl) expSubEl.textContent = 'Total Spent 💖';
          }
        });
        chip.addEventListener('mouseleave', setDefaultExpenseCenter);
      });
    }

    const mainText = getThemeColor('--text-main') || '#f8fafc';
    const mutedText = getThemeColor('--text-muted') || '#94a3b8';
    const cardBorder = getThemeColor('--card-border') || 'rgba(255,255,255,0.08)';

    // Fallback data if everything is 0 so chart still renders an adorable outline
    const safeTaskData = (todo === 0 && inprog === 0 && comp === 0) ? [1, 0, 0] : taskData;
    const taskColors = (todo === 0 && inprog === 0 && comp === 0) 
      ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)']
      : ['#818cf8', '#f59e0b', '#10b981'];

    // Adorable Task Doughnut Chart
    taskChartInstance = new Chart(tCtx, {
      type: 'doughnut',
      data: {
        labels: ['To Do', 'In Progress', 'Completed'],
        datasets: [{
          data: safeTaskData,
          backgroundColor: taskColors,
          hoverBackgroundColor: ['#a5b4fc', '#fbbf24', '#34d399'],
          borderWidth: 0,
          borderRadius: 14,
          spacing: 6,
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 1000,
          easing: 'easeOutQuart'
        },
        onHover: (event, activeElements) => {
          if (activeElements && activeElements.length > 0) {
            const idx = activeElements[0].index;
            if (idx === 0) {
              if (taskEmojiEl) taskEmojiEl.textContent = '📝';
              if (taskValEl) taskValEl.textContent = `${todo}`;
              if (taskSubEl) taskSubEl.textContent = 'To Do 🟣';
            } else if (idx === 1) {
              if (taskEmojiEl) taskEmojiEl.textContent = '🔥';
              if (taskValEl) taskValEl.textContent = `${inprog}`;
              if (taskSubEl) taskSubEl.textContent = 'In Progress 🟡';
            } else if (idx === 2) {
              if (taskEmojiEl) taskEmojiEl.textContent = '🎉';
              if (taskValEl) taskValEl.textContent = `${comp}`;
              if (taskSubEl) taskSubEl.textContent = 'Completed 🟢';
            }
          } else {
            setDefaultTaskCenter();
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: mainText,
            bodyColor: mutedText,
            borderColor: cardBorder,
            borderWidth: 1,
            padding: 12,
            cornerRadius: 12,
            boxPadding: 6,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} Tasks`
            }
          }
        },
        cutout: '72%'
      }
    });

    // Adorable Expense Doughnut Chart
    const safeExpenseData = (income === 0 && expense === 0) ? [1, 0] : expenseData;
    expenseChartInstance = new Chart(eCtx, {
      type: 'doughnut',
      data: {
        labels: ['Inflow (Income)', 'Outflow (Expense)'],
        datasets: [{
          data: safeExpenseData,
          backgroundColor: ['#10b981', '#f43f5e'],
          hoverBackgroundColor: ['#34d399', '#fb7185'],
          borderWidth: 0,
          borderRadius: 14,
          spacing: 6,
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          animateScale: true,
          animateRotate: true,
          duration: 1000,
          easing: 'easeOutQuart'
        },
        onHover: (event, activeElements) => {
          if (activeElements && activeElements.length > 0) {
            const idx = activeElements[0].index;
            if (idx === 0) {
              if (expEmojiEl) expEmojiEl.textContent = '🤑';
              if (expValEl) expValEl.textContent = `+${formatShortCurrency(income)}`;
              if (expSubEl) expSubEl.textContent = 'Total Earned 💚';
            } else if (idx === 1) {
              if (expEmojiEl) expEmojiEl.textContent = '💸';
              if (expValEl) expValEl.textContent = `-${formatShortCurrency(expense)}`;
              if (expSubEl) expSubEl.textContent = 'Total Spent 💖';
            }
          } else {
            setDefaultExpenseCenter();
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: mainText,
            bodyColor: mutedText,
            borderColor: cardBorder,
            borderWidth: 1,
            padding: 12,
            cornerRadius: 12,
            boxPadding: 6,
            callbacks: {
              label: (context) => ` ${context.label}: ₹${Number(context.raw).toLocaleString('en-IN')}`
            }
          }
        },
        cutout: '72%'
      }
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.addEventListener('themeChanged', () => {
  if (lastDashboardData && lastTasksData) {
    renderDashboard(lastDashboardData, lastTasksData);
  }
});
