
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
    this.isAnalyzing = false;
    this.listenersBound = false;
    this.fileInputBoundElement = null;
    this.init();
  }

  async init() {
    if (!authManager.isAuthenticated()) {
      window.location.href = 'login.html';
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const resumeId = urlParams.get('id');

    this.setupEventListeners();
    await this.loadResumeHistory();

    if (resumeId) {
      await this.loadResumeAnalysis(resumeId);
    } else {
      this.resetToUploadView();
    }
  }

  setupEventListeners() {
    if (this.listenersBound) {
      this.attachCurrentFileInputListener();
      return;
    }

    this.listenersBound = true;
    const uploadBox = document.getElementById('upload-box');
    const fileInput = document.getElementById('resume-file');

    if (uploadBox) {
      uploadBox.addEventListener('click', (e) => {
        const target = e.target instanceof Element ? e.target : e.target.parentElement;
        if (target?.closest('#btn-analyze')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        this.openFilePicker();
      });

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

    if (fileInput) {
      fileInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    this.attachCurrentFileInputListener();

    const analyzeBtn = document.getElementById('btn-analyze');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.analyzeResume();
      });
    }
  }

  openFilePicker() {
    const currentFileInput = document.getElementById('resume-file');
    currentFileInput?.click();
  }

  attachCurrentFileInputListener() {
    const fileInput = document.getElementById('resume-file');
    if (!fileInput || this.fileInputBoundElement === fileInput) {
      return;
    }

    this.fileInputBoundElement = fileInput;
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileSelect(e.target.files[0]);
      }
    });
  }

  async handleFileSelect(file) {
    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      UIHelper.error('Please upload a PDF file');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      UIHelper.error('File size must be less than 5MB');
      return;
    }

    this.currentFile = file;

    const uploadBox = document.getElementById('upload-box');
    const uploadStatus = document.getElementById('upload-status-value');
    if (uploadStatus) {
      uploadStatus.textContent = `✓ ${this.escapeHtml(file.name)} • ${(file.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze`;
      uploadStatus.style.color = 'var(--color-success, #16a34a)';
    }

    if (uploadBox) {
      uploadBox.innerHTML = `
        <div class="upload-box-preview">
          <div class="upload-box-title">✓ ${this.escapeHtml(file.name)}</div>
          <div class="upload-box-description">${(file.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze</div>
          <button type="button" class="btn btn-secondary mt-lg" id="btn-analyze">Analyze Resume</button>
        </div>
      `;

      this.listenersBound = false;
      this.setupEventListeners();
    }
  }

  async analyzeResume() {
    if (!this.currentFile) {
      UIHelper.error('Please select a resume file');
      return;
    }

    if (this.isAnalyzing) {
      return;
    }

    const role = document.getElementById('job-role-input')?.value?.trim() || '';
    const jobDescription = document.getElementById('job-description-input')?.value?.trim() || '';

    this.isAnalyzing = true;
    this.setAnalyzeButtonState(true);
    const uploadStatus = document.getElementById('upload-status-value');
    if (uploadStatus) {
      uploadStatus.textContent = 'Uploading and analyzing your PDF…';
      uploadStatus.style.color = 'var(--color-text-secondary)';
    }

    try {
      UIHelper.showLoading('Uploading and analyzing resume...');
      const uploadResponse = await api.uploadResume(this.currentFile, { role, jobDescription });
      console.log('[UPLOAD RESPONSE]', uploadResponse);

      if (uploadResponse?.error || uploadResponse?.success === false) {
        UIHelper.hideLoading();
        UIHelper.error(uploadResponse?.error || uploadResponse?.message || 'Failed to analyze resume');
        return;
      }

      const resumeRecord = uploadResponse?.data || uploadResponse;
      const resumeId = resumeRecord?._id || resumeRecord?.id || resumeRecord?.resumeId;

      if (!resumeId) {
        console.error('Resume ID missing', resumeRecord);
        UIHelper.error('Resume created but no Resume ID returned.');
        return;
      }

      this.analysisResults = this.normalizeAnalysisPayload(resumeRecord);
      this.updateUrl(resumeId);
      this.displayResults(this.analysisResults);
      await this.loadResumeHistory();
      UIHelper.success('Resume uploaded and analyzed successfully!');
    } catch (error) {
      console.error('Error analyzing resume:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to analyze resume');
    } finally {
      this.isAnalyzing = false;
      this.setAnalyzeButtonState(false);
      UIHelper.hideLoading();
    }
  }

  async loadResumeAnalysis(resumeId) {
    try {
      UIHelper.showLoading('Loading resume analysis...');
      const response = await api.getResumeAnalysis(resumeId);
      const resumeRecord = response?.data || response;

      if (response?.error) {
        UIHelper.hideLoading();
        UIHelper.error(response.error || 'Failed to load resume analysis');
        return;
      }

      if (resumeRecord) {
        this.analysisResults = this.normalizeAnalysisPayload(resumeRecord);
        this.updateUrl(resumeId);
        this.displayResults(this.analysisResults);
      }

      UIHelper.hideLoading();
    } catch (error) {
      console.error('[resume] Error loading resume analysis:', error);
      UIHelper.hideLoading();
      UIHelper.error('Failed to load resume analysis');
    }
  }

  async loadResumeHistory() {
    try {
      const historyPanel = document.getElementById('resume-history-list');
      if (!historyPanel) return;

      const response = await api.getResumeHistory();
      const history =
        response.data ||
        response.resumes ||
        response.history ||
        [];

      if (!history.length) {
        historyPanel.innerHTML = '<div class="history-item"><div><div class="history-item-title">No analyses yet</div><div class="history-item-meta">Upload a resume to create your first AI report.</div></div></div>';
        return;
      }

      historyPanel.innerHTML = history.slice(0, 4).map((item) => {
        const score = item.analysisData?.overallScore || item.overallScore || item.atsScore || 0;
        const role = this.escapeHtml(item.role || 'General');
        const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently analyzed';
        const resumeId = item._id || item.id;
        return `
          <div class="history-item">
            <div>
              <div class="history-item-title">${role}</div>
              <div class="history-item-meta">${createdAt} • ${Math.round(score)} overall score</div>
            </div>
            <button type="button" class="btn btn-ghost" data-resume-id="${this.escapeHtml(resumeId || '')}">Open</button>
          </div>
        `;
      }).join('');

      historyPanel.querySelectorAll('[data-resume-id]').forEach((button) => {
        button.addEventListener('click', async () => {
          const resumeId = button.getAttribute('data-resume-id');
          if (resumeId) {
            await this.loadResumeAnalysis(resumeId);
          }
        });
      });
    } catch (error) {
      console.error('[resume] Error loading history:', error);
    }
  }

  normalizeAnalysisPayload(payload) {
    const record = payload?.data || payload || {};
    const analysisData = record.analysisData || payload?.analysisData || {};
    return {
      ...record,
      ...analysisData,
      analysisData,
    };
  }

  displayResults(data) {
    const uploadSection = document.querySelector('.upload-section');
    const resultsContainer = document.querySelector('.analysis-results');
    if (uploadSection) {
      uploadSection.style.display = 'none';
    }
    if (resultsContainer) {
      resultsContainer.style.display = 'block';
    }
    if (!resultsContainer) return;

    const analysis = this.normalizeAnalysisPayload(data);
    const aiReview = analysis.aiReview || {};
    const categories = analysis.categories || {};
    const sections = Array.isArray(analysis.sections) && analysis.sections.length ? analysis.sections : [];
    const keywordAnalysis = analysis.keywordAnalysis || {};
    const jobMatch = analysis.jobMatch || {};
    const missingSections = Array.isArray(analysis.missingSections) ? analysis.missingSections : [];
    const recruiterView = analysis.recruiterView || {};
    const grammarAnalysis = analysis.grammarAnalysis || {};
    const qualityDashboard = Array.isArray(analysis.qualityDashboard) ? analysis.qualityDashboard : [];
    const rewrites = analysis.rewrites || {};
    const missingSkills = Array.isArray(analysis.missingSkills) ? analysis.missingSkills : (Array.isArray(keywordAnalysis.missingKeywords) ? keywordAnalysis.missingKeywords : []);
    const suggestions = Array.isArray(analysis.suggestions) ? analysis.suggestions : (Array.isArray(analysis.recommendations) ? analysis.recommendations : []);
    const matchedKeywords = Array.isArray(keywordAnalysis.matchedKeywords) ? keywordAnalysis.matchedKeywords : [];
    const missingKeywords = Array.isArray(keywordAnalysis.missingKeywords) ? keywordAnalysis.missingKeywords : [];
    const suggestedKeywords = Array.isArray(keywordAnalysis.suggestedKeywords) ? keywordAnalysis.suggestedKeywords : [];
    const overallScore = Math.round(analysis.overallScore || analysis.atsScore || 0);
    const atsScore = Math.round(analysis.atsScore || 0);
    const matchScore = Math.round(analysis.matchScore || keywordAnalysis.matchPercent || 0);
    const readability = Math.round(analysis.readability || 0);

    resultsContainer.innerHTML = `
      <div class="analysis-results-shell">
        <div class="hero-card">
          <div>
            <div class="hero-title">AI Resume Intelligence Report</div>
            <div class="hero-subtitle">${this.escapeHtml(aiReview.summary || 'Your resume has a strong foundation and is ready for a sharper, recruiter-focused rewrite.')}</div>
          </div>
          <div class="score-grid">
            <div class="metric-card">
              <div class="metric-value">${atsScore}</div>
              <div class="metric-label">ATS Score</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${overallScore}</div>
              <div class="metric-label">Overall</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${matchScore}</div>
              <div class="metric-label">Match</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${readability}</div>
              <div class="metric-label">Readability</div>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-card-title">📊 ATS & Quality Breakdown</div>
          <div class="progress-list">
            ${Object.entries(categories).map(([key, value]) => this.renderCategoryRow(key, value)).join('')}
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-card-title">🧠 AI Review</div>
          <div class="section-list">
            <div class="section-item">
              <div class="section-item-title">Recruiter Impression</div>
              <p>${this.escapeHtml(aiReview.recruiterImpression || 'The resume looks credible and ready for refinement.')}</p>
            </div>
            <div class="section-item">
              <div class="section-item-title">Strengths</div>
              <div class="tag-list">${this.renderTags(aiReview.strengths || [])}</div>
            </div>
            <div class="section-item">
              <div class="section-item-title">Weaknesses</div>
              <div class="tag-list">${this.renderTags(aiReview.weaknesses || [])}</div>
            </div>
            <div class="section-item">
              <div class="section-item-title">Most Impressive Section</div>
              <p>${this.escapeHtml(aiReview.mostImpressiveSection || 'Experience')}</p>
            </div>
            <div class="section-item">
              <div class="section-item-title">Weakest Section</div>
              <p>${this.escapeHtml(aiReview.weakestSection || 'Projects')}</p>
            </div>
            <div class="section-item">
              <div class="section-item-title">Recommendation</div>
              <p>${this.escapeHtml(aiReview.recommendation || 'Focus on role-specific tailoring and measurable outcomes.')}</p>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-card-title">🧩 Section-by-Section Analysis</div>
          <div class="section-list">
            ${sections.length ? sections.map((section) => this.renderSectionItem(section)).join('') : '<div class="section-item"><div class="section-item-title">No section detail available</div><p>Upload a richer resume to unlock this layer of analysis.</p></div>'}
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-card-title">🎯 Keyword Analysis</div>
          <div class="section-list">
            <div class="section-item">
              <div class="section-item-title">Target Role</div>
              <p>${this.escapeHtml(keywordAnalysis.role || analysis.role || 'General professional')}</p>
            </div>
            <div class="section-item">
              <div class="section-item-title">Matched Keywords</div>
              <div class="keyword-list">${matchedKeywords.length ? matchedKeywords.map((item) => `<span class="keyword-chip match">${this.escapeHtml(item)}</span>`).join('') : '<span class="keyword-chip match">No matches captured yet</span>'}</div>
            </div>
            <div class="section-item">
              <div class="section-item-title">Missing Keywords</div>
              <div class="keyword-list">${missingKeywords.length ? missingKeywords.map((item) => `<span class="keyword-chip missing">${this.escapeHtml(item)}</span>`).join('') : '<span class="keyword-chip missing">Add role-specific language</span>'}</div>
            </div>
            <div class="section-item">
              <div class="section-item-title">Suggested Keywords</div>
              <div class="keyword-list">${suggestedKeywords.length ? suggestedKeywords.map((item) => `<span class="keyword-chip suggested">${this.escapeHtml(item)}</span>`).join('') : '<span class="keyword-chip suggested">Tailor to the job description</span>'}</div>
            </div>
            <div class="section-item">
              <div class="section-item-title">Keyword Match</div>
              <p>${this.escapeHtml(keywordAnalysis.status || 'Needs improvement')} • ${Math.round(keywordAnalysis.matchPercent || matchScore || 0)}%</p>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-card-title">🔍 Resume vs Job Description</div>
          <div class="section-list">
            <div class="section-item">
              <div class="section-item-title">Match Score</div>
              <p>${Math.round(jobMatch.matchPercent || matchScore || 0)}% • ${this.escapeHtml(jobMatch.recruiterRecommendation || 'Proceed with revision before submission.')}</p>
            </div>
            <div class="section-item">
              <div class="section-item-title">Missing Skills</div>
              <div class="tag-list">${this.renderTags(jobMatch.missingSkills || missingSkills || [])}</div>
            </div>
            <div class="section-item">
              <div class="section-item-title">Missing Technologies</div>
              <div class="tag-list">${this.renderTags(jobMatch.missingTechnologies || [])}</div>
            </div>
            <div class="section-item">
              <div class="section-item-title">Responsibilities Missing</div>
              <div class="tag-list">${this.renderTags(jobMatch.responsibilitiesMissing || [])}</div>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-card-title">🛠️ AI Rewrite Suggestions</div>
          <div class="rewrite-list">
            ${this.renderRewriteCard('Summary', rewrites.summary)}
            ${this.renderRewriteCard('Projects', rewrites.projects)}
            ${this.renderRewriteCard('Experience', rewrites.experience)}
            ${this.renderRewriteCard('Skills', rewrites.skills)}
            ${this.renderRewriteCard('Achievements', rewrites.achievements)}
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-card-title">✅ Missing Sections Checklist</div>
          <div class="checklist-list">
            ${missingSections.length ? missingSections.map((item) => this.renderChecklistItem(item)).join('') : '<div class="checklist-item"><div class="checklist-item-title">No checks available</div><p>The analysis didn’t return section-level gaps.</p></div>'}
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-card-title">👔 Recruiter View</div>
          <div class="section-list">
            <div class="section-item">
              <div class="section-item-title">Recruiter Score</div>
              <p>${Math.round(recruiterView.recruiterScore || 0)} • ${recruiterView.shortlist ? 'Shortlist likely' : 'Needs stronger positioning'}</p>
            </div>
            <div class="section-item">
              <div class="section-item-title">Pros</div>
              <div class="tag-list">${this.renderTags(recruiterView.pros || [])}</div>
            </div>
            <div class="section-item">
              <div class="section-item-title">Cons</div>
              <div class="tag-list">${this.renderTags(recruiterView.cons || [])}</div>
            </div>
            <div class="section-item">
              <div class="section-item-title">Suggestions</div>
              <div class="tag-list">${this.renderTags(recruiterView.suggestions || [])}</div>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-card-title">✍️ Grammar & Writing</div>
          <div class="section-list">
            <div class="section-item">
              <div class="section-item-title">Issues</div>
              <div class="tag-list">${this.renderTags(grammarAnalysis.grammarIssues || [])}</div>
            </div>
            <div class="section-item">
              <div class="section-item-title">Weak Verbs</div>
              <div class="tag-list">${this.renderTags(grammarAnalysis.weakVerbs || [])}</div>
            </div>
            <div class="section-item">
              <div class="section-item-title">Recommended Fixes</div>
              <div class="tag-list">${this.renderTags(grammarAnalysis.fixes || [])}</div>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-card-title">⭐ Quality Dashboard</div>
          <div class="quality-list">
            ${qualityDashboard.length ? qualityDashboard.map((item) => this.renderQualityItem(item)).join('') : '<div class="quality-item"><div class="quality-item-title">No quality dashboard yet</div><p>Quality metrics will appear as soon as the AI returns them.</p></div>'}
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-card-title">💡 Recommendations</div>
          <div class="tag-list">${this.renderTags(suggestions)}</div>
        </div>

        <div class="panel-card">
          <div class="panel-card-title">🔁 Analyze Again</div>
          <div class="flex gap-lg">
            <button type="button" class="btn btn-primary" onclick="resetAnalyzer()">Analyze Another Resume</button>
            <button type="button" class="btn btn-secondary" onclick="window.location.href='dashboard.html'">Back to Dashboard</button>
          </div>
        </div>
      </div>
    `;

    this.attachCopyHandlers();
    UIHelper.scrollTo(resultsContainer);
  }

  renderCategoryRow(key, value) {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
    const score = Math.round(value?.score || value || 0);
    const explanation = value?.explanation || value?.recommendation || 'Ready for refinement';
    return `
      <div class="progress-row">
        <div class="progress-label">
          <span>${this.escapeHtml(label)}</span>
          <span>${score}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${score}%"></div>
        </div>
        <div class="history-item-meta">${this.escapeHtml(explanation)}</div>
      </div>
    `;
  }

  renderSectionItem(section) {
    return `
      <div class="section-item">
        <div class="section-item-title">${this.escapeHtml(section.name || 'Section')}</div>
        <p><strong>Score:</strong> ${Math.round(section.score || 0)} • <strong>Priority:</strong> ${this.escapeHtml(section.priority || 'Medium')}</p>
        <p><strong>Strengths:</strong> ${this.escapeHtml((section.strengths || []).join(', ') || 'Not yet captured')}</p>
        <p><strong>Problems:</strong> ${this.escapeHtml((section.problems || []).join(', ') || 'No issue detected')}</p>
        <p><strong>Suggested improvements:</strong> ${this.escapeHtml((section.suggestions || []).join(', ') || 'Focus on clarity and tailoring')}</p>
      </div>
    `;
  }

  renderChecklistItem(item) {
    return `
      <div class="checklist-item">
        <div class="checklist-item-title">${this.escapeHtml(item.name || 'Section')}</div>
        <p>${item.present ? 'Present' : 'Missing'} • ${this.escapeHtml(item.priority || 'Medium')}</p>
      </div>
    `;
  }

  renderQualityItem(item) {
    return `
      <div class="quality-item">
        <div class="quality-item-title">${this.escapeHtml(item.label || 'Quality')}</div>
        <p>${Math.round(item.score || 0)} / 100 • ${this.escapeHtml(item.description || 'Quality signal available')}</p>
      </div>
    `;
  }

  renderRewriteCard(title, content) {
    return `
      <div class="rewrite-card">
        <div class="rewrite-card-title">${this.escapeHtml(title)}</div>
        <p>${this.escapeHtml(content || 'Use the generated rewrite to strengthen this section.')}</p>
        <button type="button" class="copy-btn" data-copy="${this.escapeHtml(content || '')}">Copy</button>
      </div>
    `;
  }

  renderTags(items) {
    if (!Array.isArray(items) || !items.length) {
      return '<span class="tag-item">No items yet</span>';
    }
    return items.map((item) => `<span class="tag-item">${this.escapeHtml(item)}</span>`).join('');
  }

  attachCopyHandlers() {
    document.querySelectorAll('.copy-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const text = button.getAttribute('data-copy') || '';
        this.copyText(text);
      });
    });
  }

  async copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      UIHelper.success('Copied to clipboard');
    } catch (error) {
      console.error('[resume] Copy failed', error);
      UIHelper.error('Unable to copy');
    }
  }

  setAnalyzeButtonState(isAnalyzing) {
    const button = document.getElementById('btn-analyze');
    if (!button) return;

    button.disabled = isAnalyzing;
    button.textContent = isAnalyzing ? 'Analyzing...' : 'Analyze Resume';
    button.setAttribute('aria-busy', String(isAnalyzing));
  }

  updateUrl(resumeId) {
    if (!resumeId) return;

    const url = new URL(window.location.href);
    url.searchParams.set('id', resumeId);
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  }

  resetToUploadView() {
    const uploadSection = document.querySelector('.upload-section');
    const resultsContainer = document.querySelector('.analysis-results');
    const uploadStatus = document.getElementById('upload-status-value');
    const fileInput = document.getElementById('resume-file');

    if (uploadStatus) {
      uploadStatus.textContent = 'Ready for a premium review';
      uploadStatus.style.color = 'var(--color-text-secondary)';
    }

    if (fileInput) {
      fileInput.value = '';
    }

    if (uploadSection) {
      uploadSection.style.display = 'block';
    }

    if (resultsContainer) {
      resultsContainer.style.display = 'none';
      resultsContainer.innerHTML = '';
    }

    const uploadBox = document.getElementById('upload-box');
    if (uploadBox) {
      uploadBox.innerHTML = `
        <div class="upload-box-icon">📤</div>
        <div class="upload-box-text">
          <div class="upload-box-title">Drop your resume here</div>
          <div class="upload-box-description">PDF only • up to 5MB</div>
        </div>
        <button type="button" class="btn btn-secondary">Choose File</button>
        <input type="file" id="resume-file" accept=".pdf" style="display: none" />
      `;
      this.listenersBound = false;
      this.setupEventListeners();
    }

    this.currentFile = null;
    this.analysisResults = null;
    this.isAnalyzing = false;
    this.setAnalyzeButtonState(false);
  }

  resetAnalyzer() {
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    this.resetToUploadView();
  }

  escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

window.resetAnalyzer = () => {
  if (window.resumeAnalyzerInstance) {
    window.resumeAnalyzerInstance.resetAnalyzer();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ResumeAnalyzer();
  });
} else {
  new ResumeAnalyzer();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResumeAnalyzer;
}
