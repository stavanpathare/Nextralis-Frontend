/* ============================================
   APPLICATION CONFIGURATION
   ============================================ */

const CONFIG = {
  // Backend API Base URL
  API_BASE_URL: 'http://localhost:5000/api',

  // API Endpoints
  ENDPOINTS: {
    // Authentication
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
    VERIFY_TOKEN: '/auth/verify',

    // User Profile
    GET_PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile',
    GET_USER_STATS: '/user/stats',

    // Resume
    UPLOAD_RESUME: '/resume/upload',
    ANALYZE_RESUME: '/resume/analyze',
    GET_RESUME_HISTORY: '/resume/history',
    DELETE_RESUME: '/resume/:id',

    // Interview
    START_INTERVIEW: '/interview/start',
    SUBMIT_ANSWER: '/interview/submit-answer',
    END_INTERVIEW: '/interview/end',
    GET_INTERVIEW_HISTORY: '/interview/history',
    GET_INTERVIEW_RESULT: '/interview/:id',

    // AI Responses
    GET_QUESTION: '/ai/question',
    EVALUATE_ANSWER: '/ai/evaluate',
    GET_FEEDBACK: '/ai/feedback',
  },

  // Storage Keys
  STORAGE_KEYS: {
    TOKEN: 'auth_token',
    USER: 'user_data',
    INTERVIEW_SESSION: 'interview_session',
    RESUME_DATA: 'resume_data',
  },

  // Interview Settings
  INTERVIEW: {
    MAX_QUESTIONS: 10,
    QUESTION_TIMEOUT: 300, // 5 minutes in seconds
    RECORDING_TIMEOUT: 60, // 1 minute
    MIN_ANSWER_LENGTH: 10,
  },

  // UI Settings
  UI: {
    TOAST_DURATION: 3000,
    ANIMATION_DURATION: 300,
    SIDEBAR_WIDTH: 260,
  },

  // Feature Flags
  FEATURES: {
    VIDEO_INTERVIEW: false,
    ADVANCED_ANALYTICS: true,
    EXPORT_REPORT: true,
    INTERVIEW_REPLAY: false,
  },
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
