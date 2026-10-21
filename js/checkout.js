const buildRazorpayCheckoutOptions = (order, planName, handler, onDismiss) => ({
  key: order.keyId,
  amount: order.amountPaise,
  currency: order.currency,
  name: 'Nextralis',
  description: `${planName} · ${order.durationDays} days`,
  order_id: order.orderId,
  prefill: { name: order.customer.name, email: order.customer.email },
  theme: { color: '#4f46e5' },
  handler,
  modal: { ondismiss: onDismiss },
});

const getRazorpayMode = (keyId) => (
  keyId.startsWith('rzp_test_') ? 'test' : keyId.startsWith('rzp_live_') ? 'live' : 'unknown'
);

class CheckoutPage {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
    this.planId = this.params.get('plan');
    this.duration = this.params.get('duration');
    this.summary = document.getElementById('checkout-summary');
    this.customer = document.getElementById('checkout-customer');
    this.error = document.getElementById('checkout-error');
    this.originNote = document.getElementById('checkout-origin-note');
    this.button = document.getElementById('pay-button');
    this.selectedPlan = null;
    this.profile = null;
    this.pendingPayment = null;
    this.init();
  }

  async init() {
    this.showLocalOriginNotice();
    if (!api.getToken()) {
      window.location.href = 'login.html';
      return;
    }
    try {
      const [plansResponse, profileResponse] = await Promise.all([
        api.getPlanCatalogue(),
        api.getProfile(),
      ]);
      if (plansResponse.error || profileResponse.error) {
        throw new Error(plansResponse.error || profileResponse.error);
      }
      this.selectedPlan = plansResponse.data.find((plan) => plan.id === this.planId);
      const price = this.selectedPlan?.prices?.[this.duration];
      if (!this.selectedPlan || !price || this.planId === 'basic') {
        throw new Error('This plan or billing duration is not available. Choose a current option from the subscription page.');
      }
      this.profile = profileResponse.data;
      this.render(price);
      this.button.disabled = false;
      this.button.addEventListener('click', () => this.startCheckout());
    } catch (error) {
      this.showError(error.message || 'Unable to prepare checkout.');
      this.summary.textContent = 'Checkout could not be prepared.';
    }
  }

  showLocalOriginNotice() {
    if (!['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) return;
    this.originNote.textContent = 'You are testing from a local address. If Razorpay displays a checkout error, try the deployed HTTPS site and confirm its website URL is configured in Razorpay Dashboard. Also verify the checkout key ID and server key secret are from the same Test mode account.';
    this.originNote.hidden = false;
  }

  render(price) {
    const title = document.createElement('strong');
    title.textContent = `${this.selectedPlan.name} · ${this.duration === 'monthly' ? '30 days' : '365 days'}`;
    const amount = document.createElement('span');
    amount.textContent = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: price.currency,
      maximumFractionDigits: 0,
    }).format(price.amountRupees);
    const duration = document.createElement('p');
    duration.textContent = 'One-time payment. Access begins after successful server verification.';
    this.summary.replaceChildren(title, amount, duration);

    const name = document.createElement('p');
    name.textContent = `Name: ${this.profile?.name || 'Not provided'}`;
    const email = document.createElement('p');
    email.textContent = `Email: ${this.profile?.email || 'Not provided'}`;
    this.customer.replaceChildren(name, email);
  }

  showError(message) {
    this.error.textContent = message;
    this.error.hidden = false;
  }

  showPendingOrder(pendingOrder) {
    if (!pendingOrder?.planId || !pendingOrder?.billingDuration) return;
    const plansLink = document.createElement('a');
    plansLink.href = `checkout.html?${new URLSearchParams({
      plan: pendingOrder.planId,
      duration: pendingOrder.billingDuration,
    }).toString()}`;
    plansLink.textContent = `Continue ${pendingOrder.planId} ${pendingOrder.billingDuration} checkout`;
    plansLink.className = 'checkout-pending-link';
    this.error.replaceChildren(
      document.createTextNode('A previous payment order is still pending. Use that order to continue, or complete/cancel it in Razorpay before choosing another plan. '),
      plansLink
    );
    this.error.hidden = false;
  }

  async startCheckout() {
    if (this.pendingPayment) {
      await this.verifyPendingPayment();
      return;
    }
    this.error.hidden = true;
    if (!window.Razorpay) {
      this.showError('The secure payment form could not be loaded. Please reload this page and try again.');
      return;
    }
    this.button.disabled = true;
    this.button.textContent = 'Preparing secure payment…';
    let orderResponse;
    try {
      orderResponse = await api.createPaymentOrder(this.planId, this.duration);
    } catch (error) {
      const pendingOrder = error.response?.data?.pendingOrder;
      if (error.response?.data?.code === 'PAYMENT_ORDER_PENDING' && pendingOrder) {
        this.showPendingOrder(pendingOrder);
      } else {
        this.showError(error.message || 'Could not contact the payment service. Check your connection and try again.');
      }
      console.error('Could not create payment order.', error);
      this.button.disabled = false;
      this.button.textContent = 'Continue to payment';
      return;
    }
    if (orderResponse.error) {
      if (orderResponse.code === 'PAYMENT_ORDER_PENDING' && orderResponse.pendingOrder) {
        this.showPendingOrder(orderResponse.pendingOrder);
      } else {
        this.showError(orderResponse.error);
      }
      this.button.disabled = false;
      this.button.textContent = 'Continue to payment';
      return;
    }

    const order = orderResponse.data;
    if (!order?.keyId || !order?.orderId || !Number.isSafeInteger(order.amountPaise) || order.amountPaise <= 0 || order.currency !== 'INR') {
      this.showError('The payment order details are incomplete. Please return to the subscription page and try again.');
      this.button.disabled = false;
      this.button.textContent = 'Continue to payment';
      return;
    }
    this.render({
      amountRupees: order.amountPaise / 100,
      currency: order.currency,
    });

    let checkoutFailed = false;
    const onPayment = async (payment) => {
      this.pendingPayment = payment;
      await this.verifyPendingPayment();
    };
    const onDismiss = () => {
      const reason = checkoutFailed ? 'checkout_error' : 'cancelled';
      window.location.href = `payment-failure.html?orderId=${encodeURIComponent(order.orderId)}&reason=${reason}`;
    };
    const checkoutOptions = buildRazorpayCheckoutOptions(
      order,
      this.selectedPlan.name,
      onPayment,
      onDismiss
    );
    const checkout = new window.Razorpay(checkoutOptions);
    checkout.on('payment.failed', (response) => {
      checkoutFailed = true;
      const reason = response?.error?.description || response?.error?.reason;
      console.warn('[payments] Razorpay checkout failed', {
        plan: order.planId,
        billingDuration: order.billingDuration,
        amountPaise: order.amountPaise,
        currency: order.currency,
        orderId: order.orderId,
        razorpayMode: getRazorpayMode(order.keyId),
        code: response?.error?.code,
        step: response?.error?.step,
        reason: response?.error?.reason,
        source: response?.error?.source,
        providerOrderId: response?.error?.metadata?.order_id,
      });
      this.showError(reason
        ? `Razorpay could not complete checkout: ${reason}`
        : 'Razorpay could not complete checkout. Your plan has not been activated.');
      this.button.disabled = false;
      this.button.textContent = 'Try checkout again';
    });
    try {
      checkout.open();
      this.button.textContent = 'Payment form opened';
    } catch (error) {
      checkoutFailed = true;
      this.showError('Razorpay checkout could not be opened. Check that the website URL and Test mode API keys are configured correctly.');
      this.button.disabled = false;
      this.button.textContent = 'Try checkout again';
      console.error('Could not open Razorpay checkout.', error);
    }
  }

  async verifyPendingPayment() {
    this.error.hidden = true;
    this.button.disabled = true;
    this.button.textContent = 'Verifying payment…';
    const verification = await api.verifyPayment(this.pendingPayment);
    if (verification.error || verification.data?.status !== 'verified') {
      this.showError(verification.error || 'Payment verification is still pending. Your plan has not been activated.');
      this.button.disabled = false;
      this.button.textContent = 'Retry verification';
      return;
    }
    const orderId = this.pendingPayment.razorpay_order_id;
    window.location.href = `payment-success.html?orderId=${encodeURIComponent(orderId)}`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildRazorpayCheckoutOptions, getRazorpayMode };
}

if (typeof document !== 'undefined') new CheckoutPage();
