/* Only handles light/dark theme toggle */
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const mobileToggleBtn = document.getElementById('mobile-theme-toggle-btn');
  const logo = document.getElementById('logo-img');

  const applyColorTheme = () => {
    const color = localStorage.getItem('colorTheme') || 'default';
    const suffix = isDark() ? 'dark' : 'light';
    body.setAttribute('data-theme', `${color}-${suffix}`);
  };

  const isDark = () => localStorage.getItem('theme') !== 'light';

  const updateToggleIcons = () => {
    if (toggleBtn) toggleBtn.innerHTML = `<i class="fas fa-${isDark() ? 'sun' : 'moon'}"></i>`;
    if (mobileToggleBtn) mobileToggleBtn.innerHTML = `<i class="fas fa-${isDark() ? 'sun' : 'moon'}"></i>`;
  };

  const refreshLogo = () => {
    const theme = localStorage.getItem('colorTheme') || 'default';
    const suffix = isDark() ? 'dark' : 'light';
    logo.src = `images/logo-${theme}${suffix}.png`;
  };

  const toggleTheme = () => {
    localStorage.setItem('theme', isDark() ? 'light' : 'dark');
    updateToggleIcons();
    refreshLogo();
    body.classList.toggle('light-mode', !isDark());
    applyColorTheme();
  };

  toggleBtn?.addEventListener('click', toggleTheme);
  mobileToggleBtn?.addEventListener('click', toggleTheme);

  // Initialize
  updateToggleIcons();
  refreshLogo();
  body.classList.toggle('light-mode', !isDark());
  applyColorTheme();

  // Expose to global for other modules
  window.applyColorTheme = applyColorTheme;
});
