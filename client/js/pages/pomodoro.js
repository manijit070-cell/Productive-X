import { customAlert, showToast } from '../components/ui.js';

let timerInterval;
let workMinutes = 25;
let breakMinutes = 5;
let timeLeft = 0;
let isRunning = false;
let mode = 'work'; // work or break
let history = []; // { timestamp, duration }

export function initPomodoro() {
  loadSettings();
  loadHistory();

  document.getElementById('pomodoro-start').onclick = toggleTimer;
  document.getElementById('pomodoro-reset').onclick = resetTimer;
  document.getElementById('pomodoro-mode').onclick = toggleMode;
  
  // AI Event Listener
  window.addEventListener('ai_start_pomodoro', (e) => {
    workMinutes = e.detail.minutes || 25;
    mode = 'work';
    
    // update DOM
    document.getElementById('pomodoro-mode').innerHTML = 'Switch to Break';
    document.getElementById('pomodoro-mode-text').textContent = 'Focus Session';
    const circle = document.getElementById('pomodoro-circle');
    if (circle) circle.style.stroke = 'var(--primary-color)';
    
    // reset timer logic
    clearInterval(timerInterval);
    isRunning = false;
    timeLeft = workMinutes * 60;
    updateDisplay();
    
    // start it
    toggleTimer();
  });
  
  // Settings Logic
  const settingsBtn = document.getElementById('pomodoro-settings-btn');
  const settingsPanel = document.getElementById('pomodoro-settings-panel');
  const saveBtn = document.getElementById('pomodoro-save-settings');
  
  if (settingsBtn) {
    settingsBtn.onclick = () => {
      settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    };
  }

  if (saveBtn) {
    saveBtn.onclick = () => {
      const focusVal = parseInt(document.getElementById('pomo-focus-input').value);
      const breakVal = parseInt(document.getElementById('pomo-break-input').value);
      if (!isNaN(focusVal) && focusVal > 0) workMinutes = focusVal;
      if (!isNaN(breakVal) && breakVal > 0) breakMinutes = breakVal;
      
      saveSettings();
      settingsPanel.style.display = 'none';
      showToast('Settings saved');
      
      if (!isRunning) {
        timeLeft = (mode === 'work' ? workMinutes : breakMinutes) * 60;
        updateDisplay();
      }
    };
  }

  timeLeft = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  updateDisplay();
  renderHistory();
}

function loadSettings() {
  const stored = localStorage.getItem('pomoSettings');
  if (stored) {
    const s = JSON.parse(stored);
    if(s.work) workMinutes = s.work;
    if(s.break) breakMinutes = s.break;
    const focusInp = document.getElementById('pomo-focus-input');
    const breakInp = document.getElementById('pomo-break-input');
    if (focusInp) focusInp.value = workMinutes;
    if (breakInp) breakInp.value = breakMinutes;
  }
}

function saveSettings() {
  localStorage.setItem('pomoSettings', JSON.stringify({ work: workMinutes, break: breakMinutes }));
}

function loadHistory() {
  const stored = localStorage.getItem('pomoHistory');
  if (stored) {
    let parsed = JSON.parse(stored);
    // Filter out older than 24 hours
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    history = parsed.filter(h => h.timestamp >= cutoff);
    saveHistory(); // save the cleaned up version
  }
}

function saveHistory() {
  localStorage.setItem('pomoHistory', JSON.stringify(history));
}

function recordSession() {
  if (mode !== 'work') return;
  const totalSeconds = workMinutes * 60;
  const elapsedSeconds = totalSeconds - timeLeft;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes > 0) {
    history.push({
      timestamp: Date.now(),
      duration: elapsedMinutes
    });
    saveHistory();
    renderHistory();
  }
}

function toggleTimer() {
  const btn = document.getElementById('pomodoro-start');
  if (isRunning) {
    clearInterval(timerInterval);
    btn.innerHTML = '<i class="fa-solid fa-play"></i> Start';
  } else {
    timerInterval = setInterval(tick, 1000);
    btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
  }
  isRunning = !isRunning;
}

function resetTimer() {
  clearInterval(timerInterval);
  if (isRunning || timeLeft < (mode === 'work' ? workMinutes * 60 : breakMinutes * 60)) {
    // Record elapsed time if reset happens mid-session
    recordSession();
  }
  
  isRunning = false;
  timeLeft = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  document.getElementById('pomodoro-start').innerHTML = '<i class="fa-solid fa-play"></i> Start';
  updateDisplay();
}

function toggleMode() {
  if (isRunning || timeLeft < (mode === 'work' ? workMinutes * 60 : breakMinutes * 60)) {
    recordSession();
  }
  
  mode = mode === 'work' ? 'break' : 'work';
  document.getElementById('pomodoro-mode').innerHTML = mode === 'work' ? 'Switch to Break' : 'Switch to Work';
  document.getElementById('pomodoro-mode-text').textContent = mode === 'work' ? 'Focus Session' : 'Break Time';
  
  const circle = document.getElementById('pomodoro-circle');
  circle.style.stroke = mode === 'work' ? 'var(--primary-color)' : 'var(--success-color)';
  
  clearInterval(timerInterval);
  isRunning = false;
  timeLeft = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  document.getElementById('pomodoro-start').innerHTML = '<i class="fa-solid fa-play"></i> Start';
  updateDisplay();
}

function tick() {
  if (timeLeft > 0) {
    timeLeft--;
    updateDisplay();
  } else {
    clearInterval(timerInterval);
    isRunning = false;
    
    // Play sound
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.start();
    setTimeout(() => osc.stop(), 500);

    if (mode === 'work') {
      recordSession(); // Will record the full duration
      customAlert('Focus session complete! Great job!');
    } else {
      customAlert('Break over! Back to work.');
    }
    toggleMode(); // This sets it to the other mode and resets timer
  }
}

function updateDisplay() {
  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  document.getElementById('pomodoro-display').textContent = `${m}:${s}`;

  const total = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  const progress = timeLeft / total;
  const circumference = 2 * Math.PI * 90; 
  const offset = circumference - (progress * circumference);
  
  const circle = document.getElementById('pomodoro-circle');
  if(circle) {
    circle.style.strokeDashoffset = offset;
  }
}

function renderHistory() {
  const container = document.getElementById('pomodoro-sessions');
  const totalDisplay = document.getElementById('pomodoro-total-time');
  if(!container || !totalDisplay) return;
  
  container.innerHTML = '';
  
  let totalMin = 0;
  
  // Sort history newest first
  const sorted = [...history].sort((a,b) => b.timestamp - a.timestamp);
  
  sorted.forEach(h => {
    totalMin += h.duration;
    
    const d = new Date(h.timestamp);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.padding = '8px 12px';
    item.style.background = 'var(--btn-secondary-bg)';
    item.style.borderRadius = '6px';
    
    item.innerHTML = `
      <span style="color: var(--text-muted); font-size: 0.9rem;">${timeStr}</span>
      <span style="color: var(--text-main); font-weight: 500;">+${h.duration}m</span>
    `;
    
    container.appendChild(item);
  });
  
  if (sorted.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; margin-top: 1rem;">No focus sessions yet</div>';
  }
  
  totalDisplay.textContent = `${totalMin}m Focused`;
}
