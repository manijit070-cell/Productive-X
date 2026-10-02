import { api } from './api.js';
import { showToast } from './components/ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to app
  if (api.token) {
    window.location.href = '/app.html';
    return;
  }

  const formRequestOtp = document.getElementById('request-otp-form');
  const formVerifyOtp = document.getElementById('verify-otp-form');
  
  let currentEmail = '';

  // Step 1: Request OTP
  formRequestOtp.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const errorDiv = document.getElementById('login-error');
    const btn = document.getElementById('btn-request-otp');
    
    errorDiv.textContent = '';
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
      const res = await api.sendOtp(email);
      if (res.success) {
        currentEmail = email;
        showToast('Login code sent to your email!');
        
        // Switch views
        formRequestOtp.classList.remove('active');
        formVerifyOtp.classList.add('active');
        
        // Focus OTP input
        setTimeout(() => document.getElementById('login-otp').focus(), 100);
      }
    } catch (error) {
      errorDiv.textContent = error.message || 'Error sending login code.';
      showToast(error.message, 'error');
    } finally {
      btn.innerHTML = '<i class="fa-solid fa-envelope"></i> Send Login Code';
      btn.disabled = false;
    }
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
      const res = await api.verifyOtp(currentEmail, otp);
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
      
      btn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Verify & Login';
      btn.disabled = false;
    }
  });
});
