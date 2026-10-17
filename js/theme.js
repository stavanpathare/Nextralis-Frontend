(function () {
  const storageKey = 'nextralis-theme';
  const root = document.documentElement;

  function applyTheme(theme, persist) {
    root.dataset.theme = theme;

    if (persist) {
      try {
        localStorage.setItem(storageKey, theme);
      } catch (error) {
        console.error('Unable to save the theme preference.', error);
      }
    }

    const toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      const isDark = theme === 'dark';
      toggle.setAttribute('aria-pressed', String(isDark));
      toggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
      toggle.title = `Switch to ${isDark ? 'light' : 'dark'} mode`;
      toggle.querySelector('.theme-toggle-icon').textContent = isDark ? '☀' : '☾';
    }
  }

  let initialTheme = 'light';
  try {
    initialTheme = localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light';
  } catch (error) {
    console.error('Unable to read the saved theme preference.', error);
  }
  applyTheme(initialTheme, false);

  function addThemeToggle() {
    const brand = document.querySelector('.sidebar-logo, .navbar-logo, .auth-header h1');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'theme-toggle';
    toggle.dataset.themeToggle = '';
    toggle.innerHTML = '<span class="theme-toggle-icon" aria-hidden="true"></span>';
    toggle.addEventListener('click', () => {
      applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    });

    if (brand) {
      if (brand.matches('.navbar-logo')) {
        const brandGroup = document.createElement('div');
        brandGroup.className = 'brand-theme-group';
        brand.before(brandGroup);
        brandGroup.append(brand, toggle);
      } else {
        const brandElement = brand.closest('.auth-header a') || brand;
        brandElement.after(toggle);
      }
    } else {
      toggle.classList.add('theme-toggle-floating');
      document.body.appendChild(toggle);
    }

    applyTheme(root.dataset.theme || 'light', false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addThemeToggle, { once: true });
  } else {
    addThemeToggle();
  }
})();
