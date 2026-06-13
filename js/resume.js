
/* ============================================
   RESUME ANALYZER MODULE
   ============================================ */

class ResumeAnalyzer {
  constructor() {
    if (window.resumeAnalyzerInstance) {
      console.warn('[resume] ResumeAnalyzer already initialized');
      return window.resumeAnalyzerInstance;
    }
    window.resumeAnalyzerInstance = this;

    this.currentFile = null;
    this.analysisResults = null;
    this.init();
  }

  async init() {
    // Check authentication
    if (!authManager.isAuthenticated()) {
      window.location.href = 'login.html';
      return;
    }

    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Upload box
    const uploadBox = document.getElementById('upload-box');
    const fileInput = document.getElementById('resume-file');

    if (uploadBox) {
      console.log('[resume] setupEventListeners uploadBox click registered');
      uploadBox.addEventListener('click', (e) => {
        const target = e.target instanceof Element ? e.target : e.target.parentElement;
        console.log('[resume] uploadBox click target', target?.id || target?.className || target?.nodeName);
        if (target?.closest('#btn-analyze')) {
          return;
        }
        if (target?.closest('#btn-reselect')) {
          return;
        }
        fileInput?.click();
      });

      // Drag and drop
      uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('drag-over');
      });

      uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('drag-over');
      });

      uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.handleFileSelect(files[0]);
        }
      });
    }

    // File input
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        console.log('[resume] fileInput change event', e.target.files.length);
        if (e.target.files.length > 0) {
          this.handleFileSelect(e.target.files[0]);
        }
      });
    }

    // Analyze button
    const analyzeBtn = document.getElementById('btn-analyze');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.analyzeResume());
    }
  }

  /**
   * Handle file selection
   */
  async handleFileSelect(file) {
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      UIHelper.error('Please upload a PDF or DOCX file');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      UIHelper.error('File size must be less than 5MB');
      return;
    }

    this.currentFile = file;

    // Show file info
    const uploadBox = document.getElementById('upload-box');
    if (uploadBox) {
      uploadBox.innerHTML = `
        <div style="text-align: center;">
          <p class="text-lg font-bold">${file.name}</p>
          <p class="text-sm text-muted">${(file.size / 1024).toFixed(2)} KB</p>
          <button class="btn btn-secondary mt-lg" id="btn-analyze">
            Analyze Resume
          </button>
        </div>
      `;

      const analyzeButton = document.getElementById('btn-analyze');
      if (analyzeButton) {
        analyzeButton.addEventListener('click', (e) => {
          e.stopPropagation();
          this.analyzeResume();
        });
      }
    }
  }

  /**
   * Analyze resume
   */
  async analyzeResume() {
    if (!this.currentFile) {
      UIHelper.error('Please select a resume file');
      return;
    }

    try {
      UIHelper.showLoading('Uploading and analyzing resume...');

      // Upload file
      const uploadResponse = await api.uploadResume(this.currentFile);
      console.log('[resume] uploadResponse', uploadResponse);

      if (uploadResponse.error) {
        UIHelper.hideLoading();
        UIHelper.error(uploadResponse.error);
        return;
      }

      const resumeId =
        uploadResponse?.data?._id ||
        uploadResponse?.data?.id ||
        uploadResponse?.resumeId ||
        uploadResponse?.id ||
        uploadResponse?._id;
      console.log('[resume] extracted resumeId', resumeId);

      const analysisData = uploadResponse?.data && (
        uploadResponse.data.atsScore !== undefined ||
        uploadResponse.data.extractedText !== undefined ||
        uploadResponse.data.missingSkills !== undefined ||
        uploadResponse.data.suggestions !== undefined
      )
        ? uploadResponse.data
        : null;

      if (analysisData) {
        this.analysisResults = analysisData;
        this.displayResults(analysisData);
        UIHelper.hideLoading();
        UIHelper.success('Resume uploaded and analyzed successfully!');
        return;
      }

      if (!resumeId) {
        UIHelper.hideLoading();
        UIHelper.error('Could not determine uploaded resume ID');
        return;
      }

      // Analysis should be returned with the upload response. If not, inform the user.
      UIHelper.hideLoading();
      UIHelper.error('Resume uploaded but analysis not available. Please try again.');
    } catch (error) {
      console.error('Error analyzing resume:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to analyze resume');
    }
  }

  /**
   * Extract strengths from resume text
   */
  extractStrengths(data) {
    const strengths = [];

    // Add ATS score insight
    if (data.atsScore >= 70) {
      strengths.push('Strong ATS compatibility (score: ' + data.atsScore + ')');
    } else if (data.atsScore >= 50) {
      strengths.push('Moderate ATS compatibility (score: ' + data.atsScore + ')');
    }

    // Parse extractedText for sections
    if (data.extractedText) {
      const text = data.extractedText;

      // Check for education
      if (text.match(/EDUCATION|Education|degree|diploma|certification/i)) {
        strengths.push('Strong educational background documented');
      }

      // Check for experience
      if (text.match(/EXPERIENCE|Experience|years|apprentice|trainee|role/i)) {
        strengths.push('Relevant professional experience highlighted');
      }

      // Check for technical skills
      if (text.match(/Technical|Skills|software|tools|languages|SAP|Excel|ERP/i)) {
        strengths.push('Technical skills clearly articulated');
      }

      // Check for certifications
      if (text.match(/CERTIFICATION|Certificate|certified/i)) {
        strengths.push('Relevant certifications included');
      }

      // Check for contact info
      if (text.match(/CONTACT|Email|Phone|Address|LinkedIn/i)) {
        strengths.push('Contact information properly formatted');
      }
    }

    return strengths.length > 0 ? strengths : ['Resume successfully uploaded and processed'];
  }

  /**
   * Extract improvements from suggestions
   */
  extractImprovements(suggestions) {
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      return [
        'Consider restructuring resume layout for better readability',
        'Review keyword optimization for your target role',
        'Ensure consistent formatting throughout document'
      ];
    }
    return suggestions.slice(0, 3);
  }

  /**
   * Display analysis results
   */
  displayResults(data) {
    // Hide upload section
    const uploadSection = document.querySelector('.upload-section');
    if (uploadSection) {
      uploadSection.style.display = 'none';
    }

    // Display results
    const resultsContainer = document.querySelector('.analysis-results');
    if (!resultsContainer) return;

    const strengths = this.extractStrengths(data);
    const improvements = this.extractImprovements(data.suggestions);

    resultsContainer.innerHTML = `
      <div class="analysis-results-grid">
        ${this.createScoreCard('ATS Score', data.atsScore, 100)}
        ${this.createScoreCard('Match Score', data.matchScore || 0, 100)}
        ${this.createScoreCard('Readability', data.readability || 0, 100)}
      </div>

      <div class="report-card">
        <div class="report-card-title">
          <span class="report-card-icon">✅</span>
          Resume Strengths
        </div>
        <ul class="report-items">
          ${strengths
            .map((strength) => `<li class="report-item"><span class="report-item-icon">•</span><div class="report-item-content"><div class="report-item-title">${strength}</div></div></li>`)
            .join('')}
        </ul>
      </div>

      <div class="report-card">
        <div class="report-card-title">
          <span class="report-card-icon">⚠️</span>
          Areas for Improvement
        </div>
        <ul class="report-items">
          ${improvements
            .map((improvement) => `<li class="report-item"><span class="report-item-icon">•</span><div class="report-item-content"><div class="report-item-title">${improvement}</div></div></li>`)
            .join('')}
        </ul>
      </div>

      <div class="report-card">
        <div class="report-card-title">
          <span class="report-card-icon">🎯</span>
          Missing Skills
        </div>
        <div class="skills-grid">
          ${(data.missingSkills || [])
            .map((skill) => `<div class="skill-tag missing">${skill}</div>`)
            .join('')}
        </div>
      </div>

      <div class="report-card">
        <div class="report-card-title">
          <span class="report-card-icon">💡</span>
          AI Suggestions
        </div>
        <div class="suggestions-container">
          ${(data.suggestions || []).map((suggestion, index) => {
            if (typeof suggestion === 'string') {
              return `
                <div class="suggestion-card">
                  <div class="suggestion-number">${index + 1}</div>
                  <div class="suggestion-description">${suggestion}</div>
                </div>
              `;
            }

            return `
              <div class="suggestion-card">
                <div class="suggestion-number">${index + 1}</div>
                <div class="suggestion-title">${suggestion.title || 'Suggestion'}</div>
                <div class="suggestion-description">${suggestion.description || suggestion.text || ''}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="flex gap-lg mt-2xl">
        <button class="btn btn-primary" onclick="location.reload()">Analyze Another Resume</button>
        <button class="btn btn-secondary" onclick="window.location.href='dashboard.html'">Back to Dashboard</button>
      </div>
    `;

    // Scroll to results
    UIHelper.scrollTo(resultsContainer);
  }

  /**
   * Create score card HTML
   */
  createScoreCard(title, score, maxScore = 100) {
    const percentage = (score / maxScore) * 100;
    return `
      <div class="score-card">
        <div class="score-card-value">${score}</div>
        <div class="score-card-label">${title}</div>
        <div class="score-card-progress">
          <div class="score-card-progress-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ResumeAnalyzer();
  });
} else {
  new ResumeAnalyzer();
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResumeAnalyzer;
}
