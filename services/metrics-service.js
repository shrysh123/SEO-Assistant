import config from '../config.js';

class MetricsService {
  constructor() {
    this.cache = new Map();
    this.rateLimitCounter = 0;
    this.lastResetTime = Date.now();
  }

  async getMetricsData(url) {
    try {
      // Check cache first
      const cachedData = this.getCachedData(url);
      if (cachedData) return cachedData;

      // Check rate limiting
      if (!this.checkRateLimit()) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      const domain = new URL(url).hostname;
      
      // Parallel requests for better performance
      const [domainMetrics, pageMetrics] = await Promise.all([
        this.getDomainMetrics(domain),
        this.getPageMetrics(url)
      ]);

      const result = {
        domain: domainMetrics,
        page: pageMetrics
      };

      // Cache the results
      this.cacheData(url, result);

      return result;
    } catch (error) {
      console.error('Metrics Service Error:', error);
      throw error;
    }
  }

  async getDomainMetrics(domain) {
    try {
      // 1. Get backlinks data using CommonCrawl
      const backlinksData = await this.getBacklinksFromCommonCrawl(domain);
      
      // 2. Get domain authority using alternative metrics
      const authorityScore = await this.calculateAuthorityScore(domain);
      
      // 3. Get search traffic estimation using Google Trends
      const searchTraffic = await this.getSearchTrafficEstimate(domain);

      return {
        rating: authorityScore,
        refPages: backlinksData.refPages,
        refDomains: backlinksData.refDomains,
        searchTraffic: searchTraffic
      };
    } catch (error) {
      console.error('Domain Metrics Error:', error);
      throw error;
    }
  }

  async getPageMetrics(url) {
    try {
      // 1. Get page-specific backlinks
      const backlinksData = await this.getBacklinksFromCommonCrawl(url);
      
      // 2. Calculate page authority
      const pageScore = await this.calculatePageScore(url);
      
      // 3. Estimate page traffic using Google Search Console API
      const searchTraffic = await this.getPageTrafficEstimate(url);

      return {
        rating: pageScore,
        refPages: backlinksData.refPages,
        refDomains: backlinksData.refDomains,
        searchTraffic: searchTraffic
      };
    } catch (error) {
      console.error('Page Metrics Error:', error);
      throw error;
    }
  }

  async getBacklinksFromCommonCrawl(target) {
    const commonCrawlUrl = `https://index.commoncrawl.org/CC-MAIN-2023-14-index?url=${target}&output=json`;
    
    try {
      const response = await fetch(commonCrawlUrl);
      const data = await response.text();
      const lines = data.trim().split('\n');
      
      // Count unique domains and total backlinks
      const domains = new Set();
      lines.forEach(line => {
        try {
          const entry = JSON.parse(line);
          domains.add(new URL(entry.url).hostname);
        } catch (e) {}
      });

      return {
        refPages: lines.length,
        refDomains: domains.size
      };
    } catch (error) {
      console.error('CommonCrawl Error:', error);
      return { refPages: 0, refDomains: 0 };
    }
  }

  async calculateAuthorityScore(domain) {
    try {
      // Combine multiple signals for authority score
      const [alexaRank, mozRank, socialSignals] = await Promise.all([
        this.getAlexaRank(domain),
        this.getMozRank(domain),
        this.getSocialSignals(domain)
      ]);

      // Normalize and combine scores
      const score = this.normalizeScore(alexaRank, mozRank, socialSignals);
      return Math.min(Math.round(score), 100);
    } catch (error) {
      return 0;
    }
  }

  async getSearchTrafficEstimate(domain) {
    try {
      const response = await fetch(
        `https://trends.google.com/trends/api/explore?q=${domain}`
      );
      const data = await response.text();
      // Process Google Trends data to estimate traffic
      return this.processGoogleTrendsData(data);
    } catch (error) {
      return 0;
    }
  }

  // Helper methods
  getCachedData(url) {
    const cached = this.cache.get(url);
    if (cached && (Date.now() - cached.timestamp) < config.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  cacheData(url, data) {
    this.cache.set(url, {
      data,
      timestamp: Date.now()
    });
  }

  checkRateLimit() {
    const now = Date.now();
    if (now - this.lastResetTime > config.RATE_LIMIT.perTimeWindow * 1000) {
      this.rateLimitCounter = 0;
      this.lastResetTime = now;
    }
    
    if (this.rateLimitCounter >= config.RATE_LIMIT.requests) {
      return false;
    }
    
    this.rateLimitCounter++;
    return true;
  }

  normalizeScore(...scores) {
    // Implement score normalization logic
    return scores.reduce((acc, score) => acc + score, 0) / scores.length;
  }

  processGoogleTrendsData(data) {
    // Implement Google Trends data processing logic
    return Math.floor(Math.random() * 5000); // Placeholder
  }
}

export default new MetricsService();