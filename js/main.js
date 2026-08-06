/* ============================================
   UTILITY FUNCTIONS & UI HELPERS
   ============================================ */

class UIHelper {
  /**
   * Show toast notification
   */
  static showToast(message, type = 'info', duration = CONFIG.UI.TOAST_DURATION) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Add styles if not already defined
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 16px 24px;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          z-index: 9999;
          animation: slideIn 0.3s ease-out;
          max-width: 300px;
        }
        .toast-success {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
        }
        .toast-error {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }
        .toast-warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }
        .toast-info {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Show success toast
   */
  static success(message) {
    this.showToast(message, 'success');
  }

  /**
   * Show error toast
   */
  static error(message) {
    this.showToast(message, 'error');
  }

  /**
   * Show warning toast
   */
  static warning(message) {
    this.showToast(message, 'warning');
  }

  /**
   * Show info toast
   */
  static info(message) {
    this.showToast(message, 'info');
  }

  /**
   * Show loading indicator
   */
  static showLoading(message = 'Loading...') {
    const loader = document.createElement('div');
    loader.id = 'app-loader';
    loader.innerHTML = `
      <div class="loader-overlay">
        <div class="loader-content">
          <div class="spinner"></div>
          <p>${message}</p>
        </div>
      </div>
    `;

    if (!document.getElementById('loader-styles')) {
      const style = document.createElement('style');
      style.id = 'loader-styles';
      style.textContent = `
        .loader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 14, 39, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9998;
        }
        .loader-content {
          text-align: center;
        }
        .loader-content p {
          margin-top: 16px;
          color: var(--color-text-secondary);
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(loader);
  }

  /**
   * Hide loading indicator
   */
  static hideLoading() {
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.remove();
    }
  }

  /**
   * Show confirmation dialog
   */
  static async confirm(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>${title}</h3>
          </div>
          <div class="modal-body">
            <p>${message}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" data-action="cancel">${cancelText}</button>
            <button class="btn btn-primary" data-action="confirm">${confirmText}</button>
          </div>
        </div>
      `;

      if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(10, 14, 39, 0.8);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
          }
          .modal-content {
            background: #ffffff;
            border: 1px solid rgba(229, 231, 235, 0.9);
            border-radius: 16px;
            padding: 24px;
            max-width: 400px;
            box-shadow: 0 8px 32px rgba(15, 23, 42, 0.16);
          }
          .modal-header h3 {
            margin: 0;
            color: #111827;
          }
          .modal-body {
            margin: 16px 0 24px;
          }
          .modal-body p {
            margin: 0;
            color: #4b5563;
          }
          .modal-footer {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }
          .modal-footer .btn {
            min-width: 100px;
          }
        `;
        document.head.appendChild(style);
      }

      document.body.appendChild(modal);

      const handleClick = (e) => {
        const action = e.target.dataset.action;
        modal.remove();
        resolve(action === 'confirm');
      };

      modal.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', handleClick);
      });
    });
  }

  /**
   * Format date
   */
  static formatDate(date, format = 'MMM DD, YYYY') {
    const d = new Date(date);
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    return `${month} ${day}, ${year}`;
  }

  /**
   * Format time
   */
  static formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  }

  /**
   * Format number with commas
   */
  static formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Debounce function
   */
  static debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Throttle function
   */
  static throttle(func, limit = 1000) {
    let lastRun = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastRun >= limit) {
        func.apply(this, args);
        lastRun = now;
      }
    };
  }

  /**
   * Validate form
   */
  static validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input, textarea, select');
    const errors = {};

    inputs.forEach((input) => {
      if (input.required && !input.value.trim()) {
        errors[input.name] = `${input.placeholder || input.name} is required`;
      }

      if (input.type === 'email' && input.value) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!re.test(input.value)) {
          errors[input.name] = 'Please enter a valid email';
        }
      }

      if (input.minLength && input.value.length < input.minLength) {
        errors[input.name] = `${input.name} must be at least ${input.minLength} characters`;
      }
    });

    return { isValid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Disable button
   */
  static disableButton(button) {
    button.disabled = true;
    button.classList.add('opacity-50');
    button.style.cursor = 'not-allowed';
  }

  /**
   * Enable button
   */
  static enableButton(button) {
    button.disabled = false;
    button.classList.remove('opacity-50');
    button.style.cursor = 'pointer';
  }

  /**
   * Set button loading state
   */
  static setButtonLoading(button, loading = true) {
    if (loading) {
      button.classList.add('loading');
      this.disableButton(button);
    } else {
      button.classList.remove('loading');
      this.enableButton(button);
    }
  }

  /**
   * Clear form
   */
  static clearForm(formElement) {
    formElement.reset();
    formElement.querySelectorAll('input, textarea').forEach((input) => {
      input.value = '';
      input.classList.remove('error');
    });
  }

  /**
   * Show form errors
   */
  static showFormErrors(formElement, errors) {
    Object.entries(errors).forEach(([field, message]) => {
      const input = formElement.querySelector(`[name="${field}"]`);
      if (input) {
        input.classList.add('error');
        const errorMsg = document.createElement('small');
        errorMsg.className = 'error-message';
        errorMsg.textContent = message;
        input.parentElement.appendChild(errorMsg);
      }
    });
  }

  /**
   * Scroll to element
   */
  static scrollTo(element, offset = 80) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  }

  /**
   * Copy to clipboard
   */
  static copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.success('Copied to clipboard!');
    });
  }

  /**
   * Check if device is mobile
   */
  static isMobile() {
    return window.innerWidth <= 768;
  }

  /**
   * Check if device is tablet
   */
  static isTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  }

  /**
   * Get viewport width
   */
  static getViewportWidth() {
    return window.innerWidth;
  }

  /**
   * Add event listener with cleanup
   */
  static addEventListener(element, event, handler) {
    if (element) {
      element.addEventListener(event, handler);
      return () => element.removeEventListener(event, handler);
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIHelper;
}
