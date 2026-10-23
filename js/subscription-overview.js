const loadSubscriptionOverview = async () => {
  const container = document.getElementById('dashboard-subscription');
  if (!container) return;

  try {
    const response = await api.getSubscription();
    if (response.error || !response.data) {
      throw new Error(response.error || 'Subscription information is unavailable.');
    }

    const { planName = 'Basic', usage = { resumeAnalyses: 0, voiceInterviews: 0 }, limits = { resumeAnalyses: 3, voiceInterviews: 2 } } = response.data;
    const usageText = `${usage.resumeAnalyses}/${limits.resumeAnalyses} resume analyses · ${usage.voiceInterviews}/${limits.voiceInterviews} voice interviews`;
    const progressValue = Math.min(100, Math.max(20, ((usage.resumeAnalyses + usage.voiceInterviews) / Math.max(1, (limits.resumeAnalyses + limits.voiceInterviews))) * 100));

    container.innerHTML = `
      <div class="plan-header">
        <span class="plan-badge">👑</span>
        <strong>Your plan</strong>
      </div>
      <div class="plan-name">${planName}</div>
      <p>${usageText}</p>
      <div class="plan-progress"><span style="width: ${progressValue}%"></span></div>
      <a class="section-link" href="subscription.html">Manage subscription</a>
    `;
  } catch (error) {
    console.error('Could not load subscription overview.', error);
    container.innerHTML = `
      <div class="plan-header">
        <span class="plan-badge">👑</span>
        <strong>Your plan</strong>
      </div>
      <div class="plan-name">Basic</div>
      <p>Subscription usage is temporarily unavailable.</p>
      <div class="plan-progress"><span style="width: 24%"></span></div>
      <a class="section-link" href="subscription.html">Manage subscription</a>
    `;
  }
};

loadSubscriptionOverview();
