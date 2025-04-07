class SEOAnalyzer {
  async analyzePage() {
    const analysis = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      function: () => {
        return {
          basic: this.getBasicSEOData(),
          technical: this.getTechnicalSEOData(),
          content: this.getContentAnalysis(),
          performance: this.getPerformanceMetrics()
        };
      }
    });
    return analysis[0].result;
  }

  getBasicSEOData() {
    return {
      title: document.title,
      titleLength: document.title.length,
      metaDescription: document.querySelector('meta[name="description"]')?.content,
      metaKeywords: document.querySelector('meta[name="keywords"]')?.content,
      canonicalUrl: document.querySelector('link[rel="canonical"]')?.href,
      robotsTxt: document.querySelector('meta[name="robots"]')?.content
    };
  }

  getTechnicalSEOData() {
    return {
      headings: {
        h1: Array.from(document.getElementsByTagName('h1')).map(h => h.textContent),
        h2: Array.from(document.getElementsByTagName('h2')).map(h => h.textContent),
        h3: Array.from(document.getElementsByTagName('h3')).map(h => h.textContent)
      },
      images: Array.from(document.images).map(img => ({
        src: img.src,
        alt: img.alt,
        hasAlt: !!img.alt
      })),
      links: {
        internal: Array.from(document.links).filter(link => link.host === window.location.host).length,
        external: Array.from(document.links).filter(link => link.host !== window.location.host).length
      },
      structured: {
        hasSchema: document.querySelector('script[type="application/ld+json"]') !== null,
        openGraph: this.getOpenGraphData()
      }
    };
  }

  getContentAnalysis() {
    const textContent = document.body.innerText;
    const words = textContent.split(/\s+/).filter(word => word.length > 0);
    
    return {
      wordCount: words.length,
      keywordDensity: this.analyzeKeywordDensity(textContent),
      readabilityScore: this.calculateReadabilityScore(textContent),
      contentStructure: this.analyzeContentStructure()
    };
  }

  async getPerformanceMetrics() {
    const performance = window.performance;
    return {
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      firstPaint: performance.getEntriesByType('paint')[0]?.startTime,
      resourceCount: performance.getEntriesByType('resource').length
    };
  }

  // Helper methods
  analyzeKeywordDensity(text) {
    // Implementation for keyword density analysis
  }

  calculateReadabilityScore(text) {
    // Implementation for readability score calculation
  }

  analyzeContentStructure() {
    // Implementation for content structure analysis
  }

  getOpenGraphData() {
    // Implementation for Open Graph data extraction
  }
}

export default new SEOAnalyzer();

