// Client dashboard charts initialization
let taskChartInstance = null;
let expenseChartInstance = null;
let lastTaskData = null;
let lastExpenseData = null;

function getThemeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

export function initCharts(taskData = lastTaskData, expenseData = lastExpenseData) {
  if (!taskData || !expenseData) return;
  lastTaskData = taskData;
  lastExpenseData = expenseData;
  
  const tCtx = document.getElementById('taskChart');
  const eCtx = document.getElementById('expenseChart');
  
  if(tCtx && eCtx) {
    if(taskChartInstance) taskChartInstance.destroy();
    if(expenseChartInstance) expenseChartInstance.destroy();

    taskChartInstance = new Chart(tCtx, {
      type: 'doughnut',
      data: {
        labels: ['To Do', 'In Progress', 'Completed'],
        datasets: [{
          data: taskData,
          backgroundColor: ['#3B82F6', '#F59E0B', '#22C55E'],
          borderWidth: 0,
          borderRadius: 12,
          spacing: 5,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: getThemeColor('--text-main'), font: { family: "'Poppins', sans-serif" } } },
          tooltip: {
            backgroundColor: getThemeColor('--chart-tooltip-bg'),
            titleColor: getThemeColor('--text-main'),
            bodyColor: getThemeColor('--text-main'),
            borderColor: getThemeColor('--card-border'),
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8
          }
        },
        cutout: '80%'
      }
    });

    expenseChartInstance = new Chart(eCtx, {
      type: 'doughnut',
      data: {
        labels: ['Income', 'Expense'],
        datasets: [{
          data: expenseData,
          backgroundColor: ['#22C55E', '#EF4444'],
          borderWidth: 0,
          borderRadius: 12,
          spacing: 5,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: getThemeColor('--text-main'), font: { family: "'Poppins', sans-serif" } } },
          tooltip: {
            backgroundColor: getThemeColor('--chart-tooltip-bg'),
            titleColor: getThemeColor('--text-main'),
            bodyColor: getThemeColor('--text-main'),
            borderColor: getThemeColor('--card-border'),
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8
          }
        },
        cutout: '80%'
      }
    });
  }
}

window.addEventListener('themeChanged', () => initCharts());
