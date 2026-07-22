const API_URL = '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(endpoint, method = 'GET', data = null) {
    const options = {
      method,
      headers: this.getHeaders()
    };
    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, options);
      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.setToken(null);
          window.location.href = '/index.html';
        }
        throw new Error(result.message || 'Something went wrong');
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Auth
  login(email, password) { return this.request('/auth/login', 'POST', { email, password }); }
  register(name, email, password) { return this.request('/auth/register', 'POST', { name, email, password }); }
  getProfile() { return this.request('/auth/profile'); }

  // Dashboard
  getDashboardSummary() { return this.request('/dashboard/summary'); }

  // Tasks
  getTasks() { return this.request('/tasks'); }
  createTask(task) { return this.request('/tasks', 'POST', task); }
  updateTask(id, task) { return this.request(`/tasks/${id}`, 'PUT', task); }
  deleteTask(id) { return this.request(`/tasks/${id}`, 'DELETE'); }

  // Expenses
  getExpenses() { return this.request('/expenses'); }
  createExpense(expense) { return this.request('/expenses', 'POST', expense); }
  deleteExpense(id) { return this.request(`/expenses/${id}`, 'DELETE'); }

  // Goals
  getGoals() { return this.request('/goals'); }
  createGoal(goal) { return this.request('/goals', 'POST', goal); }
  updateGoal(id, goal) { return this.request(`/goals/${id}`, 'PUT', goal); }

  // Habits
  getHabits() { return this.request('/habits'); }
  createHabit(habit) { return this.request('/habits', 'POST', habit); }
  updateHabit(id, habit) { return this.request(`/habits/${id}`, 'PUT', habit); }

  // Notes
  getNotes() { return this.request('/notes'); }
  createNote(note) { return this.request('/notes', 'POST', note); }
  updateNote(id, note) { return this.request(`/notes/${id}`, 'PUT', note); }
  deleteNote(id) { return this.request(`/notes/${id}`, 'DELETE'); }

  // Settings
  getSettings() { return this.request('/settings'); }
  updateSettings(settings) { return this.request('/settings', 'PUT', settings); }
}

export const api = new ApiService();
