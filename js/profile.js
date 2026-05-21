/* ============================================
   PROFILE MODULE
   ============================================ */

class ProfileManager {
  constructor() {
    this.user = authManager.getCurrentUser();
    this.init();
  }

  async init() {
    // Check authentication
    if (!authManager.isAuthenticated()) {
      window.location.href = 'login.html';
      return;
    }

    this.setupEventListeners();
    await this.loadProfile();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Edit form
    const editBtn = document.getElementById('btn-edit-profile');
    const saveBtn = document.getElementById('btn-save-profile');
    const cancelBtn = document.getElementById('btn-cancel-profile');
    const profileForm = document.getElementById('profile-form');

    if (editBtn) {
      editBtn.addEventListener('click', () => this.enableEditMode());
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveProfile());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.disableEditMode());
    }

    // Logout button
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    // Change password
    const changePasswordBtn = document.getElementById('btn-change-password');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', () => this.showChangePasswordModal());
    }
  }

  /**
   * Load profile
   */
  sanitizeUserData(userData) {
    if (!userData || typeof userData !== 'object') return {};
    const sanitized = { ...userData };
    delete sanitized.password;
    delete sanitized.passwordHash;
    return sanitized;
  }

  normalizeProfileResponse(response) {
    if (!response || typeof response !== 'object') return {};
    return (
      response.user ||
      response.data ||
      response.profile ||
      response.userData ||
      response.userInfo ||
      response
    );
  }

  async loadProfile() {
    try {
      UIHelper.showLoading('Loading profile...');

      let userData = {};
      try {
        const response = await api.getProfile();
        if (response.error) {
          throw new Error(response.error);
        }
        userData = this.normalizeProfileResponse(response);
      } catch (error) {
        console.warn('Profile endpoint unavailable, using cached user data.', error);
        userData = authManager.getCurrentUser() || {};
      }

      userData = this.sanitizeUserData(userData);
      if (Object.keys(userData).length === 0) {
        userData = authManager.getCurrentUser() || {};
      }

      this.user = userData;
      authManager.saveUser(userData);
      this.displayProfile(userData);
      UIHelper.hideLoading();
    } catch (error) {
      console.error('Error loading profile:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to load profile');
    }
  }

  /**
   * Get avatar initials from a name
   */
  getAvatarInitials(name) {
    const normalizedName = name || authManager.getUserName();
    return normalizedName
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /**
   * Display profile
   */
  displayProfile(userData) {
    // Update display elements
    const profileCard = document.querySelector('.profile-card');
    if (profileCard) {
      const avatarContent = userData.profileImage
        ? `<img src="${userData.profileImage}" alt="${userData.name || 'User'}" />`
        : this.getAvatarInitials(userData.name);

      const planLabel = userData.subscriptionPlan
        ? `${userData.subscriptionPlan.charAt(0).toUpperCase()}${userData.subscriptionPlan.slice(1)} Plan`
        : 'Free Plan';

      profileCard.innerHTML = `
        <div class="profile-avatar">${avatarContent}</div>
        <div class="profile-info">
          <h2>${userData.name || 'User'}</h2>
          <p>${userData.email || ''}</p>
          <span class="badge badge-primary">${planLabel}</span>
        </div>
      `;
    }

    // Update form fields
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    const bioInput = document.getElementById('profile-bio');

    if (nameInput) nameInput.value = userData.name || '';
    if (emailInput) emailInput.value = userData.email || '';
    if (bioInput) bioInput.value = userData.bio || '';

    // Display stats
    this.displayStats(userData);
  }

  /**
   * Display stats
   */
  displayStats(userData) {
    const statsContainer = document.querySelector('.profile-stats');
    if (!statsContainer) return;

    const memberSince = userData.joinDate || userData.createdAt || null;
    const joinYear = memberSince ? new Date(memberSince).getFullYear() : 'N/A';

    statsContainer.innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${userData.totalResumes || 0}</div>
        <div class="stat-label">Resumes</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${userData.totalInterviews || 0}</div>
        <div class="stat-label">Interviews</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${Math.round(userData.averageScore || 0)}%</div>
        <div class="stat-label">Avg Score</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${joinYear}</div>
        <div class="stat-label">Member Since</div>
      </div>
    `;
  }

  /**
   * Enable edit mode
   */
  enableEditMode() {
    const formElements = document.querySelectorAll('#profile-form input, #profile-form textarea');
    formElements.forEach((element) => {
      element.removeAttribute('disabled');
    });

    const editBtn = document.getElementById('btn-edit-profile');
    const saveBtn = document.getElementById('btn-save-profile');
    const cancelBtn = document.getElementById('btn-cancel-profile');

    if (editBtn) editBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'inline-block';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
  }

  /**
   * Disable edit mode
   */
  disableEditMode() {
    const formElements = document.querySelectorAll('#profile-form input, #profile-form textarea');
    formElements.forEach((element) => {
      element.setAttribute('disabled', 'true');
    });

    const editBtn = document.getElementById('btn-edit-profile');
    const saveBtn = document.getElementById('btn-save-profile');
    const cancelBtn = document.getElementById('btn-cancel-profile');

    if (editBtn) editBtn.style.display = 'inline-block';
    if (saveBtn) saveBtn.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';

    this.loadProfile();
  }

  /**
   * Save profile
   */
  async saveProfile() {
    const nameInput = document.getElementById('profile-name');
    const bioInput = document.getElementById('profile-bio');

    const updateData = {
      name: nameInput?.value || '',
      bio: bioInput?.value || '',
    };

    try {
      UIHelper.showLoading('Saving profile...');

      const response = await api.updateProfile(updateData);

      if (response.error) {
        UIHelper.hideLoading();
        UIHelper.error(response.error);
        return;
      }

      UIHelper.hideLoading();
      UIHelper.success('Profile updated successfully!');

      const updatedUser = this.sanitizeUserData(response.user || response);
      authManager.saveUser(updatedUser);
      this.user = updatedUser;

      this.disableEditMode();
      this.displayProfile(updatedUser);
    } catch (error) {
      console.error('Error saving profile:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to save profile');
    }
  }

  /**
   * Show change password modal
   */
  showChangePasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Change Password</h3>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Current Password</label>
            <input type="password" id="current-password" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">New Password</label>
            <input type="password" id="new-password" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">Confirm Password</label>
            <input type="password" id="confirm-password" class="form-input" required />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" data-action="confirm">Change Password</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      this.handleChangePassword(modal);
    });
  }

  /**
   * Handle change password
   */
  async handleChangePassword(modal) {
    const currentPassword = modal.querySelector('#current-password').value;
    const newPassword = modal.querySelector('#new-password').value;
    const confirmPassword = modal.querySelector('#confirm-password').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      UIHelper.error('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      UIHelper.error('Passwords do not match');
      return;
    }

    const strength = authManager.validatePasswordStrength(newPassword);
    if (strength.level === 'weak') {
      UIHelper.error('Password is too weak');
      return;
    }

    try {
      UIHelper.showLoading('Changing password...');

      const response = await api.put('/user/change-password', {
        currentPassword,
        newPassword,
      });

      if (response.error) {
        UIHelper.hideLoading();
        UIHelper.error(response.error);
        return;
      }

      UIHelper.hideLoading();
      UIHelper.success('Password changed successfully!');
      modal.remove();
    } catch (error) {
      console.error('Error changing password:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to change password');
    }
  }

  /**
   * Logout
   */
  logout() {
    authManager.logout();
    window.location.href = 'login.html';
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
  });
} else {
  new ProfileManager();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProfileManager;
}
