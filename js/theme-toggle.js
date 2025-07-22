/* Only handles light/dark theme toggle */
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const mobileToggleBtn = document.getElementById('mobile-theme-toggle-btn');
  const themeSelect = document.getElementById("theme-select");
  const logo = document.getElementById('logo-img');

  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const applyColorTheme = () => {
    const color = localStorage.getItem('colorTheme') || 'default';
    const suffix = isDark() ? 'dark' : 'light';
    body.setAttribute('data-theme', `${color}-${suffix}`);
  };

  const isDark = () => {
    const stored = localStorage.getItem('theme');
    return stored ? stored !== 'light' : systemPrefersDark;
  };

  const updateToggleIcons = () => {
    if (toggleBtn) toggleBtn.innerHTML = `<i class="fas fa-${isDark() ? 'sun' : 'moon'}"></i>`;
    if (mobileToggleBtn) mobileToggleBtn.innerHTML = `<i class="fas fa-${isDark() ? 'sun' : 'moon'}"></i>`;
  };

  const refreshLogo = () => {
    const theme = localStorage.getItem('colorTheme') || 'default';
    const suffix = isDark() ? 'dark' : 'light';
    try {
      if (logo) {
        logo.src = `images/logo-${theme}${suffix}.png`;
      }
      const sidebarLogo = document.getElementById('sidebar-vivica-logo');
      if (sidebarLogo) {
        sidebarLogo.src = `images/logo-${theme}${suffix}.png`;
      }
    } catch (e) {
      console.debug('Logo element not found or could not be updated:', e);
    }
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

  themeSelect?.addEventListener("change", () => {
    localStorage.setItem("colorTheme", themeSelect.value);
    applyColorTheme();
    refreshLogo();
  });
  // Initialize
  updateToggleIcons();
  refreshLogo();
  body.classList.toggle('light-mode', !isDark());
  applyColorTheme();

  // Expose to global for other modules
  window.applyColorTheme = applyColorTheme;
});
