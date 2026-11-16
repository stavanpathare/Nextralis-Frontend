/* ============================================
   INACTIVITY SESSION MANAGER
   ============================================ */

class SessionManager {
  constructor() {
    this.timeoutMs = CONFIG.SESSION_INACTIVITY_MS;
    this.persistThrottleMs = 1000;
    this.activitySyncThrottleMs = 60 * 1000;
    this.lastActivity = 0;
    this.lastPersistedActivity = 0;
    this.lastSyncedActivity = 0;
    this.timer = null;
    this.activitySyncTimer = null;
    this.started = false;
    this.loggingOut = false;
    this.boundHandlers = [];
    this.channel = null;
  }

  init() {
    if (this.started) return;
    if (!authManager.isAuthenticated()) {
      const protectedPages = [
        'dashboard.html',
        'voice-interview.html',
        'resume-analysis.html',
        'profile.html',
        'interview-results.html',
      ];
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      if (protectedPages.includes(currentPage)) window.location.href = 'login.html';
      return;
    }
    this.started = true;
    window.sessionManager = this;
    this.channel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('nextralis-auth')
      : null;

    const storedActivity = Number(localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_ACTIVITY));
    this.lastActivity = Number.isFinite(storedActivity) && storedActivity > 0
      ? storedActivity
      : Date.now();
    this.persistActivity(true);

    this.addActivityListener('mousemove', this.throttledMouseMove.bind(this));
    ['mousedown', 'click', 'keydown', 'scroll', 'touchstart', 'pointerdown']
      .forEach((eventName) => this.addActivityListener(eventName, this.handleActivity.bind(this)));

    ['visibilitychange', 'focus', 'pageshow'].forEach((eventName) => {
      this.addActivityListener(eventName, this.checkDeadline.bind(this));
    });
    this.addActivityListener('storage', this.handleStorageEvent.bind(this), window);

    if (this.channel) {
      this.channel.addEventListener('message', (event) => {
        if (event.data?.type === 'logout') this.handleRemoteLogout(event.data.message);
      });
    }

    this.scheduleTimeout();
    this.checkDeadline();
  }

  addActivityListener(eventName, handler, target = document) {
    target.addEventListener(eventName, handler, { passive: true });
    this.boundHandlers.push(() => target.removeEventListener(eventName, handler));
  }

  throttledMouseMove() {
    const now = Date.now();
    if (now - this.lastActivity >= 1000) this.handleActivity();
  }

  handleActivity() {
    if (!this.started || this.loggingOut) return;
    this.lastActivity = Date.now();
    this.persistActivity();
    this.scheduleTimeout();

    if (this.lastActivity - this.lastSyncedActivity >= this.activitySyncThrottleMs) {
      this.lastSyncedActivity = this.lastActivity;
      clearTimeout(this.activitySyncTimer);
      this.activitySyncTimer = setTimeout(() => this.syncActivity(), 0);
    }
  }

  persistActivity(force = false) {
    if (!force && this.lastActivity - this.lastPersistedActivity < this.persistThrottleMs) return;
    localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_ACTIVITY, String(this.lastActivity));
    this.lastPersistedActivity = this.lastActivity;
  }

  async syncActivity() {
    if (!this.started || this.loggingOut || !authManager.isAuthenticated()) return;
    const response = await api.recordActivity();
    if (response?.error && !this.loggingOut) this.checkDeadline();
  }

  scheduleTimeout() {
    clearTimeout(this.timer);
    const remaining = Math.max(0, this.lastActivity + this.timeoutMs - Date.now());
    this.timer = setTimeout(() => this.checkDeadline(), remaining);
  }

  checkDeadline() {
    if (!this.started || this.loggingOut) return;
    if (Date.now() - this.lastActivity >= this.timeoutMs) {
      this.logoutForInactivity();
    } else {
      this.scheduleTimeout();
    }
  }

  async logoutForInactivity() {
    if (this.loggingOut) return;
    this.loggingOut = true;
    const message = 'You have been logged out due to inactivity. Please log in again.';
    this.broadcastLogout(message);
    try {
      await authManager.logout();
    } finally {
      this.redirectToLogin(message);
    }
  }

  handleUnauthorized() {
    if (this.loggingOut) return;
    this.loggingOut = true;
    this.persistLogoutEvent('Your session has expired. Please log in again.');
    this.stop();
  }

  handleRemoteLogout(message) {
    if (this.loggingOut) return;
    this.loggingOut = true;
    authManager.logout({ callServer: false }).finally(() => this.redirectToLogin(message));
  }

  handleStorageEvent(event) {
    if (event.key === CONFIG.STORAGE_KEYS.TOKEN && !event.newValue) {
      this.handleRemoteLogout('You have been logged out. Please log in again.');
      return;
    }
    if (event.key === CONFIG.STORAGE_KEYS.SESSION_EVENT && event.newValue) {
      try {
        const payload = JSON.parse(event.newValue);
        this.handleRemoteLogout(payload.message);
      } catch (error) {
        console.warn('[session] invalid cross-tab event', error);
      }
    }
    if (event.key === CONFIG.STORAGE_KEYS.LAST_ACTIVITY && event.newValue) {
      const nextActivity = Number(event.newValue);
      if (nextActivity > this.lastActivity) {
        this.lastActivity = nextActivity;
        this.scheduleTimeout();
      }
    }
  }

  persistLogoutEvent(message) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION_EVENT, JSON.stringify({
      type: 'logout',
      message,
      at: Date.now(),
    }));
  }

  broadcastLogout(message) {
    this.persistLogoutEvent(message);
    this.channel?.postMessage({ type: 'logout', message });
  }

  redirectToLogin(message) {
    sessionStorage.setItem('auth_logout_message', message);
    if (!window.location.pathname.endsWith('login.html')) window.location.href = 'login.html';
  }

  stop() {
    clearTimeout(this.timer);
    clearTimeout(this.activitySyncTimer);
    this.boundHandlers.splice(0).forEach((remove) => remove());
    this.channel?.close();
    this.started = false;
  }
}

window.sessionManager = new SessionManager();
window.sessionManager.init();

if (typeof module !== 'undefined' && module.exports) module.exports = SessionManager;