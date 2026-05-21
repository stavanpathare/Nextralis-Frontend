# AI Interview Web Application - Frontend

A modern, futuristic dark-themed frontend for an AI-powered interview preparation platform. Built with vanilla HTML, CSS, and JavaScript for maximum compatibility and performance.

## 🎨 Design Features

- **Modern Futuristic Dark Theme**: Premium SaaS-inspired design with glassmorphism effects
- **Neon Glow Accents**: Purple, blue, and cyan gradients throughout the UI
- **Smooth Animations**: Elegant transitions and floating effects
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices
- **Premium UI Components**: Custom buttons, cards, forms, and interactive elements

## 📁 Project Structure

```
Frontend/
├── css/
│   ├── style.css          # Global styles, variables, animations, utilities
│   ├── auth.css           # Authentication pages styling
│   ├── dashboard.css      # Dashboard and sidebar styling
│   ├── resume.css         # Resume analyzer styling
│   ├── interview.css      # Interview interface styling
│   └── responsive.css     # Responsive design breakpoints
│
├── js/
│   ├── config.js          # Configuration and constants
│   ├── api.js             # API communication layer
│   ├── auth.js            # Authentication management
│   ├── main.js            # UI utilities and helpers
│   ├── dashboard.js       # Dashboard functionality
│   ├── resume.js          # Resume analyzer logic
│   ├── interview.js       # Voice interview logic
│   └── profile.js         # Profile management
│
├── images/                # Images and assets (placeholder)
│
├── index.html             # Landing page
├── login.html             # Login page
├── register.html          # Registration page
├── dashboard.html         # Dashboard
├── resume-analysis.html   # Resume analyzer
├── voice-interview.html   # Voice interview practice
├── interview-results.html # Interview results display
└── profile.html           # User profile
```

## 📄 HTML Pages

### 1. **index.html** - Landing Page
- Hero section with futuristic typography
- Features showcase (Resume Analyzer, Voice Interview, Video Interview)
- How it works section
- Call-to-action section
- Responsive navbar with navigation links

### 2. **login.html** - Login Page
- Email and password inputs
- "Remember me" checkbox
- Forgot password link
- Registration redirect
- Form validation and error messages
- Success notifications

### 3. **register.html** - Registration Page
- Full name, email, password inputs
- Password strength indicator
- Password confirmation
- Terms of Service checkbox
- Email validation
- Form validation on submit

### 4. **dashboard.html** - Dashboard
- Fixed sidebar with navigation
- Sticky navbar with search and user menu
- Welcome card
- Statistics cards (resumes, interviews, average score)
- Quick action buttons
- Recent resume history table
- Recent interview history table
- User dropdown menu with logout

### 5. **resume-analysis.html** - Resume Analyzer
- Drag and drop upload zone
- File type and size validation
- Upload progress indicator
- Analysis results display with:
  - ATS Score card
  - Match Score card
  - Readability card
  - Strengths list
  - Improvements list
  - Missing skills
  - AI Suggestions with numbers

### 6. **voice-interview.html** - Voice Interview
- Interview setup page with:
  - Job role selection
  - Experience level selection
  - Interview type selection
  - Difficulty level selection
  - Information panels
- Live interview interface with:
  - Current question display
  - User transcript display
  - Microphone widget with waveform animation
  - Recording controls
  - Progress indicators (question progress)
  - Previous questions list

### 7. **interview-results.html** - Interview Results
- Overall score display with circular progress
- Communication score
- Technical score
- Strengths list
- Areas to improve list
- AI recommendations
- Action buttons to retry or go back to dashboard

### 8. **profile.html** - User Profile
- Profile sidebar with avatar, name, email, plan
- Statistics (resumes, interviews, average score, member since)
- Personal information form (editable)
- Email notification settings
- Data & privacy options
- Change password button
- Logout button

## 🎯 CSS Files Overview

### style.css
- CSS variables for consistent theming
- Base typography and reset styles
- Button variants (primary, secondary, ghost)
- Glassmorphism card styles
- Form input styling
- Container and layout utilities
- Flexbox and grid utilities
- Animation keyframes
- Loading spinner styles
- Utility classes

### auth.css
- Animated authentication container
- Auth form styling with glassmorphism
- Password strength indicator
- Form validation messages
- Error and success messages
- Loading states
- Social login buttons (template)

### dashboard.css
- Sidebar styling with navigation
- Dashboard layout and grid
- Navbar with search functionality
- Welcome card styling
- Statistics cards
- History table styling
- Quick actions grid
- Table status badges
- Responsive sidebar collapse

### resume.css
- Upload box with drag-and-drop
- File upload progress bar
- Analysis panels
- Score card display
- Circular progress indicators
- Report cards with styling
- Skills grid and tags
- Suggestion cards numbered
- Empty state styling

### interview.css
- Interview setup form styling
- Live interview main panel
- Microphone widget
- Waveform animation bars
- Progress widget with question indicators
- Previous questions list
- Interview results cards
- Feedback section styling

### responsive.css
- Mobile-first responsive breakpoints
- Tablet adjustments
- Phone landscape mode
- Small phone optimizations
- Responsive grid adjustments
- Navigation adjustments for mobile
- Print styles

## 🔧 JavaScript Files Overview

### config.js
- API base URL configuration
- API endpoints mapping
- Storage keys for localStorage
- Interview settings (max questions, timeouts)
- UI settings
- Feature flags

### api.js
- APIClient class with methods for:
  - Authentication (login, register, logout)
  - User profile management
  - Resume operations
  - Interview operations
  - AI endpoints
- Token management
- Error handling
- Global `api` instance for use across pages

### auth.js
- AuthManager class for:
  - User authentication state
  - Password validation
  - Email validation
  - Form validation
  - Role management
  - Login/Register/Logout
- Password strength checking
- User data storage and retrieval
- Global `authManager` instance

### main.js
- UIHelper utility class with methods for:
  - Toast notifications (success, error, warning, info)
  - Loading indicators
  - Confirmation dialogs
  - Date and time formatting
  - Form validation
  - Button state management
  - Mobile detection
  - Clipboard operations

### dashboard.js
- Dashboard class with methods for:
  - User authentication check
  - Dashboard data loading
  - Sidebar navigation setup
  - User menu dropdown
  - Stats display
  - History table population
  - Search functionality
  - Logout handler

### resume.js
- ResumeAnalyzer class with methods for:
  - File selection and validation
  - Drag and drop handling
  - Resume upload to API
  - Resume analysis request
  - Results display and formatting
  - Score card generation

### interview.js
- VoiceInterview class with methods for:
  - Interview setup page handling
  - Speech recognition setup
  - Microphone status updates
  - Question fetching and display
  - Question speaking via text-to-speech
  - Answer submission
  - Progress UI updates
  - Interview completion and results redirect

### profile.js
- ProfileManager class with methods for:
  - Profile loading
  - Profile editing
  - Profile saving
  - Password change dialog
  - User statistics display
  - Logout functionality

## 🌐 API Integration

All API calls are routed through the `api.js` APIClient class. The backend base URL is configured in `config.js`:

```javascript
API_BASE_URL: 'http://localhost:5000/api'
```

### Authentication Flow
1. User registers → `POST /api/auth/register`
2. JWT token saved in localStorage
3. Token included in all subsequent requests via Authorization header
4. Protected pages check `authManager.isAuthenticated()`
5. Expired tokens trigger redirect to login

### Key Endpoints Used

**Authentication:**
- POST `/auth/login`
- POST `/auth/register`
- POST `/auth/logout`
- GET `/auth/verify`

**User:**
- GET `/user/profile`
- PUT `/user/profile`
- GET `/user/stats`

**Resume:**
- POST `/resume/upload` (FormData)
- POST `/resume/analyze`
- GET `/resume/history`
- DELETE `/resume/:id`

**Interview:**
- POST `/interview/start`
- POST `/interview/submit-answer`
- POST `/interview/end`
- GET `/interview/history`
- GET `/interview/:id`

**AI:**
- POST `/ai/question`
- POST `/ai/evaluate`
- GET `/ai/feedback`

## 🎤 Voice Interview Features

The voice interview uses browser native APIs:

1. **Web Speech API (SpeechRecognition)**
   - Captures user voice input
   - Converts speech to text
   - Shows interim and final results

2. **Web Speech API (SpeechSynthesis)**
   - AI speaks questions to the user
   - Adjustable speech rate and volume
   - Can be muted

3. **Recording Flow**
   - AI question appears
   - AI speaks the question
   - User clicks "Start Recording"
   - User answers via microphone
   - Transcript displays in real-time
   - User clicks "Stop & Submit"
   - Answer is sent to backend for evaluation
   - Next question is fetched

## 📱 Responsive Breakpoints

- **Desktop**: 1024px+ (full layout with sidebar)
- **Tablet**: 768px - 1024px (collapsed sidebar)
- **Phone Landscape**: 600px - 768px (optimized mobile layout)
- **Phone Portrait**: 480px - 600px (single column, optimized)
- **Small Phone**: <480px (minimal layout)

## 🚀 Getting Started

### Prerequisites
- Modern web browser with ES6 support
- Backend API running on `http://localhost:5000/api`

### Setup

1. **Clone/Download the frontend files**
   ```
   cp all files to your web server
   ```

2. **Update Backend URL (if needed)**
   Edit `js/config.js`:
   ```javascript
   API_BASE_URL: 'http://your-backend-url/api'
   ```

3. **Open in Browser**
   ```
   http://localhost/index.html
   ```

### Local Development

For local testing, you can use Python's built-in server:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open: `http://localhost:8000`

## 🎨 Customization

### Theme Colors
Edit CSS variables in `css/style.css`:

```css
:root {
  --color-neon-blue: #00d4ff;
  --color-neon-purple: #a855f7;
  --color-neon-pink: #ec4899;
  /* More variables... */
}
```

### Animations
Modify animation durations in `css/style.css`:

```css
--transition-fast: 0.15s ease-in-out;
--transition-normal: 0.3s ease-in-out;
--transition-slow: 0.6s ease-in-out;
```

### API Base URL
Update in `js/config.js`:

```javascript
API_BASE_URL: 'https://your-production-api.com/api'
```

## 📋 Features Checklist

- ✅ Modern dark theme with glassmorphism
- ✅ Responsive design for all devices
- ✅ Authentication with JWT tokens
- ✅ Dashboard with stats and history
- ✅ Resume upload and analysis display
- ✅ Voice interview with speech recognition
- ✅ Interview results and feedback
- ✅ User profile management
- ✅ Real-time notifications (toasts)
- ✅ Password strength indicator
- ✅ Form validation
- ✅ Loading states
- ✅ Error handling
- ✅ Mobile-friendly UI

## 🔐 Security Notes

- JWT tokens stored in localStorage (consider using secure cookies)
- All API requests include Authorization header
- Forms validate on client-side before submission
- API validation happens on backend
- CSRF protection should be configured on backend

## 🐛 Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 12+)
- Internet Explorer: Not supported

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Verify backend API is running
3. Check backend logs for API errors
4. Verify API base URL in `config.js`

## 📄 License

This frontend is part of the AI Interview Web Application project.

---

**Built with ❤️ for the AI Interview community**
