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

    // Speech recognition setup (initialized later)
    this.recognition = null;
    this.recognitionSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    this.submitting = false;
    this.speaking = false;

    // Speech synthesis setup
    this.synthesis = window.speechSynthesis;

    this.init();
  }

  async init() {
    console.log('[voice] init: page loaded');
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
    if (startBtn && !startBtn.dataset.listenerAttached) {
      startBtn.addEventListener('click', (e) => {
        console.log('[voice] Start button clicked');
        this.startInterview(e);
      });
      startBtn.dataset.listenerAttached = 'true';
    }
  }

  /**
   * Start interview
   */
  async startInterview() {
    const startBtn = document.getElementById('btn-start-interview');
    const jobRole = document.getElementById('job-role')?.value;
    const experienceLevel = document.getElementById('experience-level')?.value;
    const interviewType = document.getElementById('interview-type')?.value;
    const difficulty = document.getElementById('difficulty')?.value;

    if (!jobRole || !experienceLevel || !interviewType || !difficulty) {
      UIHelper.error('Please fill all fields');
      return;
    }

    if (startBtn) {
      startBtn.disabled = true;
      startBtn.classList.add('loading');
    }

    UIHelper.showLoading('Generating interview...');
    console.log('[voice] startInterview - request body', { role: jobRole, experienceLevel, interviewType, difficulty });

    try {
      const body = {
        role: jobRole,
        experienceLevel,
        interviewType,
        difficulty,
      };

      const response = await api.post(CONFIG.ENDPOINTS.START_INTERVIEW, body);
      console.log('[voice] startInterview - response', response);

      if (response.error) {
        UIHelper.hideLoading();
        UIHelper.error(response.error);
        if (startBtn) startBtn.disabled = false;
        return;
      }

      const interviewId = response.interviewId || response.id || response._id || response.data?.interviewId || response.data?.id;
      const interviewSession = { interviewId, meta: response };
      localStorage.setItem(CONFIG.STORAGE_KEYS.INTERVIEW_SESSION, JSON.stringify(interviewSession));
      this.interviewSession = interviewSession;

      UIHelper.hideLoading();

      // Transition UI without full redirect
      const setupSection = document.getElementById('interview-setup');
      const liveSection = document.getElementById('interview-live');
      if (setupSection) setupSection.style.display = 'none';
      if (liveSection) liveSection.style.display = 'flex';

      this.setupInterviewUI();

      // Render first question if provided
      let firstQuestion = response.firstQuestion || response.question || response.data?.firstQuestion || response.data?.question || response.data?.data?.question;
      if (firstQuestion) {
        // Normalize string responses to object shape
        if (typeof firstQuestion === 'string') {
          firstQuestion = { question: firstQuestion };
        }
        this.currentQuestion = firstQuestion;
        this.questionCount = 1;
        this.questionCount++;
        this.displayQuestion(firstQuestion);
        this.speakQuestion(firstQuestion.question || firstQuestion.text || firstQuestion.prompt || '');
      } else {
        // Backend does not expose a separate question endpoint; wait for answer call to return next question
        console.warn('[voice] No initial question returned by start; waiting for server-driven flow');
      }
    } catch (error) {
      console.error('[voice] Error starting interview:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to start interview');
      if (startBtn) startBtn.disabled = false;
    } finally {
      if (startBtn) {
        startBtn.classList.remove('loading');
      }
    }
  }

  /**
   * Load interview session
   */
  async loadInterviewSession() {
    try {
      const sessionJson = localStorage.getItem(CONFIG.STORAGE_KEYS.INTERVIEW_SESSION);
      if (!sessionJson) {
        // no session; go back to setup
        const setupSection = document.getElementById('interview-setup');
        const liveSection = document.getElementById('interview-live');
        if (setupSection) setupSection.style.display = 'block';
        if (liveSection) liveSection.style.display = 'none';
        return;
      }

      this.interviewSession = JSON.parse(sessionJson);
      this.setupInterviewUI();
      // If session meta contains a last question, display it; otherwise wait for answer-driven flow
      const meta = this.interviewSession.meta || {};
      let storedQuestion = meta.firstQuestion || meta.question || meta.data?.question || meta.data?.firstQuestion;
      if (storedQuestion) {
        if (typeof storedQuestion === 'string') storedQuestion = { question: storedQuestion };
        this.currentQuestion = storedQuestion;
        this.displayQuestion(storedQuestion);
      }

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
    const exitBtn = document.getElementById('btn-exit-interview');

    if (startBtn && !startBtn.dataset.listenerAttached) {
      startBtn.addEventListener('click', () => this.startListening());
      startBtn.dataset.listenerAttached = 'true';
    }

    if (stopBtn && !stopBtn.dataset.listenerAttached) {
      stopBtn.addEventListener('click', () => this.stopListening());
      stopBtn.dataset.listenerAttached = 'true';
    }

    if (muteBtn && !muteBtn.dataset.listenerAttached) {
      muteBtn.addEventListener('click', () => this.toggleMute());
      muteBtn.dataset.listenerAttached = 'true';
    }

    if (exitBtn && !exitBtn.dataset.listenerAttached) {
      exitBtn.addEventListener('click', () => this.exitInterview());
      exitBtn.dataset.listenerAttached = 'true';
    }

    // Progress indicators
    this.updateProgressUI();

    // Speech recognition initialization
    this.setupSpeechRecognition();
  }

  /**
   * Setup speech recognition
   */
  setupSpeechRecognition() {
    if (!this.recognitionSupported) {
      console.warn('[voice] SpeechRecognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!this.recognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }

    this.recognition.onstart = () => {
      console.log('[voice] Speech recognition started');
      this.isListening = true;
      this.updateMicrophoneStatus('Listening...');
    };

    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      const transcriptElement = document.querySelector('.transcript-text');
      if (transcriptElement) {
        transcriptElement.textContent = transcript;
        transcriptElement.classList.remove('transcript-empty');
      }

      if (event.results[event.results.length - 1].isFinal) {
        this.currentAnswer = transcript.trim();
      }
    };

    this.recognition.onerror = (event) => {
      console.error('[voice] Speech recognition error:', event.error);
      UIHelper.error('Microphone error: ' + (event.error || 'unknown'));
      this.isListening = false;
      this.updateMicrophoneStatus('Error');
    };

    this.recognition.onend = () => {
      console.log('[voice] Speech recognition ended');
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

      const interviewId = this.interviewSession?.interviewId || this.interviewSession?.id || this.interviewSession?._id;
      console.log('[voice] getNextQuestion - interviewId', interviewId, 'questionCount', this.questionCount);

      // Backend does not expose a standalone "get question" endpoint.
      // Questions are returned by POST /interview/start (first question) and POST /interview/answer (next question).
      console.warn('[voice] getNextQuestion: no dedicated endpoint available; use answer flow to receive next question');
      UIHelper.hideLoading();
      return;
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
    console.log('[voice] displayQuestion received:', questionData);

    const questionElement = document.querySelector('.interview-question-text');
    let qText = '';
    if (typeof questionData === 'string') {
      qText = questionData;
    } else if (questionData) {
      qText = questionData.question || questionData.text || questionData.prompt || '';
    }
    if (questionElement) {
      questionElement.textContent = qText;
    }

    // Clear transcript
    const transcriptElement = document.querySelector('.transcript-text');
    if (transcriptElement) {
      transcriptElement.textContent = '';
      transcriptElement.classList.add('transcript-empty');
    }

    this.currentAnswer = '';
  }

  /**
   * Speak question
   */
  speakQuestion(text) {
  console.log('[voice] speakQuestion called:', text);

  if (!this.synthesis || !text) {
    console.error('[voice] Cannot speak. Empty text.');
    return;
  }

  try {
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      console.log('[voice] Speech started');
    };

    utterance.onend = () => {
      console.log('[voice] Speech ended');
    };

    utterance.onerror = (e) => {
      console.error('[voice] Speech error', e);
    };

    this.synthesis.speak(utterance);

  } catch (e) {
    console.error('[voice] TTS error', e);
  }
}

  /**
   * Start listening
   */
  startListening() {
    if (!this.recognitionSupported) {
      UIHelper.error('Speech recognition not supported in this browser');
      return;
    }

    if (this.isListening) return;

    try {
      this.recognition.start();
      const startBtn = document.getElementById('btn-start-recording');
      if (startBtn) startBtn.disabled = true;
      console.log('[voice] startListening');
    } catch (e) {
      console.error('[voice] startListening error', e);
    }
  }

  /**
   * Stop listening
   */
  async stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('[voice] recognition.stop error', e);
      }
    }

    this.isListening = false;

    const startBtn = document.getElementById('btn-start-recording');
    if (startBtn) startBtn.disabled = false;

    // Submit answer
    await this.submitAnswer();
  }

  /**
   * Submit answer
   */
  async submitAnswer() {
    const answerText = (this.currentAnswer || '').trim();
    if (!answerText) {
      UIHelper.warning('Please provide an answer');
      return;
    }

    if (this.submitting) {
      console.log('[voice] submitAnswer: already submitting, ignoring');
      return;
    }

    this.submitting = true;
    UIHelper.showLoading('Evaluating answer...');

    try {
      const interviewId = this.interviewSession?.interviewId || this.interviewSession?.id || this.interviewSession?._id;
      console.log('[voice] submitAnswer - interviewId, answerText', interviewId, answerText);

      const body = { interviewId, answerText };
      const response = await api.post(CONFIG.ENDPOINTS.SUBMIT_ANSWER, body);
      console.log('[voice] submitAnswer - response', response);

      if (response.error) {
        UIHelper.hideLoading();
        UIHelper.error(response.error);
        return;
      }

      // Append evaluation to answers list
      const evaluation = response.evaluation || response.data?.evaluation || response.evaluationSummary || null;
      const score = response.score || response.data?.score || null;
      this.answers.push({ question: this.currentQuestion, answer: answerText, evaluation, score });

      // Render evaluation in UI
      this.renderEvaluation({ question: this.currentQuestion, answer: answerText, evaluation, score });

      // Check for next question or final report
      // Support common server shapes: response.data.question and response.data.finalReport
      const nextQuestion = response.nextQuestion || response.question || response.data?.nextQuestion || response.data?.question || response.data?.data?.question;
      const finalReport = response.finalReport || response.data?.finalReport || response.data?.report || response.report || response.data?.data?.finalReport;

      UIHelper.hideLoading();

      if (nextQuestion) {

        const normalizedQuestion =
          typeof nextQuestion === 'string'
            ? { question: nextQuestion }
            : nextQuestion;

        this.currentQuestion = normalizedQuestion;

        this.displayQuestion(normalizedQuestion);

        const questionText =
          normalizedQuestion.question ||
          normalizedQuestion.text ||
          normalizedQuestion.prompt ||
          '';

        console.log('[voice] Next question:', questionText);

        this.speakQuestion(questionText);

        this.questionCount++;

        this.updateProgressUI();
      } else if (finalReport) {
        // End interview and redirect
        await api.post(CONFIG.ENDPOINTS.END_INTERVIEW, { interviewId });
        localStorage.removeItem(CONFIG.STORAGE_KEYS.INTERVIEW_SESSION);
        window.location.href = `/interview-results.html?id=${interviewId}`;
      } else {
        // Try to fetch next question from server
        if (this.questionCount < this.maxQuestions) {
          await this.getNextQuestion();
        } else {
          await api.post(CONFIG.ENDPOINTS.END_INTERVIEW, { interviewId });
          localStorage.removeItem(CONFIG.STORAGE_KEYS.INTERVIEW_SESSION);
          window.location.href = `/interview-results.html?id=${interviewId}`;
        }
      }
    } catch (error) {
      console.error('[voice] Error submitting answer:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to submit answer');
    } finally {
      this.submitting = false;
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

      const interviewId = this.interviewSession?.interviewId || this.interviewSession?.id || this.interviewSession?._id;
      console.log('[voice] endInterview - interviewId', interviewId);
      const response = await api.post(CONFIG.ENDPOINTS.END_INTERVIEW, { interviewId });

      if (response?.error) {
        UIHelper.hideLoading();
        UIHelper.error(response.error);
        return;
      }

      localStorage.removeItem(CONFIG.STORAGE_KEYS.INTERVIEW_SESSION);

      UIHelper.hideLoading();
      UIHelper.success('Interview completed!');

      setTimeout(() => {
        window.location.href = `/interview-results.html?id=${interviewId}`;
      }, 800);
    } catch (error) {
      console.error('Error ending interview:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to end interview');
    }
  }

  /**
   * Exit interview - user initiated exit
   */
  async exitInterview() {
    // Confirm exit
    const confirmed = confirm('Are you sure you want to exit the interview? Your results will be evaluated based on the answers provided so far.');
    
    if (!confirmed) {
      return;
    }

    try {
      // Stop recording if it's active
      if (this.isListening && this.recognition) {
        try {
          this.recognition.stop();
        } catch (e) {
          console.warn('[voice] recognition.stop error during exit', e);
        }
      }

      UIHelper.showLoading('Exiting interview and calculating score...');

      const interviewId = this.interviewSession?.interviewId || this.interviewSession?.id || this.interviewSession?._id;
      console.log('[voice] exitInterview - interviewId', interviewId);

      // Call end interview endpoint to finalize and calculate score
      const response = await api.post(CONFIG.ENDPOINTS.END_INTERVIEW, { interviewId });

      if (response?.error) {
        UIHelper.hideLoading();
        UIHelper.error(response.error);
        return;
      }

      localStorage.removeItem(CONFIG.STORAGE_KEYS.INTERVIEW_SESSION);

      UIHelper.hideLoading();
      UIHelper.success('Interview exited. Loading your results...');

      setTimeout(() => {
        window.location.href = `/interview-results.html?id=${interviewId}`;
      }, 800);
    } catch (error) {
      console.error('[voice] Error exiting interview:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to exit interview');
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

  renderEvaluation({ question, answer, evaluation, score }) {
    try {
      const container = document.querySelector('.previous-questions');
      if (!container) return;

      const listEl = container.querySelector('.previous-list') || container;

      const node = document.createElement('div');
      node.className = 'result-item';
      const qText = question?.question || question?.text || 'Question';
      node.innerHTML = `
        <div class="result-item-title">${qText}</div>
        <div class="result-item-description"><strong>Your answer:</strong> ${answer}</div>
        <div class="result-item-description"><strong>AI Evaluation:</strong> ${evaluation || 'N/A'}</div>
      `;

      listEl.insertBefore(node, listEl.firstChild);
    } catch (e) {
      console.error('[voice] renderEvaluation error', e);
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
