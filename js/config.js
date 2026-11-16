/* ============================================
   APPLICATION CONFIGURATION
   ============================================ */

const CONFIG = {
  // Backend API Base URL
  API_BASE_URL: 'http://localhost:5000/api',
  // API_BASE_URL: 'https://nextralis-backend.onrender.com/api',

  // API Endpoints
  ENDPOINTS: {
    // Authentication
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
    VERIFY_TOKEN: '/auth/verify',
    RECORD_ACTIVITY: '/auth/activity',
    CHANGE_PASSWORD: '/auth/change-password',

    // User Profile
    GET_PROFILE: '/auth/profile',
    UPDATE_PROFILE: '/auth/profile',
    GET_USER_STATS: '/auth/stats',

    // Subscription and payments
    GET_PLANS: '/subscription/plans',
    GET_SUBSCRIPTION: '/subscription/me',
    CREATE_PAYMENT_ORDER: '/subscription/orders',
    VERIFY_PAYMENT: '/subscription/verify',
    GET_PAYMENT_STATUS: '/subscription/payments/:orderId',
    SUBMIT_CONTACT_QUERY: '/contact',

    // Resume
    UPLOAD_RESUME: '/resume/upload',
    GET_RESUME: '/resume/:id',
    GET_RESUME_HISTORY: '/resume/history',
    DELETE_RESUME: '/resume/:id',

    // Interview
    DELETE_INTERVIEW: '/interview/:id',
    START_INTERVIEW: '/interview/start',
    SUBMIT_ANSWER: '/interview/answer',
    END_INTERVIEW: '/interview/end',
    GET_INTERVIEW_HISTORY: '/interview/history',
    GET_INTERVIEW_RESULT: '/interview/report/:id',

  },

  // Storage Keys
  STORAGE_KEYS: {
    TOKEN: 'auth_token',
    USER: 'user_data',
    LAST_ACTIVITY: 'auth_last_activity',
    SESSION_EVENT: 'auth_session_event',
    INTERVIEW_SESSION: 'interview_session',
    RESUME_DATA: 'resume_data',
  },

  // Production inactivity timeout. For local development only, set
  // window.NEXTRALIS_SESSION_INACTIVITY_MS before loading this file.
  SESSION_INACTIVITY_MS: Number(
    typeof window !== 'undefined' && window.NEXTRALIS_SESSION_INACTIVITY_MS
  ) || 2 * 60 * 60 * 1000,


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
