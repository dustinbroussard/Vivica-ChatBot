document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const mobileToggleBtn = document.getElementById('mobile-theme-toggle-btn');
  const logo = document.getElementById('logo-img');

  const isDark = () => localStorage.getItem('theme') !== 'light';

  const updateToggleIcons = () => {
    if (toggleBtn) toggleBtn.innerHTML = `<i class="fas fa-${isDark() ? 'sun' : 'moon'}"></i>`;
    if (mobileToggleBtn) mobileToggleBtn.innerHTML = `<i class="fas fa-${isDark() ? 'sun' : 'moon'}"></i>`;
  };

  export const applyTheme = () => {
    updateToggleIcons();
    if (isDark()) {
      body.classList.remove('light-mode');
      logo.src = 'images/logo.png';
    } else {
      body.classList.add('light-mode');
      logo.src = 'images/logo2.png';
    }
  };

  const toggleTheme = () => {
    localStorage.setItem('theme', isDark() ? 'light' : 'dark');
    applyTheme();
  };

  toggleBtn?.addEventListener('click', toggleTheme);
  mobileToggleBtn?.addEventListener('click', toggleTheme);

  applyTheme(); // On load
});
