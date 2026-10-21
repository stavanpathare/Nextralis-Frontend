const loadSubscriptionOverview = async () => {
  const container = document.getElementById('dashboard-subscription');
  const content = container?.querySelector('p');
  if (!content) return;

  try {
    const response = await api.getSubscription();
    if (response.error || !response.data) {
      throw new Error(response.error || 'Subscription information is unavailable.');
    }

    const { planName, usage, limits } = response.data;
    content.textContent = `${planName} · ${usage.resumeAnalyses}/${limits.resumeAnalyses} resume analyses · ${usage.voiceInterviews}/${limits.voiceInterviews} voice interviews used this month`;
  } catch (error) {
    console.error('Could not load subscription overview.', error);
    content.textContent = 'Subscription usage is temporarily unavailable.';
  }
};

loadSubscriptionOverview();
