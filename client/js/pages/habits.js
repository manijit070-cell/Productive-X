import { api } from '../api.js';
import { showToast, customPrompt, customConfirm } from '../components/ui.js';

export async function initHabits() {
  const container = document.getElementById('module-habits');
  container.innerHTML = `
    <div class="flex justify-between items-center" style="margin-bottom: 2rem;">
      <h2>Habits Tracker</h2>
      <button class="btn btn-primary" id="btn-add-habit"><i class="fa-solid fa-plus"></i> Add Habit</button>
    </div>
    <div id="habits-list" class="grid grid-cols-2 gap-4"></div>
  `;

  await loadHabits();

  document.getElementById('btn-add-habit').onclick = async () => {
    const name = await customPrompt("Enter habit name:");
    if(name) {
      api.createHabit({ name }).then(() => {
        showToast('Habit added');
        loadHabits();
      }).catch(err => showToast(err.message, 'error'));
    }
  };

  // Listen for AI creating habits
  if (!window._habitsAiListenerAdded) {
    window.addEventListener('ai_refresh_habits', loadHabits);
    window._habitsAiListenerAdded = true;
  }
}

async function loadHabits() {
  try {
    const res = await api.getHabits();
    if(res.success) {
      const list = document.getElementById('habits-list');
      list.innerHTML = '';
      
      res.data.forEach(habit => {
        const div = document.createElement('div');
        div.className = 'card glass flex-col';
        div.style.gap = '1rem';

        // Check if checked in today
        const todayStr = new Date().toDateString();
        const trackedDates = habit.tracking || [];
        const isDoneToday = trackedDates.some(d => new Date(d).toDateString() === todayStr);

        // Generate 7 day history
        let historyHtml = '<div style="display:flex; gap:0.25rem; align-items:flex-end; height:30px;">';
        for(let i=6; i>=0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const done = trackedDates.some(td => new Date(td).toDateString() === d.toDateString());
          const h = done ? '100%' : '30%';
          const color = done ? 'var(--success-color)' : 'var(--glass-border-hover)';
          historyHtml += `<div style="flex:1; height:${h}; background:${color}; border-radius:3px;" title="${d.toDateString()}"></div>`;
        }
        historyHtml += '</div>';

        div.innerHTML = `
          <div class="flex justify-between items-start">
            <div>
              <h3 style="margin-bottom: 0.25rem; font-size:1.2rem;">${habit.name}</h3>
              <span style="font-size: 0.9rem; color: var(--success-color); font-weight:600;"><i class="fa-solid fa-fire"></i> ${habit.streak} Day Streak</span>
            </div>
            <button class="btn btn-delete" style="background:transparent; color:var(--text-muted);"><i class="fa-solid fa-trash"></i></button>
          </div>
          
          <div style="margin: 1rem 0;">
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">Last 7 Days</p>
            ${historyHtml}
          </div>

          <button class="btn btn-primary btn-checkin" style="width:100%;" ${isDoneToday ? 'disabled' : ''}>
            ${isDoneToday ? '<i class="fa-solid fa-check-double"></i> Completed Today' : '<i class="fa-solid fa-check"></i> Mark Complete'}
          </button>
        `;

        div.querySelector('.btn-delete').onclick = async () => {
          if(await customConfirm("Are you sure you want to delete this habit?")) {
            api.deleteHabit(habit._id).then(() => {
              showToast('Habit deleted');
              loadHabits();
            });
          }
        };

        const checkBtn = div.querySelector('.btn-checkin');
        if(!isDoneToday) {
          checkBtn.onclick = (e) => {
            // Confetti
            const rect = checkBtn.getBoundingClientRect();
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { x: (rect.left + rect.width/2)/window.innerWidth, y: rect.top/window.innerHeight }
            });
            
            const newTracking = [...trackedDates, new Date()];
            api.updateHabit(habit._id, { streak: habit.streak + 1, tracking: newTracking }).then(() => {
              showToast('Checked in successfully!');
              loadHabits();
            });
          };
        } else {
          checkBtn.style.opacity = '0.5';
          checkBtn.style.cursor = 'not-allowed';
        }

        list.appendChild(div);
      });
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}
