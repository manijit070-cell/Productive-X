import { api } from './api.js';
import { showToast } from './components/ui.js';

document.addEventListener('DOMContentLoaded', () => {
  if (api.token) {
    window.location.href = '/app.html';
    return;
  }

  const tabsContainer = document.getElementById('auth-tabs-container');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  
  const formLogin = document.getElementById('login-form');
  const formRegister = document.getElementById('register-form');
  const formVerifyOtp = document.getElementById('verify-otp-form');
  const btnBack = document.getElementById('btn-back-to-email');
  
  let currentEmail = '';
  let currentName = '';
  let currentPassword = '';
  let activeTab = 'login'; // 'login' or 'register'

  // Tab Switching logic
  const showTab = (tab) => {
    activeTab = tab;
    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.classList.add('active');
      formRegister.classList.remove('active');
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formRegister.classList.add('active');
      formLogin.classList.remove('active');
    }
    formVerifyOtp.classList.remove('active');
    tabsContainer.style.display = 'flex';
  };

  tabLogin.addEventListener('click', () => showTab('login'));
  tabRegister.addEventListener('click', () => showTab('register'));

  btnBack.addEventListener('click', () => showTab(activeTab));

  // Common OTP Request Logic
  const handleOtpRequest = async (email, name, password, btnId, errorId) => {
    const errorDiv = document.getElementById(errorId);
    const btn = document.getElementById(btnId);
    const originalText = btn.innerHTML;
    
    errorDiv.textContent = '';
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
      const res = await api.sendOtp(email);
      if (res.success) {
        currentEmail = email;
        currentName = name; // Only set if coming from register tab
        currentPassword = password; // Only set if providing password

        showToast('Login code sent to your email!');
        
        // Hide tabs and initial forms, show OTP form
        tabsContainer.style.display = 'none';
        formLogin.classList.remove('active');
        formRegister.classList.remove('active');
        formVerifyOtp.classList.add('active');
        
        setTimeout(() => document.getElementById('login-otp').focus(), 100);
      }
    } catch (error) {
      errorDiv.textContent = error.message || 'Error sending login code.';
      showToast(error.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  };

  // Login Request (OTP)
  formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    handleOtpRequest(email, '', password, 'btn-login-request', 'login-error');
  });

  // Login Request (Password)
  document.getElementById('btn-login-password').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errorDiv = document.getElementById('login-error');
    const btn = document.getElementById('btn-login-password');
    
    if (!email || !password) {
      errorDiv.textContent = 'Please enter email and password.';
      return;
    }
    
    const originalText = btn.innerHTML;
    errorDiv.textContent = '';
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
    btn.disabled = true;

    try {
      const res = await api.loginWithPassword(email, password);
      if (res.success) {
        api.setToken(res.token);
        showToast('Login successful!');
        window.location.href = '/app.html';
      }
    } catch (error) {
      errorDiv.textContent = error.message || 'Invalid credentials.';
      showToast(error.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  // Register Request
  formRegister.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    handleOtpRequest(email, name, password, 'btn-reg-request', 'reg-error');
  });

  // Step 2: Verify OTP
  formVerifyOtp.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = document.getElementById('login-otp').value.trim();
    const errorDiv = document.getElementById('verify-error');
    const btn = document.getElementById('btn-verify-otp');
    
    errorDiv.textContent = '';
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
    btn.disabled = true;

    try {
      const res = await api.verifyOtp(currentEmail, otp, currentName, currentPassword);
      if (res.success) {
        api.setToken(res.token);
        showToast('Login successful!');
        
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Success!';
        btn.classList.add('btn-success');
        
        setTimeout(() => window.location.href = '/app.html', 1000);
      }
    } catch (error) {
      errorDiv.textContent = error.message || 'Invalid or expired code.';
      showToast(error.message, 'error');
      
      btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verify & Continue';
      btn.disabled = false;
    }
  });
});
