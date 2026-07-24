export const showToast = (message, type = 'success') => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-circle-exclamation';
  if (type === 'warning') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

export const customPrompt = (title, placeholder = '') => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'modal-content custom-prompt-modal';
    
    content.innerHTML = `
      <h3 style="margin-bottom: 1rem; color: var(--text-main); font-weight: 600; font-size: 1.25rem;">${title}</h3>
      <div class="form-group" style="margin-bottom: 1.5rem;">
        <input type="text" class="form-control prompt-input" value="${placeholder}" autocomplete="off" style="width: 100%; border-radius: 8px;" />
      </div>
      <div class="flex gap-2 justify-end">
        <button class="btn btn-secondary prompt-cancel">Cancel</button>
        <button class="btn btn-primary prompt-submit">Submit</button>
      </div>
    `;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    void overlay.offsetWidth;
    overlay.classList.add('active');
    
    const input = content.querySelector('.prompt-input');
    input.focus();
    
    const cleanup = () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    };
    
    content.querySelector('.prompt-cancel').onclick = () => {
      cleanup();
      resolve(null);
    };
    
    content.querySelector('.prompt-submit').onclick = () => {
      cleanup();
      resolve(input.value);
    };
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        cleanup();
        resolve(input.value);
      }
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    });
  });
};

export const customAlert = (message) => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'modal-content custom-prompt-modal';
    
    content.innerHTML = `
      <h3 style="margin-bottom: 1.5rem; color: var(--text-main); font-weight: 600; font-size: 1.2rem;">${message}</h3>
      <div class="flex gap-2 justify-end">
        <button class="btn btn-primary alert-ok">OK</button>
      </div>
    `;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    void overlay.offsetWidth;
    overlay.classList.add('active');
    
    const btn = content.querySelector('.alert-ok');
    btn.focus();
    
    const cleanup = () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
      resolve(true);
    };
    
    btn.onclick = cleanup;
  });
};

export const customConfirm = (message) => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'modal-content custom-prompt-modal';
    
    content.innerHTML = `
      <h3 style="margin-bottom: 1.5rem; color: var(--text-main); font-weight: 600; font-size: 1.2rem;">${message}</h3>
      <div class="flex gap-2 justify-end">
        <button class="btn btn-secondary confirm-cancel">Cancel</button>
        <button class="btn btn-danger confirm-ok">Confirm</button>
      </div>
    `;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    void overlay.offsetWidth;
    overlay.classList.add('active');
    
    const cleanup = (result) => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
      resolve(result);
    };
    
    content.querySelector('.confirm-cancel').onclick = () => cleanup(false);
    content.querySelector('.confirm-ok').onclick = () => cleanup(true);
  });
};

window.showToast = showToast;
window.customPrompt = customPrompt;
window.customAlert = customAlert;
window.customConfirm = customConfirm;
