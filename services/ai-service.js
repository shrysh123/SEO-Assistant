import config from '../config.js';

class AIService {
  async generateSEORecommendations(pageData) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{
            role: "system",
            content: "You are an SEO expert assistant. Analyze the provided webpage data and provide specific recommendations."
          }, {
            role: "user",
            content: JSON.stringify(pageData)
          }],
          temperature: 0.7
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }
}

export default new AIService();


