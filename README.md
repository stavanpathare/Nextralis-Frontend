# Nextralis Web Application - Frontend

A modern, futuristic dark-themed frontend for an AI-powered interview preparation platform. Built with vanilla HTML, CSS, and JavaScript for maximum compatibility and performance.

## 🎨 Design Features

- **Modern Futuristic Dark Theme**: Premium SaaS-inspired design with glassmorphism effects
- **Neon Glow Accents**: Purple, blue, and cyan gradients throughout the UI
- **Smooth Animations**: Elegant transitions and floating effects
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices
- **Premium UI Components**: Custom buttons, cards, forms, and interactive elements

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

This frontend is part of the Nextralis Web Application project.

---

Build by Stavan Labs. All Rights Reserved.
