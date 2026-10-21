const formatPublicPrice = (price) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: price.currency || 'INR',
  maximumFractionDigits: 0,
}).format(price.amountRupees);

const renderPublicPricing = async () => {
  const grid = document.querySelector('.pricing-grid');
  if (!grid) return;
  const response = await api.getPlanCatalogue();
  if (response.error || !Array.isArray(response.data)) {
    grid.textContent = 'Plan pricing is temporarily unavailable. Please check again later.';
    return;
  }

  const cards = response.data.map((plan, index) => {
    const card = document.createElement('article');
    card.className = `pricing-card${index === 1 ? ' pricing-card-popular' : ''}`;
    if (index === 1) {
      const popular = document.createElement('div');
      popular.className = 'pricing-popular-badge';
      popular.textContent = '★ Most Popular';
      card.appendChild(popular);
    }
    const title = document.createElement('h3');
    title.className = 'pricing-name';
    title.textContent = plan.name;
    const description = document.createElement('p');
    description.className = 'pricing-description';
    description.textContent = plan.description;
    const priceLine = document.createElement('p');
    priceLine.className = 'pricing-price';
    const featureList = document.createElement('ul');
    featureList.className = 'pricing-features';
    const quota = document.createElement('li');
    quota.textContent = `${plan.limits.resumeAnalyses} resume analyses and ${plan.limits.voiceInterviews} voice interviews per quota month`;
    featureList.appendChild(quota);
    for (const feature of plan.features) {
      const item = document.createElement('li');
      item.textContent = feature;
      featureList.appendChild(item);
    }

    if (plan.id === 'basic') {
      const amount = document.createElement('span');
      amount.textContent = '₹0';
      const period = document.createElement('span');
      period.className = 'pricing-period';
      period.textContent = '/ free';
      priceLine.append(amount, period);
    } else {
      const priceValues = Object.entries(plan.prices).map(([duration, price]) =>
        `${duration === 'monthly' ? '30 days' : '365 days'}: ${formatPublicPrice(price)}`
      );
      const amount = document.createElement('span');
      amount.textContent = priceValues.join(' · ');
      priceLine.appendChild(amount);
    }

    const action = document.createElement('a');
    action.className = 'pricing-cta';
    action.href = 'register.html';
    action.textContent = 'Get Started →';
    card.append(title, description, priceLine, featureList, action);
    return card;
  });
  grid.replaceChildren(...cards);
};

renderPublicPricing().catch((error) => {
  console.error('Unable to load public plan catalogue.', error);
});
