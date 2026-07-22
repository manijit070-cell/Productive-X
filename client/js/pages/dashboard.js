// Client dashboard charts initialization
let taskChartInstance = null;
let expenseChartInstance = null;

export function initCharts(taskData, expenseData) {
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
          borderWidth: 0
        }]
      },
      options: {
        plugins: {
          legend: { labels: { color: '#F8FAFC' } }
        }
      }
    });

    expenseChartInstance = new Chart(eCtx, {
      type: 'pie',
      data: {
        labels: ['Income', 'Expense'],
        datasets: [{
          data: expenseData,
          backgroundColor: ['#22C55E', '#EF4444'],
          borderWidth: 0
        }]
      },
      options: {
        plugins: {
          legend: { labels: { color: '#F8FAFC' } }
        }
      }
    });
  }
}
