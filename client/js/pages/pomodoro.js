let timerInterval;
let workMinutes = 25;
let breakMinutes = 5;
let timeLeft = workMinutes * 60;
let isRunning = false;
let mode = 'work'; // work or break
let totalSessions = 0;

export function initPomodoro() {
  document.getElementById('pomodoro-start').onclick = toggleTimer;
  document.getElementById('pomodoro-reset').onclick = resetTimer;
  document.getElementById('pomodoro-mode').onclick = toggleMode;
  
  // Customization
  document.getElementById('pomodoro-display').ondblclick = () => {
    if(isRunning) return;
    const custom = parseInt(prompt("Enter minutes for this session:", mode==='work' ? workMinutes : breakMinutes));
    if(!isNaN(custom) && custom > 0) {
      if(mode==='work') workMinutes = custom; else breakMinutes = custom;
      timeLeft = custom * 60;
      updateDisplay();
    }
  };

  updateDisplay();
  renderSessions();
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
  isRunning = false;
  timeLeft = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  document.getElementById('pomodoro-start').innerHTML = '<i class="fa-solid fa-play"></i> Start';
  updateDisplay();
}

function toggleMode() {
  mode = mode === 'work' ? 'break' : 'work';
  document.getElementById('pomodoro-mode').innerHTML = mode === 'work' ? 'Switch to Break' : 'Switch to Work';
  document.getElementById('pomodoro-mode-text').textContent = mode === 'work' ? 'Focus Session' : 'Break Time';
  
  const circle = document.getElementById('pomodoro-circle');
  circle.style.stroke = mode === 'work' ? 'var(--primary-color)' : 'var(--success-color)';
  
  resetTimer();
}

function tick() {
  if (timeLeft > 0) {
    timeLeft--;
    updateDisplay();
  } else {
    clearInterval(timerInterval);
    isRunning = false;
    
    // Play sound (using a simple web audio beep since we don't have assets)
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.start();
    setTimeout(() => osc.stop(), 500);

    if (mode === 'work') {
      totalSessions++;
      renderSessions();
      alert('Focus session complete! Great job!');
    } else {
      alert('Break over! Back to work.');
    }
    toggleMode();
  }
}

function updateDisplay() {
  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  document.getElementById('pomodoro-display').textContent = `${m}:${s}`;

  // Update SVG Circle
  const total = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  const progress = timeLeft / total;
  const circumference = 2 * Math.PI * 90; // 565.48
  const offset = circumference - (progress * circumference);
  
  const circle = document.getElementById('pomodoro-circle');
  if(circle) {
    circle.style.strokeDashoffset = offset;
  }
}

function renderSessions() {
  const container = document.getElementById('pomodoro-sessions');
  if(!container) return;
  container.innerHTML = '';
  for(let i = 0; i < totalSessions; i++) {
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-apple-whole'; // closest to tomato in standard FA free
    icon.style.color = 'var(--danger-color)';
    icon.style.fontSize = '1.2rem';
    icon.title = 'Completed Session';
    container.appendChild(icon);
  }
  if(totalSessions === 0) {
    container.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted);">No sessions yet today</span>';
  }
}
