// services/jobDescriptionAIService.js
const { Ollama } = require("ollama");

class JobDescriptionAIService {
  constructor() {
    this.ollamaHost = process.env.AI_GENERATE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:latest';
    
    this.client = new Ollama({ 
      host: this.ollamaHost 
    });
  }

  generateJobDescriptionPrompt(jobTitle, context = {}) {
    const { location, employmentType, requirements } = context;
    
    let prompt = `Generate a professional job description for the position: "${jobTitle}"`;
    
    if (location || employmentType || requirements?.length) {
      prompt += '\n\nAdditional context:';
      if (location) prompt += `\n- Location: ${location}`;
      if (employmentType) prompt += `\n- Employment Type: ${employmentType}`;
      if (requirements?.length) prompt += `\n- Requirements mentioned: ${requirements.join(', ')}`;
    }
    
    prompt += `

Create a comprehensive job description that includes:
1. A brief company introduction (use generic professional language)
2. Job summary and key responsibilities
3. Required qualifications and skills
4. Preferred qualifications (if applicable)
5. Benefits and perks (standard professional benefits)

Guidelines:
- Write in a professional, engaging tone
- Use bullet points for responsibilities and requirements
- Keep it between 300-500 words
- Make it compelling to attract qualified candidates
- Use industry-standard terminology
- Include soft skills alongside technical requirements

Return only the job description text, no additional formatting or explanations.`;

    return prompt;
  }

  async generateJobDescription(jobTitle, context = {}) {
    try {
      if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
        throw new Error('Job title is required');
      }

      console.log(`Generating job description for: "${jobTitle}"`);
      
      const prompt = this.generateJobDescriptionPrompt(jobTitle, context);
      
      const response = await this.client.generate({
        model: this.ollamaModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7, // Slightly higher for creativity
          num_predict: 1000, // Longer response for detailed description
          top_p: 0.9,
          repeat_penalty: 1.1,
        }
      });

      const generatedDescription = response.response || response.message?.content || '';
      
      if (!generatedDescription.trim()) {
        throw new Error('Empty response from AI service');
      }

      // Clean up the description
      const cleanedDescription = this.cleanJobDescription(generatedDescription);
      
      return {
        success: true,
        data: {
          description: cleanedDescription,
          jobTitle: jobTitle,
          context: context,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Job description generation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate job description'
      };
    }
  }

  cleanJobDescription(description) {
    return description
      .trim()
      .replace(/^\s*Job Description:?\s*/i, '') // Remove "Job Description:" header
      .replace(/^\s*Position:?\s*/i, '') // Remove "Position:" header
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold formatting
      .replace(/\*(.*?)\*/g, '$1'); // Remove markdown italic formatting
  }
}

module.exports = JobDescriptionAIService;
