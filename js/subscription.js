class SubscriptionPage {
  constructor() {
    this.loading = document.getElementById('subscription-loading');
    this.error = document.getElementById('subscription-error');
    this.currentPlan = document.getElementById('current-plan');
    this.planGrid = document.getElementById('plan-grid');
    this.init();
  }

  async init() {
    if (!api.getToken()) {
      window.location.href = 'login.html';
      return;
    }

    try {
      const [subscriptionResponse, planResponse] = await Promise.all([
        api.getSubscription(),
        api.getPlanCatalogue(),
      ]);
      if (subscriptionResponse.error || planResponse.error) {
        throw new Error(subscriptionResponse.error || planResponse.error);
      }
      const subscription = subscriptionResponse.data;
      const plans = planResponse.data;
      if (!subscription || !Array.isArray(plans)) {
        throw new Error('Subscription information is incomplete.');
      }
      if (!plans.length) {
        throw new Error('No subscription plans are available right now.');
      }
      this.renderCurrentPlan(subscription);
      this.renderPlans(subscription, plans);
      this.loading.hidden = true;
    } catch (error) {
      this.loading.hidden = true;
      this.error.textContent = error.message || 'Unable to load subscription information. Please try again.';
      this.error.hidden = false;
    }
  }

  formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' });
  }

  formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: price.currency || 'INR',
      maximumFractionDigits: 0,
    }).format(price.amountRupees);
  }

  renderCurrentPlan(subscription) {
    const heading = document.createElement('div');
    heading.className = 'current-plan-heading';
    const titleGroup = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = `${subscription.planName} plan`;
    const subline = document.createElement('p');
    subline.textContent = subscription.billingDuration
      ? `${subscription.billingDuration} access`
      : 'Basic access';
    titleGroup.append(title, subline);
    const status = document.createElement('span');
    status.className = 'plan-status';
    status.textContent = subscription.status;
    heading.append(titleGroup, status);

    const dates = document.createElement('p');
    dates.textContent = subscription.effectivePlan === 'basic'
      ? subscription.status === 'expired'
        ? `Previous paid access expired ${this.formatDate(subscription.expiresAt)}. Basic access is now active.`
        : 'Basic access has no expiry date.'
      : `Started ${this.formatDate(subscription.startedAt)} · Expires ${this.formatDate(subscription.expiresAt)}`;

    const usageGrid = document.createElement('div');
    usageGrid.className = 'usage-grid';
    this.addUsage(usageGrid, 'Resume analyses', subscription.usage.resumeAnalyses, subscription.limits.resumeAnalyses, subscription.remaining.resumeAnalyses);
    this.addUsage(usageGrid, 'Voice interviews', subscription.usage.voiceInterviews, subscription.limits.voiceInterviews, subscription.remaining.voiceInterviews);

    const period = document.createElement('p');
    period.className = 'renewal-note';
    period.textContent = `Quota period: ${this.formatDate(subscription.quotaPeriod.startsAt)} – ${this.formatDate(subscription.quotaPeriod.endsAt)} (UTC)`;

    const unavailable = document.createElement('p');
    unavailable.className = 'unavailable-note';
    unavailable.textContent = 'Video interviews are not available yet.';
    this.currentPlan.replaceChildren(heading, dates, usageGrid, period, unavailable);
    this.currentPlan.hidden = false;
  }

  addUsage(container, label, used, limit, remaining) {
    const item = document.createElement('div');
    item.className = 'usage-item';
    const heading = document.createElement('div');
    heading.className = 'usage-heading';
    const name = document.createElement('strong');
    name.textContent = label;
    const count = document.createElement('span');
    count.textContent = `${used} / ${limit} used`;
    heading.append(name, count);
    const description = document.createElement('p');
    description.textContent = `${remaining} remaining this quota month`;
    item.append(heading, description);
    container.appendChild(item);
  }

  renderPlans(subscription, plans) {
    const activePaidPlan = subscription.effectivePlan !== 'basic';
    const cards = plans.map((plan) => this.createPlanCard(plan, subscription, activePaidPlan));
    this.planGrid.replaceChildren(...cards);
  }

  createPlanCard(plan, subscription, activePaidPlan) {
    const card = document.createElement('article');
    card.className = `plan-card${plan.id === subscription.effectivePlan ? ' plan-card-current' : ''}`;
    const heading = document.createElement('div');
    heading.className = 'plan-card-header';
    const name = document.createElement('h2');
    name.textContent = plan.name;
    heading.appendChild(name);
    if (plan.id === subscription.effectivePlan) {
      const current = document.createElement('span');
      current.className = 'plan-status';
      current.textContent = 'Current plan';
      heading.appendChild(current);
    }

    const description = document.createElement('p');
    description.className = 'plan-card-description';
    description.textContent = plan.description;
    const limits = document.createElement('p');
    limits.className = 'plan-card-price';
    limits.textContent = `${plan.limits.resumeAnalyses} resume analyses · ${plan.limits.voiceInterviews} voice interviews / month`;
    const features = document.createElement('ul');
    features.className = 'plan-card-features';
    for (const feature of plan.features) {
      const item = document.createElement('li');
      item.textContent = feature;
      features.appendChild(item);
    }

    const actions = document.createElement('div');
    actions.className = 'plan-card-actions';
    if (plan.id === 'basic') {
      const basicInfo = document.createElement('p');
      basicInfo.className = 'renewal-note';
      basicInfo.textContent = activePaidPlan
        ? 'Basic access starts automatically when your paid plan expires.'
        : 'Basic is the free plan.';
      actions.appendChild(basicInfo);
    } else {
      for (const duration of ['monthly', 'annual']) {
        const price = plan.prices?.[duration];
        if (!price) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-primary';
        const durationLabel = duration === 'monthly' ? '30 days' : '365 days';
        button.textContent = `${duration === 'monthly' ? 'Monthly' : 'Annual'} · ${this.formatPrice(price)} · ${durationLabel}`;
        button.disabled = activePaidPlan && plan.id !== subscription.effectivePlan;
        button.addEventListener('click', () => {
          const query = new URLSearchParams({ plan: plan.id, duration });
          window.location.href = `checkout.html?${query.toString()}`;
        });
        actions.appendChild(button);
      }
      if (activePaidPlan && plan.id !== subscription.effectivePlan) {
        const note = document.createElement('p');
        note.className = 'renewal-note';
        note.textContent = 'Plan changes are available after the current paid period expires.';
        actions.appendChild(note);
      }
    }

    card.append(heading, description, limits, features, actions);
    return card;
  }
}

new SubscriptionPage();
