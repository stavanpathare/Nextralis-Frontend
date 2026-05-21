/* ============================================
   AUTHENTICATION MODULE
   ============================================ */

class AuthManager {
  constructor() {
    this.user = this.loadUser();
    this.token = api.getToken();
  }

  /**
   * Load user from localStorage
   */
  loadUser() {
    const userJson = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch (err) {
      console.warn('Invalid user JSON in localStorage, clearing corrupt data.', err);
      try {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
      } catch (e) {
        // ignore
      }
      return null;
    }
  }

  /**
   * Sanitize user data before storing
   */
  sanitizeUserData(user) {
    if (!user || typeof user !== 'object') return user;
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.passwordHash;
    return sanitized;
  }

  /**
   * Save user to localStorage
   */
  saveUser(user) {
    const sanitizedUser = this.sanitizeUserData(user) || {};
    this.user = sanitizedUser;
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(sanitizedUser));
  }

  /**
   * Normalize auth response payloads across backend shapes
   */
  normalizeAuthResponse(response) {
    const payload = response?.data || response || {};
    const token = payload.token || payload.accessToken || payload.access_token || payload.authToken || payload.sessionToken;
    const user = payload.user || payload.userData || payload.userInfo || payload.profile || payload;
    return { token, user };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.token && this.user !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Get user name
   */
  getUserName() {
    return this.user?.name || 'User';
  }

  /**
   * Get user email
   */
  getUserEmail() {
    return this.user?.email || '';
  }

  /**
   * Get user avatar initials
   */
  getAvatarInitials() {
    const name = this.getUserName();
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /**
   * Login user
   */
  async login(email, password) {
    try {
      const response = await api.login(email, password);

      if (response.error) {
        return { success: false, error: response.error };
      }

      const { token, user } = this.normalizeAuthResponse(response);
      if (!token) {
        return { success: false, error: 'No authentication token returned from server' };
      }

      api.setToken(token);
      this.saveUser(user);
      this.token = token;
      return { success: true, data: response };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  }

  /**
   * Register user
   */
  async register(name, email, password) {
    try {
      const response = await api.register(name, email, password);

      if (response.error) {
        return { success: false, error: response.error };
      }

      const { token, user } = this.normalizeAuthResponse(response);
      if (!token) {
        return { success: false, error: 'No authentication token returned from server' };
      }

      api.setToken(token);
      this.saveUser(user);
      this.token = token;

      return { success: true, data: response };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message || 'Registration failed' };
    }
  }

  /**
   * Logout user
   */
  logout() {
    api.setToken(null);
    this.user = null;
    this.token = null;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
  }

  /**
   * Verify current token
   */
  async verifyToken() {
    try {
      const response = await api.verifyToken();
      if (response.error) {
        this.logout();
        return false;
      }
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    const strength = {
      score: 0,
      level: 'weak',
      feedback: [],
    };

    if (password.length >= 8) strength.score++;
    else strength.feedback.push('Password should be at least 8 characters');

    if (password.length >= 12) strength.score++;

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength.score++;
    else strength.feedback.push('Use both uppercase and lowercase letters');

    if (/[0-9]/.test(password)) strength.score++;
    else strength.feedback.push('Add numbers to your password');

    if (/[^a-zA-Z0-9]/.test(password)) strength.score++;
    else strength.feedback.push('Add special characters for more security');

    // Determine level
    if (strength.score === 0 || strength.score === 1)
      strength.level = 'weak';
    else if (strength.score === 2 || strength.score === 3)
      strength.level = 'medium';
    else strength.level = 'strong';

    return strength;
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  /**
   * Validate form inputs
   */
  validateLoginForm(email, password) {
    const errors = {};

    if (!email) {
      errors.email = 'Email is required';
    } else if (!this.validateEmail(email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Validate registration form
   */
  validateRegisterForm(name, email, password, confirmPassword) {
    const errors = {};

    if (!name) {
      errors.name = 'Name is required';
    } else if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!email) {
      errors.email = 'Email is required';
    } else if (!this.validateEmail(email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match';
    }

    const strength = this.validatePasswordStrength(password);
    if (strength.level === 'weak') {
      errors.passwordStrength = 'Password is too weak. ' + strength.feedback.join(' ');
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission) {
    if (!this.user) return false;
    if (!this.user.permissions) return false;
    return this.user.permissions.includes(permission);
  }

  /**
   * Get user role
   */
  getUserRole() {
    return this.user?.role || 'user';
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.getUserRole() === 'admin';
  }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthManager, authManager };
}
