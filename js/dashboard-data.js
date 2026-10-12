class DashboardDataService {
  constructor() {
    this.ttlMs = 90 * 1000;
    this.cache = new Map();
    this.inFlight = new Map();
    this.generation = 0;
  }

  getUserId() {
    const user = authManager.getCurrentUser();
    return user.id || user._id || null;
  }

  getCacheKey(userId) {
    return `nextralis-dashboard:${userId}`;
  }

  readCache(userId) {
    if (!userId) return null;
    const key = this.getCacheKey(userId);
    const memoryEntry = this.cache.get(key);
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) return memoryEntry.data;

    try {
      const storedEntry = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (storedEntry?.expiresAt > Date.now() && storedEntry.userId === userId) {
        this.cache.set(key, storedEntry);
        return storedEntry.data;
      }
      sessionStorage.removeItem(key);
    } catch (error) {
      try {
        sessionStorage.removeItem(key);
      } catch (storageError) {
        // Storage may be unavailable in restricted browser contexts.
      }
    }
    return null;
  }

  async getSummary() {
    const userId = this.getUserId();
    const key = this.getCacheKey(userId || 'unresolved');
    const generation = this.generation;
    const cachedData = this.readCache(userId);
    if (cachedData) return cachedData;
    if (this.inFlight.has(key)) return this.inFlight.get(key);

    const request = api.getDashboardSummary()
      .then((response) => {
        if (response?.error || !response?.data) {
          throw new Error(response?.error || 'Dashboard summary is unavailable');
        }
        const entry = { userId, expiresAt: Date.now() + this.ttlMs, data: response.data };
        if (userId && generation === this.generation && userId === this.getUserId()) {
          this.cache.set(this.getCacheKey(userId), entry);
          try {
            sessionStorage.setItem(this.getCacheKey(userId), JSON.stringify(entry));
          } catch (error) {
            // The in-memory cache remains available when storage is full or disabled.
          }
        }
        return response.data;
      })
      .finally(() => {
        if (this.inFlight.get(key) === request) this.inFlight.delete(key);
      });

    this.inFlight.set(key, request);
    return request;
  }

  invalidate() {
    this.generation += 1;
    this.cache.clear();
    this.inFlight.clear();
    try {
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith('nextralis-dashboard:'))
        .forEach((key) => sessionStorage.removeItem(key));
    } catch (error) {
      // Storage may be unavailable in restricted browser contexts.
    }
  }
}

window.dashboardDataService = new DashboardDataService();