import { api } from './api.js';
import { showToast } from './components/ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to app
  if (api.token) {
    window.location.href = '/app.html';
    return;
  }

  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('login-form');
  const formRegister = document.getElementById('register-form');

  // Toggle Tabs
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.add('active');
    formRegister.classList.remove('active');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.add('active');
    formLogin.classList.remove('active');
  });

  // Login Handle
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = '';

    try {
      const res = await api.login(email, password);
      if (res.success) {
        api.setToken(res.token);
        showToast('Login successful!');
        setTimeout(() => window.location.href = '/app.html', 1000);
      }
    } catch (error) {
      errorDiv.textContent = error.message || 'Invalid email or password.';
      showToast(error.message, 'error');
    }
  });

  // Register Handle
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const errorDiv = document.getElementById('reg-error');
    errorDiv.textContent = '';

    try {
      const res = await api.register(name, email, password);
      if (res.success) {
        api.setToken(res.token);
        showToast('Registration successful!');
        setTimeout(() => window.location.href = '/app.html', 1000);
      }
    } catch (error) {
      errorDiv.textContent = error.message || 'Registration failed.';
      showToast(error.message, 'error');
    }
  });
});
