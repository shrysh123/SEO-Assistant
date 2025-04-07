const config = {
  OPENAI_API_KEY: 'your-api-key-here',
  PAGESPEED_API_KEY: 'your-pagespeed-api-key',
  SEO_RULES: {
    titleLength: {
      min: 30,
      max: 60
    },
    descriptionLength: {
      min: 120,
      max: 160
    },
    maxHeadingDepth: 3,
    minWordsPerPage: 300,
    maxUrlLength: 75
  }
};

export default config;
