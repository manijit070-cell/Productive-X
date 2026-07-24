import { api } from '../api.js';
import { showToast, customPrompt, customConfirm } from '../components/ui.js';

export async function initGoals() {
  const container = document.getElementById('module-goals');
  container.innerHTML = `
    <div class="flex justify-between items-center" style="margin-bottom: 2rem;">
      <h2>Goals Tracker</h2>
      <button class="btn btn-primary" id="btn-add-goal"><i class="fa-solid fa-plus"></i> Add Goal</button>
    </div>
    <div id="goals-list" class="grid grid-cols-2 gap-4"></div>
  `;

  await loadGoals();

  document.getElementById('btn-add-goal').onclick = async () => {
    const title = await customPrompt("Enter goal title:");
    const deadline = await customPrompt("Enter deadline (YYYY-MM-DD):");
    if(title && deadline) {
      api.createGoal({ title, deadline }).then(() => {
        showToast('Goal added');
        loadGoals();
      }).catch(err => showToast(err.message, 'error'));
    }
  };

  window.addEventListener('ai_refresh_goals', loadGoals);
}

async function loadGoals() {
  try {
    const res = await api.getGoals();
    if(res.success) {
      const list = document.getElementById('goals-list');
      list.innerHTML = '';
      
      res.data.forEach(goal => {
        const div = document.createElement('div');
        div.className = 'card glass';
        div.style.position = 'relative';
        div.style.overflow = 'hidden';

        const dl = new Date(goal.deadline);
        const now = new Date();
        const daysLeft = Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
        
        let daysText = daysLeft > 0 ? `${daysLeft} days left` : (daysLeft === 0 ? 'Due Today' : 'Overdue');
        let daysColor = daysLeft < 3 ? 'var(--danger-color)' : (daysLeft < 7 ? 'var(--warning-color)' : 'var(--success-color)');
        if(goal.completed) { daysText = 'Goal Reached!'; daysColor = 'var(--success-color)'; }

        // Color transition based on progress
        let barColor = 'var(--danger-color)';
        if(goal.progress >= 50) barColor = 'var(--warning-color)';
        if(goal.progress >= 100) barColor = 'var(--success-color)';

        div.innerHTML = `
          <div class="flex justify-between items-start" style="margin-bottom: 1.5rem;">
            <div>
              <h3 style="margin-bottom: 0.25rem;">${goal.title}</h3>
              <span style="font-size: 0.8rem; color: ${daysColor}; font-weight:600;"><i class="fa-regular fa-clock"></i> ${daysText}</span>
            </div>
            <button class="btn btn-delete" style="background:transparent; color:var(--text-muted); padding:0;"><i class="fa-solid fa-trash"></i></button>
          </div>
          
          <div style="background: var(--btn-secondary-bg); height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 1rem; box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);">
            <div style="width: ${goal.progress}%; background: ${barColor}; height: 100%; transition: width 1s ease-in-out, background 0.5s;"></div>
          </div>
          
          <div class="flex justify-between items-center">
            <div style="flex:1;">
              <input type="range" min="0" max="100" value="${goal.progress}" class="progress-slider" style="width: 80%;" ${goal.completed ? 'disabled' : ''}>
              <span style="font-size: 0.9rem; font-weight:bold; margin-left:10px;" class="progress-text">${goal.progress}%</span>
            </div>
            ${goal.completed ? 
              '<span style="color:var(--success-color); font-weight:bold;"><i class="fa-solid fa-trophy"></i></span>' : 
              '<button class="btn btn-primary btn-complete" style="padding: 0.3rem 0.8rem;"><i class="fa-solid fa-check"></i></button>'}
          </div>
        `;

        // Update progress via slider
        const slider = div.querySelector('.progress-slider');
        const pText = div.querySelector('.progress-text');
        
        if(slider) {
          slider.oninput = (e) => pText.textContent = e.target.value + '%';
          slider.onchange = async (e) => {
            const val = parseInt(e.target.value);
            const isCompleted = val === 100;
            if(isCompleted) confetti({ particleCount: 150, spread: 80 });
            await api.updateGoal(goal._id, { progress: val, completed: isCompleted });
            loadGoals();
          };
        }

        const compBtn = div.querySelector('.btn-complete');
        if(compBtn) {
          compBtn.onclick = async () => {
            confetti({ particleCount: 150, spread: 80 });
            await api.updateGoal(goal._id, { progress: 100, completed: true });
            loadGoals();
          };
        }

        div.querySelector('.btn-delete').onclick = async () => {
          if(await customConfirm("Are you sure you want to delete this goal?")) {
            api.deleteGoal(goal._id).then(() => {
              showToast('Goal deleted');
              loadGoals();
            });
          }
        };

        list.appendChild(div);
      });
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}
