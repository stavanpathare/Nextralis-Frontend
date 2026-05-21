/* ============================================
   VOICE INTERVIEW MODULE
   ============================================ */

class VoiceInterview {
  constructor() {
    this.interviewSession = null;
    this.currentQuestion = null;
    this.answers = [];
    this.isListening = false;
    this.questionCount = 0;
    this.maxQuestions = CONFIG.INTERVIEW.MAX_QUESTIONS;

    // Speech recognition setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.language = 'en-US';

    // Speech synthesis setup
    this.synthesis = window.speechSynthesis;

    this.init();
  }

  async init() {
    // Check authentication
    if (!authManager.isAuthenticated()) {
      window.location.href = 'login.html';
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const liveMode = urlParams.get('live') === 'true';
    const setupSection = document.getElementById('interview-setup');
    const liveSection = document.getElementById('interview-live');

    if (setupSection) {
      setupSection.style.display = liveMode ? 'none' : 'block';
    }

    if (liveSection) {
      liveSection.style.display = liveMode ? 'flex' : 'none';
    }

    if (liveMode) {
      await this.loadInterviewSession();
    } else {
      this.setupEventListeners();
    }
  }

  /**
   * Setup event listeners for setup page
   */
  setupEventListeners() {
    const startBtn = document.getElementById('btn-start-interview');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startInterview());
    }
  }

  /**
   * Start interview
   */
  async startInterview() {
    const jobRole = document.getElementById('job-role')?.value;
    const experienceLevel = document.getElementById('experience-level')?.value;
    const interviewType = document.getElementById('interview-type')?.value;
    const difficulty = document.getElementById('difficulty')?.value;

    if (!jobRole || !experienceLevel || !interviewType || !difficulty) {
      UIHelper.error('Please fill all fields');
      return;
    }

    try {
      UIHelper.showLoading('Starting interview...');

      const response = await api.startInterview(jobRole, experienceLevel, interviewType, difficulty);

      if (response.error) {
        UIHelper.hideLoading();
        UIHelper.error(response.error);
        return;
      }

      // Save session to localStorage
      const interviewSession = {
        interviewId: response.interviewId || response.id || response._id || response.data?.interviewId || response.data?.id,
        ...response,
      };
      localStorage.setItem(CONFIG.STORAGE_KEYS.INTERVIEW_SESSION, JSON.stringify(interviewSession));

      UIHelper.hideLoading();

      // Redirect to live interview
      window.location.href = 'voice-interview.html?live=true';
    } catch (error) {
      console.error('Error starting interview:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to start interview');
    }
  }

  /**
   * Load interview session
   */
  async loadInterviewSession() {
    try {
      const sessionJson = localStorage.getItem(CONFIG.STORAGE_KEYS.INTERVIEW_SESSION);
      if (!sessionJson) {
        window.location.href = 'voice-interview.html';
        return;
      }

      this.interviewSession = JSON.parse(sessionJson);
      this.setupInterviewUI();
      await this.getNextQuestion();
      this.setupSpeechRecognition();
    } catch (error) {
      console.error('Error loading interview:', error);
      UIHelper.error('Failed to load interview');
    }
  }

  /**
   * Setup interview UI
   */
  setupInterviewUI() {
    // Setup controls
    const startBtn = document.getElementById('btn-start-recording');
    const stopBtn = document.getElementById('btn-stop-recording');
    const muteBtn = document.getElementById('btn-mute');

    if (startBtn) {
      startBtn.addEventListener('click', () => this.startListening());
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopListening());
    }

    if (muteBtn) {
      muteBtn.addEventListener('click', () => this.toggleMute());
    }

    // Progress indicators
    this.updateProgressUI();
  }

  /**
   * Setup speech recognition
   */
  setupSpeechRecognition() {
    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.isListening = true;
      this.updateMicrophoneStatus('Listening...');
    };

    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      // Update transcript display
      const transcriptElement = document.querySelector('.transcript-text');
      if (transcriptElement) {
        transcriptElement.textContent = transcript;
      }

      // Store final transcript
      if (event.results[event.results.length - 1].isFinal) {
        this.currentAnswer = transcript;
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      UIHelper.error('Microphone error: ' + event.error);
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isListening = false;
      this.updateMicrophoneStatus('Ready');
    };
  }

  /**
   * Get next question
   */
  async getNextQuestion() {
    if (this.questionCount >= this.maxQuestions) {
      await this.endInterview();
      return;
    }

    try {
      UIHelper.showLoading('Getting next question...');

      const interviewId = this.interviewSession.interviewId || this.interviewSession.id || this.interviewSession._id;
      const response = await api.getQuestion(interviewId, this.questionCount);

      if (response.error) {
        UIHelper.hideLoading();
        UIHelper.error(response.error);
        return;
      }

      this.currentQuestion = response;
      this.questionCount++;

      this.displayQuestion(response);
      this.speakQuestion(response.question);

      UIHelper.hideLoading();
      this.updateProgressUI();
    } catch (error) {
      console.error('Error getting question:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to get question');
    }
  }

  /**
   * Display question
   */
  displayQuestion(questionData) {
    const questionElement = document.querySelector('.interview-question-text');
    if (questionElement) {
      questionElement.textContent = questionData.question;
    }

    // Clear transcript
    const transcriptElement = document.querySelector('.transcript-text');
    if (transcriptElement) {
      transcriptElement.textContent = '';
      transcriptElement.classList.add('transcript-empty');
      transcriptElement.classList.add('transcript-empty');
    }

    this.currentAnswer = '';
  }

  /**
   * Speak question
   */
  speakQuestion(text) {
    if (!this.synthesis) return;

    this.synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    this.synthesis.speak(utterance);
  }

  /**
   * Start listening
   */
  startListening() {
    if (this.isListening) return;

    this.recognition.start();

    const startBtn = document.getElementById('btn-start-recording');
    if (startBtn) {
      startBtn.disabled = true;
    }
  }

  /**
   * Stop listening
   */
  async stopListening() {
    this.recognition.stop();
    this.isListening = false;

    const startBtn = document.getElementById('btn-start-recording');
    if (startBtn) {
      startBtn.disabled = false;
    }

    // Submit answer
    await this.submitAnswer();
  }

  /**
   * Submit answer
   */
  async submitAnswer() {
    if (!this.currentAnswer.trim()) {
      UIHelper.warning('Please provide an answer');
      return;
    }

    try {
      UIHelper.showLoading('Evaluating answer...');

      const interviewId = this.interviewSession.interviewId || this.interviewSession.id || this.interviewSession._id;
      const questionId = this.currentQuestion.questionId || this.currentQuestion.id;
      const response = await api.submitAnswer(
        interviewId,
        questionId,
        this.currentAnswer
      );

      if (response.error) {
        UIHelper.hideLoading();
        UIHelper.error(response.error);
        return;
      }

      this.answers.push({
        question: this.currentQuestion.question,
        answer: this.currentAnswer,
        evaluation: response.evaluation,
        score: response.score,
      });

      UIHelper.hideLoading();

      // Get next question
      if (this.questionCount < this.maxQuestions) {
        await this.getNextQuestion();
      } else {
        await this.endInterview();
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to submit answer');
    }
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    this.synthesis.cancel();
    UIHelper.info('Audio muted');
  }

  /**
   * End interview
   */
  async endInterview() {
    try {
      UIHelper.showLoading('Finishing interview...');

      const interviewId = this.interviewSession.interviewId || this.interviewSession.id || this.interviewSession._id;
      const response = await api.endInterview(interviewId);

      if (response.error) {
        UIHelper.hideLoading();
        UIHelper.error(response.error);
        return;
      }

      // Clear session
      localStorage.removeItem(CONFIG.STORAGE_KEYS.INTERVIEW_SESSION);

      UIHelper.hideLoading();
      UIHelper.success('Interview completed!');

      // Redirect to results
      setTimeout(() => {
        window.location.href = `/interview-results.html?id=${this.interviewSession.interviewId}`;
      }, 1000);
    } catch (error) {
      console.error('Error ending interview:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to end interview');
    }
  }

  /**
   * Update microphone status
   */
  updateMicrophoneStatus(status) {
    const statusElement = document.querySelector('.microphone-status');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }

  /**
   * Update progress UI
   */
  updateProgressUI() {
    const progressItems = document.querySelectorAll('.progress-item');
    progressItems.forEach((item, index) => {
      item.classList.remove('completed', 'current', 'pending');

      if (index < this.questionCount - 1) {
        item.classList.add('completed');
      } else if (index === this.questionCount - 1) {
        item.classList.add('current');
      } else {
        item.classList.add('pending');
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new VoiceInterview();
  });
} else {
  new VoiceInterview();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceInterview;
}
