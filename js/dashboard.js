/* ============================================
   DASHBOARD MODULE
   ============================================ */

class Dashboard {
  constructor() {
    window.dashboard = this;
    this.init();
  }

  async init() {
    // Check authentication
    if (!authManager.isAuthenticated()) {
      // Attempt token-based recovery before forcing redirect
      const token = api.getToken();
      console.log('[dashboard] auth check failed; token from api:', token, 'localStorage token:', localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN), 'authManager.user:', authManager.getCurrentUser());
      if (token) {
        const valid = await authManager.verifyToken();
        if (!valid) {
          window.location.href = 'login.html';
          return;
        }
      } else {
        window.location.href = 'login.html';
        return;
      }
    }

    this.setupEventListeners();
    await this.loadDashboardData();
    this.setupUserMenu();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Quick action buttons
    const btnAnalyzeResume = document.getElementById('btn-analyze-resume');
    const btnStartInterview = document.getElementById('btn-start-interview');

    if (btnAnalyzeResume) {
      btnAnalyzeResume.addEventListener('click', () => {
        window.location.href = 'resume-analysis.html';
      });
    }

    if (btnStartInterview) {
      btnStartInterview.addEventListener('click', () => {
        window.location.href = 'voice-interview.html';
      });
    }

    // Sidebar navigation
    this.setupSidebarNavigation();

    // Search
    const searchInput = document.querySelector('.navbar-search input');
    if (searchInput) {
      searchInput.addEventListener(
        'input',
        UIHelper.debounce((e) => this.handleSearch(e.target.value), 300)
      );
    }
  }

  /**
   * Setup sidebar navigation
   */
  setupSidebarNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav-link');
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navLinks.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');

        const href = link.getAttribute('href');
        if (href) {
          window.location.href = href;
        }
      });
    });

    // Set active link based on current page
    const currentPath = window.location.pathname;
    navLinks.forEach((link) => {
      if (link.getAttribute('href').includes(currentPath)) {
        link.classList.add('active');
      }
    });
  }

  /**
   * Setup user menu
   */
  setupUserMenu() {
    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');

    if (userMenuButton && userDropdown) {
      userMenuButton.addEventListener('click', () => {
        userDropdown.classList.toggle('hidden');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu')) {
          userDropdown.classList.add('hidden');
        }
      });

      // Handle dropdown items
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.logout());
      }

      const profileLink = document.getElementById('profile-link');
      if (profileLink) {
        profileLink.addEventListener('click', () => {
          window.location.href = 'profile.html';
        });
      }
    }
  }

  /**
   * Load dashboard data
   */
  async loadDashboardData() {
    try {
      UIHelper.showLoading('Loading dashboard...');

      // Update user greeting
      const userName = authManager.getUserName();
      const userInitials = authManager.getAvatarInitials();

      const userGreeting = document.querySelector('.welcome-card h2');
      if (userGreeting) {
        userGreeting.textContent = `Welcome back, ${userName}!`;
      }

      const userAvatar = document.querySelector('.user-avatar');
      if (userAvatar) {
        userAvatar.textContent = userInitials;
      }

      // Load user stats
      let stats = { totalResumes: 0, totalInterviews: 0, averageScore: 0 };
      try {
        const endpoint = CONFIG.ENDPOINTS.GET_USER_STATS;
        const statsResponse = await api.getUserStats();
        console.log('[Dashboard API]', endpoint, statsResponse);
        stats = statsResponse?.data || stats;
      } catch (error) {
        console.error('[Dashboard API Error]', CONFIG.ENDPOINTS.GET_USER_STATS, error);
        console.warn('Could not load dashboard stats; using defaults.', error);
      }
      this.displayStats(stats);

      // Load resume history
      let resumeHistory = [];
      try {
        const endpoint = CONFIG.ENDPOINTS.GET_RESUME_HISTORY;
        const resumeResponse = await api.getResumeHistory();
        console.log('[Dashboard API]', endpoint, resumeResponse);
        resumeHistory = resumeResponse?.data || [];
      } catch (error) {
        console.error('[Dashboard API Error]', CONFIG.ENDPOINTS.GET_RESUME_HISTORY, error);
        console.warn('Could not load resume history; using empty list.', error);
      }
      this.displayResumeHistory(resumeHistory);

      // Load interview history
      let interviewHistory = [];
      try {
        const endpoint = CONFIG.ENDPOINTS.GET_INTERVIEW_HISTORY;
        const interviewResponse = await api.getInterviewHistory();
        console.log('[Dashboard API]', endpoint, interviewResponse);
        interviewHistory = interviewResponse?.data || [];
      } catch (error) {
        console.error('[Dashboard API Error]', CONFIG.ENDPOINTS.GET_INTERVIEW_HISTORY, error);
        console.warn('Could not load interview history; using empty list.', error);
      }
      this.displayInterviewHistory(interviewHistory);

      UIHelper.hideLoading();
    } catch (error) {
      console.error('Error loading dashboard:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to load dashboard data');
    }
  }

  /**
   * Display stats
   */
  displayStats(stats) {
    const statsContainer = document.querySelector('.dashboard-grid');
    if (!stats || !statsContainer) return;

    // Update stat cards if they exist
    const resumeCountElement = document.querySelector('[data-stat="resume-count"]');
    if (resumeCountElement) {
      resumeCountElement.textContent = stats.totalResumes || 0;
    }

    const interviewCountElement = document.querySelector('[data-stat="interview-count"]');
    if (interviewCountElement) {
      interviewCountElement.textContent = stats.totalInterviews || 0;
    }

    const averageScoreElement = document.querySelector('[data-stat="average-score"]');
    if (averageScoreElement) {
      averageScoreElement.textContent = Math.round(stats.averageScore || 0);
    }
  }

  /**
   * Display resume history
   */
  displayResumeHistory(resumeHistory) {
    const tbody = document.querySelector('.resume-history tbody');
    const resumes = Array.isArray(resumeHistory) ? resumeHistory : [];

    if (!tbody || resumes.length === 0) {
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No resumes yet</td></tr>';
      }
      return;
    }

    tbody.innerHTML = resumes
      .slice(0, 5)
      .map(
        (resume) => {
          const resumeId = resume.id || resume._id || resume.resumeId;
          return `
      <tr>
        <td>${resume.fileName || resume.name || 'Resume'}</td>
        <td>${UIHelper.formatDate(resume.uploadDate || resume.createdAt)}</td>
        <td>${resume.atsScore || 'N/A'}</td>
        <td>
          <span class="table-status completed">
            completed
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="window.location.href='resume-analysis.html?id=${resumeId}'">
            View
          </button>
          <button class="btn btn-sm btn-danger" onclick="window.dashboard.deleteResume('${resumeId}')">
            Delete
          </button>
        </td>
      </tr>
    `;
        }
      )
      .join('');
  }

  /**
   * Display interview history
   */
  displayInterviewHistory(interviewHistory) {
    const tbody = document.querySelector('.interview-history tbody');
    if (!tbody || !interviewHistory || interviewHistory.length === 0) {
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No interviews yet</td></tr>';
      }
      return;
    }

    const interviews = Array.isArray(interviewHistory) ? interviewHistory : [];
    tbody.innerHTML = interviews
      .slice(0, 5)
      .map(
        (interview) => {
          const interviewId = interview.id || interview._id || interview.interviewId;
          return `
      <tr>
        <td>${interview.jobRole || interview.role || 'N/A'}</td>
        <td>${UIHelper.formatDate(interview.interviewDate || interview.createdAt)}</td>
        <td>${interview.score || 'N/A'}</td>
        <td>
          <span class="table-status ${interview.status === 'completed' ? 'completed' : 'pending'}">
            ${interview.status || 'pending'}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="window.location.href='interview-results.html?id=${interviewId}'">
            View
          </button>
          <button class="btn btn-sm btn-danger" onclick="window.dashboard.deleteInterview('${interviewId}')">
            Delete
          </button>
        </td>
      </tr>
    `;
        }
      )
      .join('');
  }

  /**
   * Handle search
   */
  async deleteResume(resumeId) {
    const confirmed = confirm('Delete this resume permanently?');
    if (!confirmed) return;

    try {
      UIHelper.showLoading('Deleting resume...');
      const response = await api.deleteResume(resumeId);
      UIHelper.hideLoading();

      if (response?.error) {
        UIHelper.error(response.error || 'Failed to delete resume');
        return;
      }

      UIHelper.success('Resume deleted successfully');
      await this.loadDashboardData();
    } catch (error) {
      console.error('Error deleting resume:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to delete resume');
    }
  }

  async deleteInterview(interviewId) {
    const confirmed = confirm('Delete this interview permanently?');
    if (!confirmed) return;

    try {
      UIHelper.showLoading('Deleting interview...');
      const response = await api.deleteInterview(interviewId);
      UIHelper.hideLoading();

      if (response?.error) {
        UIHelper.error(response.error || 'Failed to delete interview');
        return;
      }

      UIHelper.success('Interview deleted successfully');
      await this.loadDashboardData();
    } catch (error) {
      console.error('Error deleting interview:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to delete interview');
    }
  }

  handleSearch(query) {
    // Implement search functionality
    console.log('Search query:', query);
  }

  /**
   * Logout
   */
  logout() {
    authManager.logout();
    window.location.href = 'login.html';
  }
}

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
  });
} else {
  new Dashboard();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Dashboard;
}
