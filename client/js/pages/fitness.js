import { api } from '../api.js';
import { showToast, customAlert } from '../components/ui.js';

let fitnessData = null;

export async function initFitness() {
  try {
    const res = await api.getFitnessProfile();
    if (res && res.success) {
      fitnessData = res.data;
      renderFitnessUI();
    }
  } catch (error) {
    console.error('Error loading fitness data:', error);
    showToast('Failed to load AI Fitness module', 'error');
  }

  // Bind Events
  document.getElementById('fitness-settings-btn').onclick = () => {
    document.getElementById('fitness-dashboard').style.display = 'none';
    document.getElementById('fitness-onboarding').style.display = 'block';
  };

  document.getElementById('btn-generate-plan').onclick = generatePlan;
  
  document.getElementById('btn-log-workout').onclick = async () => {
    try {
      const btn = document.getElementById('btn-log-workout');
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
      const res = await api.logFitnessProgress({ completedWorkout: true });
      if (res.success) {
        showToast('Workout completed! Great job!', 'success');
        fitnessData = res.data;
        renderFitnessUI();
      }
    } catch (e) {
      showToast('Error logging workout', 'error');
    }
  };

  document.getElementById('btn-log-calories').onclick = async () => {
    const calories = parseInt(document.getElementById('fit-log-calories').value);
    const protein = parseInt(document.getElementById('fit-log-protein').value);
    const carbs = parseInt(document.getElementById('fit-log-carbs').value);
    const fat = parseInt(document.getElementById('fit-log-fat').value);
    
    if (isNaN(calories) || calories <= 0) {
      showToast('Please enter valid calories', 'error');
      return;
    }
    
    try {
      const payload = { 
        caloriesConsumed: calories,
        proteinConsumed: isNaN(protein) ? undefined : protein,
        carbsConsumed: isNaN(carbs) ? undefined : carbs,
        fatConsumed: isNaN(fat) ? undefined : fat,
      };
      const res = await api.logFitnessProgress(payload);
      if (res.success) {
        showToast('Nutrition logged!');
        document.getElementById('fit-log-calories').value = '';
        document.getElementById('fit-log-protein').value = '';
        document.getElementById('fit-log-carbs').value = '';
        document.getElementById('fit-log-fat').value = '';
        fitnessData = res.data;
      }
    } catch (e) {
      showToast('Error logging nutrition', 'error');
    }
  };

  const fullPlanBtn = document.getElementById('btn-view-full-plan');
  if (fullPlanBtn) {
    fullPlanBtn.onclick = () => {
      const container = document.getElementById('full-plan-container');
      container.style.display = container.style.display === 'none' ? 'block' : 'none';
    };
  }
  
  window.addEventListener('ai_refresh_fitness', async () => {
    try {
      const res = await api.getFitnessProfile();
      if (res && res.success) {
        fitnessData = res.data;
        renderFitnessUI();
      }
    } catch(e) {
      console.error('Failed to refresh fitness data');
    }
  });
}

function renderFitnessUI() {
  const onboarding = document.getElementById('fitness-onboarding');
  const dashboard = document.getElementById('fitness-dashboard');
  
  if (!fitnessData.plan || !fitnessData.plan.workoutPlan) {
    // Show onboarding
    onboarding.style.display = 'block';
    dashboard.style.display = 'none';
    
    if (fitnessData.profile) {
      if (fitnessData.profile.weight) document.getElementById('fit-weight').value = fitnessData.profile.weight;
      if (fitnessData.profile.height) document.getElementById('fit-height').value = fitnessData.profile.height;
      if (fitnessData.profile.goal) document.getElementById('fit-goal').value = fitnessData.profile.goal;
      if (fitnessData.profile.fitnessLevel) document.getElementById('fit-level').value = fitnessData.profile.fitnessLevel;
      if (fitnessData.profile.environment) document.getElementById('fit-environment').value = fitnessData.profile.environment;
      if (fitnessData.profile.equipment) document.getElementById('fit-equipment').value = fitnessData.profile.equipment;
    }
  } else {
    // Show dashboard
    onboarding.style.display = 'none';
    dashboard.style.display = 'block';
    
    // Parse Nutrition
    const nutrition = fitnessData.plan.nutritionPlan;
    if (nutrition) {
      document.getElementById('fit-calories').textContent = `${nutrition.dailyCalories} kcal`;
      document.getElementById('fit-protein').textContent = `${nutrition.proteinGrams}g`;
      document.getElementById('fit-carbs').textContent = `${nutrition.carbsGrams}g`;
      document.getElementById('fit-fat').textContent = `${nutrition.fatGrams}g`;
    }
    
    // Parse Today's Workout
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];
    
    const workoutPlan = fitnessData.plan.workoutPlan;
    const todayWorkout = workoutPlan.find(w => w.day === todayName) || workoutPlan[0];
    
    document.getElementById('fit-today-focus').textContent = `${todayName}: ${todayWorkout.focus}`;
    
    const ul = document.getElementById('fit-today-exercises');
    ul.innerHTML = '';
    todayWorkout.exercises.forEach(ex => {
      const li = document.createElement('li');
      li.textContent = ex;
      ul.appendChild(li);
    });

    // Check if logged today
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayLog = fitnessData.logs.find(l => {
      const logDate = new Date(l.date);
      logDate.setHours(0,0,0,0);
      return logDate.getTime() === today.getTime();
    });

    const logBtn = document.getElementById('btn-log-workout');
    if (todayLog && todayLog.completedWorkout) {
      logBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Completed';
      logBtn.classList.remove('btn-secondary');
      logBtn.classList.add('btn-primary');
      logBtn.disabled = true;
    } else {
      logBtn.innerHTML = '<i class="fa-solid fa-check"></i> Mark Completed';
      logBtn.classList.add('btn-secondary');
      logBtn.classList.remove('btn-primary');
      logBtn.disabled = false;
    }

    // Render Full Plan
    const fullPlanContent = document.getElementById('full-plan-content');
    let planHtml = '<h3 style="margin-bottom: 1rem;">Your Weekly Plan</h3>';
    workoutPlan.forEach(day => {
      planHtml += `
        <div style="margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--card-border);">
          <strong style="color: var(--primary-color);">${day.day}</strong>: ${day.focus}
          <ul style="margin-top: 0.5rem; color: var(--text-muted); padding-left: 1rem; list-style: circle;">
            ${day.exercises.map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>
      `;
    });
    if (fullPlanContent) fullPlanContent.innerHTML = planHtml;
  }
}

async function generatePlan() {
  const weight = document.getElementById('fit-weight').value;
  const height = document.getElementById('fit-height').value;
  const goal = document.getElementById('fit-goal').value;
  const level = document.getElementById('fit-level').value;
  const env = document.getElementById('fit-environment').value;
  const equip = document.getElementById('fit-equipment').value;

  if (!weight || !height) {
    showToast('Please enter weight and height', 'error');
    return;
  }

  try {
    // 1. Update Profile
    const btn = document.getElementById('btn-generate-plan');
    const loading = document.getElementById('fitness-loading');
    
    btn.style.display = 'none';
    loading.style.display = 'block';

    await api.saveFitnessProfile({ 
      weight: Number(weight), 
      height: Number(height), 
      goal, 
      fitnessLevel: level,
      environment: env,
      equipment: equip
    });
    
    // 2. Generate Plan (takes a few seconds if using real AI)
    const res = await api.generateFitnessPlan();
    if (res.success) {
      fitnessData = res.data;
      renderFitnessUI();
      showToast('AI Plan generated successfully!', 'success');
    }
  } catch (error) {
    console.error(error);
    showToast('Failed to generate AI plan', 'error');
  } finally {
    document.getElementById('btn-generate-plan').style.display = 'block';
    document.getElementById('fitness-loading').style.display = 'none';
  }
}
