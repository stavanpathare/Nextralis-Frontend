/* ============================================
   API COMMUNICATION LAYER
   ============================================ */

class APIClient {
  constructor() {
    this.baseURL = CONFIG.API_BASE_URL;
    this.token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    try {
      if (token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
        console.log('[api] setToken stored', CONFIG.STORAGE_KEYS.TOKEN, token);
      } else {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        console.log('[api] setToken removed token');
      }
    } catch (e) {
      console.error('[api] setToken error saving token to localStorage', e);
    }
  }

  /**
   * Get authentication token
   */
  getToken() {
    if (!this.token) {
      try {
        this.token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        console.log('[api] getToken loaded from localStorage', this.token);
      } catch (e) {
        console.error('[api] getToken error reading localStorage', e);
        this.token = null;
      }
    } else {
      // in-memory token
      // console.log('[api] getToken in-memory', this.token);
    }
    return this.token;
  }

  /**
   * Build full URL
   */
  buildURL(endpoint) {
    return `${this.baseURL}${endpoint}`;
  }

  /**
   * Get default headers
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    console.error('API Error:', error);

    if (error.response?.status === 401) {
      // Token expired or unauthorized
      this.setToken(null);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
      if (!window.location.pathname.endsWith('login.html')) {
        window.location.href = 'login.html';
      }
      return { error: 'Session expired. Please login again.' };
    }

    if (error.response?.data?.message) {
      return { error: error.response.data.message };
    }

    if (error.message) {
      return { error: error.message };
    }

    return { error: 'An error occurred. Please try again.' };
  }

  /**
   * Generic GET request
   */
  async get(endpoint, options = {}) {
    try {
      const url = this.buildURL(endpoint);
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        ...options,
      });

      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generic POST request
   */
  async post(endpoint, data = {}, options = {}) {
    try {
      const url = this.buildURL(endpoint);
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
        ...options,
      });

      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generic PUT request
   */
  async put(endpoint, data = {}, options = {}) {
    try {
      const url = this.buildURL(endpoint);
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
        ...options,
      });

      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Generic DELETE request
   */
  async delete(endpoint, options = {}) {
    try {
      const url = this.buildURL(endpoint);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
        ...options,
      });

      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Upload file (FormData)
   */
  async uploadFile(endpoint, file, options = {}) {
    try {
      const url = this.buildURL(endpoint);
      const formData = new FormData();
      const fieldName = options.fieldName || 'file';
      const metadata = options.metadata || {};
      formData.append(fieldName, file);

      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, String(value));
        }
      });

      const headers = { Authorization: `Bearer ${this.getToken()}` };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        ...options,
      });

      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handle API response
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error = new Error(data?.message || 'API request failed');
      error.response = { status: response.status, data };
      throw error;
    }

    return data;
  }

  /* ============================================
     AUTHENTICATION ENDPOINTS
     ============================================ */

  async login(email, password) {
    return this.post(CONFIG.ENDPOINTS.LOGIN, { email, password });
  }

  async register(name, email, password) {
    return this.post(CONFIG.ENDPOINTS.REGISTER, { name, email, password });
  }

  async logout() {
    this.setToken(null);
    return this.post(CONFIG.ENDPOINTS.LOGOUT);
  }

  async verifyToken() {
    return this.get(CONFIG.ENDPOINTS.VERIFY_TOKEN);
  }

  async refreshToken() {
    return this.post(CONFIG.ENDPOINTS.REFRESH_TOKEN);
  }

  /* ============================================
     USER PROFILE ENDPOINTS
     ============================================ */

  async getProfile() {
    return this.get(CONFIG.ENDPOINTS.GET_PROFILE);
  }

  async updateProfile(data) {
    return this.put(CONFIG.ENDPOINTS.UPDATE_PROFILE, data);
  }

  async getUserStats() {
    return this.get(CONFIG.ENDPOINTS.GET_USER_STATS);
  }

  /* ============================================
     RESUME ENDPOINTS
     ============================================ */

  async uploadResume(file, metadata = {}) {
    return this.uploadFile(CONFIG.ENDPOINTS.UPLOAD_RESUME, file, { fieldName: 'resume', metadata });
  }

  // analyzeResume removed — upload returns analysis directly from server

  async getResumeHistory() {
    return this.get(CONFIG.ENDPOINTS.GET_RESUME_HISTORY);
  }

  async getResumeAnalysis(resumeId) {
    return this.get(CONFIG.ENDPOINTS.GET_RESUME.replace(':id', resumeId));
  }

  async deleteResume(resumeId) {
    return this.delete(CONFIG.ENDPOINTS.DELETE_RESUME.replace(':id', resumeId));
  }

  /* ============================================
     INTERVIEW ENDPOINTS
     ============================================ */

  async startInterview(jobRole, experienceLevel, interviewType, difficulty) {
    return this.post(CONFIG.ENDPOINTS.START_INTERVIEW, {
      jobRole,
      experienceLevel,
      interviewType,
      difficulty,
    });
  }

  async submitAnswer(interviewId, questionId, answer, audioData = null) {
    return this.post(CONFIG.ENDPOINTS.SUBMIT_ANSWER, {
      interviewId,
      questionId,
      answer,
      audioData,
    });
  }

  async endInterview(interviewId) {
    return this.post(CONFIG.ENDPOINTS.END_INTERVIEW, { interviewId });
  }

  async getInterviewHistory() {
    return this.get(CONFIG.ENDPOINTS.GET_INTERVIEW_HISTORY);
  }

  async deleteInterview(interviewId) {
    return this.delete(CONFIG.ENDPOINTS.DELETE_INTERVIEW.replace(':id', interviewId));
  }

  async getInterviewResult(interviewId) {
    return this.get(CONFIG.ENDPOINTS.GET_INTERVIEW_RESULT.replace(':id', interviewId));
  }
  // Note: AI-specific helper endpoints removed — interview flow uses /start and /answer routes.
}

// Create global API client instance
const api = new APIClient();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APIClient, api };
}
