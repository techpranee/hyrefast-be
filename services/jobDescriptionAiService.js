// services/jobDescriptionAIService.js
const axios = require('axios');

class JobDescriptionAIService {
  constructor() {
    this.ollamaHost = process.env.AI_GENERATE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:latest';
    
    // Ensure we have the correct API endpoint
    if (!this.ollamaHost.includes('/api/generate')) {
      this.ollamaApiUrl = `${this.ollamaHost}/api/generate`;
    } else {
      this.ollamaApiUrl = this.ollamaHost;
    }
    
  
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

  async checkOllamaConnection() {
    try {
      // Test connection by listing models using axios
      const response = await axios.get(`${this.ollamaHost}/api/tags`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      return {
        connected: true,
        models: response.data.models?.map(m => m.name) || [],
        host: this.ollamaHost
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        host: this.ollamaHost
      };
    }
  }

  async generateWithOllama(prompt) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}: Generating job description with Ollama`);
        console.log(`Using API URL: ${this.ollamaApiUrl}`);
        
        const response = await axios.post(this.ollamaApiUrl, {
          model: this.ollamaModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7, // Slightly higher for creativity
            num_predict: 1000, // Longer response for detailed description
            top_p: 0.9,
            repeat_penalty: 1.1,
          }
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 120000
        });

        const generatedText = response.data.response || '';
        
        if (!generatedText) {
          throw new Error('Empty response from Ollama');
        }

        console.log('Job description generation successful');
        return generatedText;
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        // Don't retry on certain errors
        if (error.response?.status === 404) {
          throw new Error(`Ollama service not found at ${this.ollamaApiUrl}. Please ensure Ollama is running and accessible.`);
        }
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // All attempts failed
    console.error('All attempts failed. Last error:', lastError);
    
    if (lastError.code === 'ECONNABORTED') {
      throw new Error('Ollama request timeout - please check if Ollama is running and accessible');
    }
    if (lastError.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to Ollama at ${this.ollamaApiUrl} - is it running and accessible?`);
    }
    if (lastError.message?.includes('model')) {
      throw new Error(`Ollama model '${this.ollamaModel}' not found - please pull the model first using: ollama pull ${this.ollamaModel}`);
    }
    
    throw new Error(`Job description generation failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  async generateJobDescription(jobTitle, context = {}) {
    try {
      if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
        throw new Error('Job title is required');
      }

      console.log(`Generating job description for: "${jobTitle}"`);
      
      const prompt = this.generateJobDescriptionPrompt(jobTitle, context);
      
      // Generate description using Ollama
      const generatedDescription = await this.generateWithOllama(prompt);
      
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
        error: error.message || 'Failed to generate job description',
        details: {
          step: this.identifyFailureStep(error),
          suggestion: this.getSuggestion(error),
          ollamaInfo: {
            host: this.ollamaHost,
            apiUrl: this.ollamaApiUrl,
            model: this.ollamaModel
          }
        }
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

  identifyFailureStep(error) {
    if (error.message.includes('Job title is required')) {
      return 'input_validation';
    }
    if (error.message.includes('Ollama') || error.message.includes('connect') || error.message.includes('404')) {
      return 'ollama_connection';
    }
    if (error.message.includes('model')) {
      return 'model_availability';
    }
    if (error.message.includes('Empty response')) {
      return 'response_generation';
    }
    return 'unknown';
  }

  getSuggestion(error) {
    const step = this.identifyFailureStep(error);
    const suggestions = {
      'input_validation': 'Please provide a valid job title',
      'ollama_connection': `Ensure Ollama is running at ${this.ollamaHost}. Check service status.`,
      'model_availability': `Pull the required model using: ollama pull ${this.ollamaModel}`,
      'response_generation': 'The AI service returned an empty response. Try again or check the model availability.',
      'unknown': 'Please check the logs for more details'
    };
    
    return suggestions[step] || suggestions.unknown;
  }

  // Test connection method
  async testConnection() {
    try {
      console.log('Testing Ollama connection for job description service...');
      
      const response = await this.generateWithOllama("Generate a brief description for 'Software Engineer' position in one sentence.");
      
      console.log('Test response:', response.substring(0, 100));
      return { success: true, response: response.substring(0, 100) };
    } catch (error) {
      console.error('Connection test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Enhanced health check method
  async checkHealth() {
    try {
      console.log('Running health check for JobDescriptionAIService...');
      
      // Test 1: Connection check
      const connectionCheck = await this.checkOllamaConnection();
      
      if (!connectionCheck.connected) {
        return {
          status: 'unhealthy',
          model: this.ollamaModel,
          host: this.ollamaHost,
          apiUrl: this.ollamaApiUrl,
          error: connectionCheck.error,
          tests: {
            connection: 'failed',
            models: 'not_checked',
            generation: 'not_checked'
          }
        };
      }

      // Test 2: Simple generation test
      const testResult = await this.testConnection();
      
      return {
        status: testResult.success ? 'healthy' : 'unhealthy',
        model: this.ollamaModel,
        host: this.ollamaHost,
        apiUrl: this.ollamaApiUrl,
        availableModels: connectionCheck.models,
        testResponse: testResult.response,
        responseTime: Date.now(),
        tests: {
          connection: 'passed',
          models: 'passed',
          generation: testResult.success ? 'passed' : 'failed'
        },
        error: testResult.success ? null : testResult.error
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        model: this.ollamaModel,
        host: this.ollamaHost,
        apiUrl: this.ollamaApiUrl,
        error: error.message,
        suggestion: this.getSuggestion(error),
        tests: {
          connection: 'unknown',
          models: 'unknown',
          generation: 'failed'
        }
      };
    }
  }
}

module.exports = JobDescriptionAIService;
