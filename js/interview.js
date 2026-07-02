/* ============================================
   VOICE INTERVIEW MODULE
   ============================================ */

class VoiceInterview {
  constructor() {
    this.interviewSession = null;
    this.currentQuestion = null;
    this.answers = [];
    this.isListening = false;
    this.isSpeaking = false;
    this.questionCount = 0;
    this.maxQuestions = CONFIG.INTERVIEW.MAX_QUESTIONS;
    this.currentAnswer = '';
    this.transcript = [];
    this.status = 'idle';
    this.sessionStartedAt = null;
    this.elapsedTimer = null;
    this.questionTimer = null;
    this.recognition = null;
    this.recognitionSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    this.submitting = false;
    this.synthesis = window.speechSynthesis;
    this.isMuted = false;
    this.pendingSpeech = null;
    this.init();
  }

  async init() {
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

  setupEventListeners() {
    const startBtn = document.getElementById('btn-start-interview');
    if (startBtn && !startBtn.dataset.listenerAttached) {
      startBtn.addEventListener('click', () => this.startInterview());
      startBtn.dataset.listenerAttached = 'true';
    }
  }

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
    }

    UIHelper.showLoading('Preparing your interview...');

    try {
      const response = await api.post(CONFIG.ENDPOINTS.START_INTERVIEW, {
        role: jobRole,
        experienceLevel,
        interviewType,
        difficulty,
      });

      if (response?.error) {
        UIHelper.hideLoading();
        UIHelper.error(response.error);
        if (startBtn) startBtn.disabled = false;
        return;
      }

      const interviewId = response.interviewId || response.data?.interviewId || response.id || response._id;
      const interviewSession = { interviewId, meta: response };
      localStorage.setItem(CONFIG.STORAGE_KEYS.INTERVIEW_SESSION, JSON.stringify(interviewSession));
      this.interviewSession = interviewSession;
      this.sessionStartedAt = Date.now();
      this.questionCount = 1;
      this.transcript = response.transcript || response.data?.transcript || [];
      this.currentQuestion = response.question || response.data?.question || response.data?.assistantMessage || '';
      this.currentAnswer = '';

      UIHelper.hideLoading();

      const setupSection = document.getElementById('interview-setup');
      const liveSection = document.getElementById('interview-live');
      if (setupSection) setupSection.style.display = 'none';
      if (liveSection) liveSection.style.display = 'flex';

      this.setupInterviewUI();
      this.updateProgressUI();
      this.renderTranscript();
      this.startTimers();
      this.setStatus('speaking');
      this.displayQuestion(this.currentQuestion);
      await this.speakAndWait(this.currentQuestion);
      this.setStatus('listening');
      this.enableMic();
    } catch (error) {
      console.error('[voice] Error starting interview:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to start interview');
      if (startBtn) startBtn.disabled = false;
    }
  }

  async loadInterviewSession() {
    try {
      const sessionJson = localStorage.getItem(CONFIG.STORAGE_KEYS.INTERVIEW_SESSION);
      if (!sessionJson) {
        const setupSection = document.getElementById('interview-setup');
        const liveSection = document.getElementById('interview-live');
        if (setupSection) setupSection.style.display = 'block';
        if (liveSection) liveSection.style.display = 'none';
        return;
      }

      this.interviewSession = JSON.parse(sessionJson);
      this.setupInterviewUI();
      this.updateProgressUI();
      const meta = this.interviewSession.meta || {};
      const storedQuestion = meta.question || meta.data?.question || meta.assistantMessage || meta.data?.assistantMessage || '';
      if (storedQuestion) {
        this.currentQuestion = storedQuestion;
        this.displayQuestion(storedQuestion);
      }
      this.renderTranscript();
      this.startTimers();
      if (!this.recognitionSupported) {
        UIHelper.warning('Speech recognition is not supported in this browser.');
      }
    } catch (error) {
      console.error('Error loading interview:', error);
      UIHelper.error('Failed to load interview');
    }
  }

  setupInterviewUI() {
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

    this.setupSpeechRecognition();
    this.updateProgressUI();
    this.renderTranscript();
    this.updateStatusUI();
  }

  setupSpeechRecognition() {
    if (!this.recognitionSupported) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!this.recognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }

    this.recognition.onstart = () => {
      this.isListening = true;
      this.setStatus('listening');
      this.updateMicrophoneStatus('Listening...');
      this.setMicButtonState(true);
    };

    this.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      this.currentAnswer = transcript.trim();
      this.showLiveTranscript(transcript.trim());
      if (event.results[event.results.length - 1].isFinal) {
        this.currentAnswer = transcript.trim();
      }
    };

    this.recognition.onerror = (event) => {
      console.error('[voice] Speech recognition error:', event.error);
      this.isListening = false;
      this.setMicButtonState(false);
      this.updateMicrophoneStatus('Ready');
      if (event.error === 'not-allowed') {
        UIHelper.error('Microphone access was denied. Please allow microphone access and try again.');
      } else {
        UIHelper.warning('Voice input interrupted. You can try again.');
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.setMicButtonState(false);
      this.updateMicrophoneStatus('Ready');
      if (this.currentAnswer && !this.submitting) {
        this.submitAnswer();
      }
    };
  }

  setStatus(status) {
    this.status = status;
    this.updateStatusUI();
  }

  updateStatusUI() {
    const statusText = document.querySelector('.ai-status-text');
    const dot = document.querySelector('.ai-dot');
    const label = document.querySelector('.microphone-status');
    const message = document.querySelector('.microphone-message');
    const indicator = document.querySelector('.status-pill');

    const meta = {
      idle: { text: 'Ready', icon: '●', dotClass: 'ready' },
      speaking: { text: 'AI is speaking...', icon: '🗣', dotClass: 'speaking' },
      listening: { text: 'Listening...', icon: '🎤', dotClass: 'listening' },
      thinking: { text: 'AI is analyzing...', icon: '🧠', dotClass: 'thinking' },
      generating: { text: 'Preparing next question...', icon: '✨', dotClass: 'generating' },
    };

    const state = meta[this.status] || meta.idle;

    if (statusText) {
      statusText.textContent = `${state.icon} ${state.text}`;
    }
    if (dot) {
      dot.className = `ai-dot ${state.dotClass}`;
    }
    if (label) {
      label.textContent = state.text;
    }
    if (message) {
      message.textContent = this.status === 'listening' ? 'Speak naturally. We will submit your answer automatically.' : 'The interview will continue automatically.';
    }
    if (indicator) {
      indicator.textContent = state.text;
      indicator.className = `status-pill ${state.dotClass}`;
    }
  }

  startTimers() {
    this.clearTimers();
    this.sessionStartedAt = Date.now();
    this.elapsedTimer = setInterval(() => this.updateTimers(), 1000);
    this.questionTimer = setInterval(() => this.updateQuestionTimer(), 1000);
  }

  clearTimers() {
    if (this.elapsedTimer) clearInterval(this.elapsedTimer);
    if (this.questionTimer) clearInterval(this.questionTimer);
  }

  updateTimers() {
    const elapsed = Math.floor((Date.now() - this.sessionStartedAt) / 1000);
    const elapsedElement = document.getElementById('elapsed-time');
    const totalElement = document.getElementById('total-time');
    if (elapsedElement) elapsedElement.textContent = this.formatDuration(elapsed);
    if (totalElement) totalElement.textContent = this.formatDuration(elapsed);
  }

  updateQuestionTimer() {
    const timer = document.getElementById('question-timer');
    if (timer) {
      const seconds = Number(timer.dataset.seconds || 0) + 1;
      timer.dataset.seconds = seconds;
      timer.textContent = this.formatDuration(seconds);
    }
  }

  formatDuration(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  enableMic() {
    const startBtn = document.getElementById('btn-start-recording');
    if (startBtn) {
      startBtn.disabled = false;
    }
    this.setMicButtonState(false);
    if (this.recognitionSupported && this.recognition && !this.isListening) {
      this.startListening();
    }
  }

  setMicButtonState(isActive) {
    const startBtn = document.getElementById('btn-start-recording');
    if (startBtn) {
      startBtn.classList.toggle('is-active', isActive);
      startBtn.disabled = isActive;
    }
  }

  startListening() {
    if (!this.recognitionSupported) {
      UIHelper.error('Speech recognition is not supported in this browser.');
      return;
    }

    if (this.isListening) return;

    try {
      this.recognition.start();
    } catch (error) {
      console.warn('[voice] recognition already started', error);
      this.isListening = false;
    }
  }

  async stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      return;
    }
    await this.submitAnswer();
  }

  async speakAndWait(text) {
    if (!text) return;
    this.isSpeaking = true;
    this.setStatus('speaking');
    await this.speakText(text);
    this.isSpeaking = false;
    this.setStatus('idle');
  }

  speakText(text) {
    return new Promise((resolve) => {
      if (!this.synthesis || !text) {
        resolve();
        return;
      }

      this.synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.96;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onstart = () => {
        this.setStatus('speaking');
        this.updateMicrophoneStatus('Speaking...');
      };
      utterance.onend = () => {
        this.updateMicrophoneStatus('Ready');
        resolve();
      };
      utterance.onerror = () => {
        this.updateMicrophoneStatus('Ready');
        resolve();
      };
      this.synthesis.speak(utterance);
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.synthesis.cancel();
      UIHelper.info('Audio muted');
    } else {
      UIHelper.info('Audio enabled');
    }
  }

  displayQuestion(questionData) {
    const questionElement = document.querySelector('.interview-question-text');
    const qText = typeof questionData === 'string' ? questionData : questionData?.question || questionData?.text || questionData?.prompt || '';
    if (questionElement) {
      questionElement.textContent = qText;
    }

    this.currentAnswer = '';
    this.showLiveTranscript('');
    const questionTimer = document.getElementById('question-timer');
    if (questionTimer) {
      questionTimer.dataset.seconds = '0';
      questionTimer.textContent = '00:00';
    }
    this.updateProgressUI();
  }

  showLiveTranscript(text) {
    const transcriptElement = document.querySelector('.transcript-text');
    if (transcriptElement) {
      transcriptElement.textContent = text || 'Your answer will appear here as you speak...';
      transcriptElement.classList.toggle('transcript-empty', !text);
      transcriptElement.scrollTop = transcriptElement.scrollHeight;
    }
  }

  renderTranscript() {
    const transcriptContainer = document.querySelector('.conversation-feed');
    if (!transcriptContainer) return;
    transcriptContainer.innerHTML = '';

    const items = this.transcript.length ? this.transcript : [{ role: 'assistant', message: this.currentQuestion || 'Interview ready' }];
    items.forEach((entry) => {
      const row = document.createElement('div');
      row.className = `conversation-item ${entry.role === 'assistant' ? 'assistant' : 'user'}`;
      row.innerHTML = `
        <div class="bubble-label">${entry.role === 'assistant' ? 'AI' : 'You'}</div>
        <div class="bubble-text">${entry.message}</div>
      `;
      transcriptContainer.appendChild(row);
    });
    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
  }

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

    const counter = document.getElementById('question-counter');
    if (counter) {
      counter.textContent = `Question ${this.questionCount} / ${this.maxQuestions}`;
    }
    const percent = document.getElementById('progress-percent');
    if (percent) {
      percent.textContent = `${Math.round((this.questionCount / this.maxQuestions) * 100)}%`;
    }
  }

  updateMicrophoneStatus(status) {
    const statusElement = document.querySelector('.microphone-status');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }

  async submitAnswer() {
    const answerText = (this.currentAnswer || '').trim();
    if (!answerText) return;
    if (this.submitting) return;

    this.submitting = true;
    this.setStatus('thinking');
    UIHelper.showLoading('Evaluating your answer...');

    try {
      const interviewId = this.interviewSession?.interviewId || this.interviewSession?.id || this.interviewSession?._id;
      const response = await api.post(CONFIG.ENDPOINTS.SUBMIT_ANSWER, { interviewId, answerText });
      if (response?.error) {
        UIHelper.hideLoading();
        UIHelper.error(response.error);
        return;
      }

      const evaluation = response.evaluation || response.data?.evaluation || null;
      const nextQuestion = response.nextQuestion || response.data?.nextQuestion || response.question || response.data?.question || '';
      const assistantReply = response.assistantReply || response.data?.assistantReply || '';
      const scores = response.scores || response.data?.scores || {};
      this.answers.push({ question: this.currentQuestion, answer: answerText, evaluation, scores });
      this.transcript.push({ role: 'user', message: answerText });
      this.transcript.push({ role: 'assistant', message: assistantReply });
      this.transcript.push({ role: 'assistant', message: nextQuestion });
      this.renderTranscript();
      this.renderEvaluation({ question: this.currentQuestion, answer: answerText, evaluation, assistantReply, scores });

      UIHelper.hideLoading();
      if (nextQuestion) {
        this.currentQuestion = nextQuestion;
        this.questionCount += 1;
        this.updateProgressUI();
        this.setStatus('generating');
        await this.speakAndWait(assistantReply ? `${assistantReply} ${nextQuestion}` : nextQuestion);
        this.setStatus('listening');
        this.displayQuestion(nextQuestion);
        this.enableMic();
      } else {
        await api.post(CONFIG.ENDPOINTS.END_INTERVIEW, { interviewId });
        localStorage.removeItem(CONFIG.STORAGE_KEYS.INTERVIEW_SESSION);
        window.location.href = `/interview-results.html?id=${interviewId}`;
      }
    } catch (error) {
      console.error('[voice] Error submitting answer:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to submit answer. Please try again.');
    } finally {
      this.submitting = false;
      this.currentAnswer = '';
      this.showLiveTranscript('');
    }
  }

  renderEvaluation({ question, answer, evaluation, assistantReply, scores }) {
    const container = document.querySelector('.previous-questions');
    if (!container) return;

    const listEl = container.querySelector('.previous-list') || container;
    const node = document.createElement('div');
    node.className = 'result-item';
    const qText = question?.question || question?.text || question || 'Question';
    node.innerHTML = `
      <div class="result-item-title">${qText}</div>
      <div class="result-item-description"><strong>Your answer:</strong> ${answer}</div>
      <div class="result-item-description"><strong>Feedback:</strong> ${evaluation?.finalSummary || evaluation?.finalReport || assistantReply || 'N/A'}</div>
      <div class="result-item-description"><strong>Score:</strong> ${scores?.finalScore || evaluation?.finalScore || 'N/A'}</div>
    `;
    listEl.insertBefore(node, listEl.firstChild);
  }

  async endInterview() {
    try {
      UIHelper.showLoading('Finishing interview...');
      const interviewId = this.interviewSession?.interviewId || this.interviewSession?.id || this.interviewSession?._id;
      const response = await api.post(CONFIG.ENDPOINTS.END_INTERVIEW, { interviewId });
      this.clearTimers();
      localStorage.removeItem(CONFIG.STORAGE_KEYS.INTERVIEW_SESSION);
      UIHelper.hideLoading();
      if (!response?.error) {
        window.location.href = `/interview-results.html?id=${interviewId}`;
      }
    } catch (error) {
      console.error('Error ending interview:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to end interview');
    }
  }

  async exitInterview() {
    const confirmed = confirm('Are you sure you want to exit? Your interview progress will be saved.');
    if (!confirmed) return;
    if (this.recognition && this.isListening) {
      try { this.recognition.stop(); } catch (error) { console.warn(error); }
    }
    await this.endInterview();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.synthesis.cancel();
      UIHelper.info('Audio muted');
    } else {
      UIHelper.info('Audio enabled');
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new VoiceInterview();
  });
} else {
  new VoiceInterview();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VoiceInterview;
}
