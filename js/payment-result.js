class PaymentResultPage {
  constructor() {
    this.isFailurePage = window.location.pathname.endsWith('payment-failure.html');
    this.message = document.getElementById('payment-result-message');
    this.heading = document.getElementById('payment-result-heading');
    this.details = document.getElementById('payment-result-details');
    this.error = document.getElementById('payment-result-error');
    this.orderId = new URLSearchParams(window.location.search).get('orderId');
    this.init();
  }

  async init() {
    if (!api.getToken()) {
      window.location.href = 'login.html';
      return;
    }

    if (this.isFailurePage) {
      await this.loadFailureStatus();
      return;
    }

    if (!this.orderId) {
      this.message.textContent = 'No verified payment order was provided. Opening this page directly does not activate a plan.';
      return;
    }

    let response;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      response = await api.getPaymentStatus(this.orderId);
      if (response.error || response.data?.status === 'verified') break;
      if (attempt < 4) await new Promise((resolve) => window.setTimeout(resolve, 2000));
    }
    if (response.error) {
      this.showError('We could not confirm this payment. Please check your subscription page or contact support.');
      return;
    }
    if (response.data?.status !== 'verified') {
      this.message.textContent = 'Payment confirmation is pending. Your existing plan remains unchanged until server verification completes.';
      return;
    }

    const subscription = response.data.subscription;
    this.message.textContent = `Payment confirmed. Your ${subscription.planName} access is active.`;
    const expiry = document.createElement('p');
    expiry.textContent = `Current plan expires: ${subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : 'No expiry'}`;
    this.details.appendChild(expiry);
  }

  async loadFailureStatus() {
    const failureReason = new URLSearchParams(window.location.search).get('reason');
    if (failureReason === 'checkout_error' && this.error) {
      this.error.textContent = 'Razorpay could not load the checkout preferences. Since this session is using a local address, try the deployed HTTPS website and verify that its website URL is configured in Razorpay Dashboard. Confirm the browser key ID and backend key secret are from the same Test mode account.';
      this.error.hidden = false;
    }
    if (!this.orderId) return;
    const response = await api.getPaymentStatus(this.orderId);
    if (response.error) {
      this.showError('We could not load this checkout status. Your current plan has not been changed by this page.');
      return;
    }
    if (response.data?.status === 'verified') {
      if (this.heading) this.heading.textContent = 'Payment verified';
      this.message.textContent = 'This payment was verified successfully. Your active plan is shown below.';
      return;
    }
    this.message.textContent = 'The payment was not verified as captured. Your previous active plan remains in place.';
  }

  showError(message) {
    this.error.textContent = message;
    this.error.hidden = false;
  }
}

new PaymentResultPage();
