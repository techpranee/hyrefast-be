// services/interviewQuestionsAIService.js
const axios = require('axios');

class InterviewQuestionsAIService {
  constructor() {
    this.ollamaHost = process.env.AI_GENERATE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:latest';
    
    // Ensure we have the correct API endpoint
    if (!this.ollamaHost.includes('/api/generate')) {
      this.ollamaApiUrl = `${this.ollamaHost}/api/generate`;
    } else {
      this.ollamaApiUrl = this.ollamaHost;
    }
    
    console.log('=== INTERVIEW QUESTIONS AI CONFIGURATION ===');
    console.log('Host:', this.ollamaHost);
    console.log('API URL:', this.ollamaApiUrl);
    console.log('Model:', this.ollamaModel);
    console.log('=============================================');
  }

  generateInterviewQuestionsPrompt(jobTitle, jobDescription, employmentType, requirements) {
    let prompt = `Generate professional interview questions for the position: "${jobTitle}"`;
    
    if (jobDescription) {
      prompt += `\n\nJob Description: ${jobDescription}`;
    }
    
    if (employmentType) {
      prompt += `\nEmployment Type: ${employmentType}`;
    }
    
    if (requirements && requirements.length > 0) {
      prompt += `\nKey Requirements: ${requirements.join(', ')}`;
    }
    
    prompt += `

Generate exactly 5 diverse interview questions that cover:
1. Introduction/Background questions
2. Technical/Role-specific questions
3. Behavioral questions
4. Problem-solving questions
5. Company/Role fit questions

For each question, provide:
- Question text (clear and professional)
- Recommended time limit (60-180 seconds)
- Whether retry should be allowed (true/false)
- Appropriate tags from: Introduction, Background, Technical, Problem Solving, Behavioral

Return the response as a valid JSON array in this exact format:
[
  {
    "text": "Question text here",
    "timeLimit": 120,
    "allowRetry": false,
    "tags": ["Introduction", "Background"]
  }
]

Requirements:
- Each question should be unique and relevant to the job
- Mix different question types and difficulty levels
- Use professional, clear language
- Ensure time limits are reasonable (60-180 seconds)
- Assign appropriate tags to each question
- Return ONLY the JSON array, no additional text`;

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
        console.log(`Attempt ${attempt}/${maxRetries}: Generating interview questions with Ollama`);
        console.log(`Using API URL: ${this.ollamaApiUrl}`);
        
        const response = await axios.post(this.ollamaApiUrl, {
          model: this.ollamaModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 1500,
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

        console.log('Interview questions generation successful');
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
    
    throw new Error(`Interview questions generation failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  async generateInterviewQuestions(jobTitle, jobDescription = '', employmentType = '', requirements = []) {
    try {
      if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
        throw new Error('Job title is required');
      }

      console.log(`Generating interview questions for: "${jobTitle}"`);
      
      const prompt = this.generateInterviewQuestionsPrompt(
        jobTitle.trim(), 
        jobDescription?.trim(), 
        employmentType?.trim(), 
        requirements || []
      );
      
      const generatedText = await this.generateWithOllama(prompt);
      
      if (!generatedText.trim()) {
        throw new Error('Empty response from AI service');
      }

      console.log('Raw AI response:', generatedText);

      // Extract and parse JSON from response
      const questions = this.parseQuestionsFromResponse(generatedText);
      
      return {
        success: true,
        data: {
          questions: questions,
          context: {
            jobTitle,
            jobDescription,
            employmentType,
            requirements
          },
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Interview questions generation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate interview questions',
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

  parseQuestionsFromResponse(responseText) {
    try {
      // Try to find JSON array in the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questionsData = JSON.parse(jsonMatch[0]);
        if (Array.isArray(questionsData) && questionsData.length > 0) {
          return this.validateAndCleanQuestions(questionsData);
        }
      }

      // Try parsing the entire response
      const questionsData = JSON.parse(responseText);
      if (Array.isArray(questionsData) && questionsData.length > 0) {
        return this.validateAndCleanQuestions(questionsData);
      }

      throw new Error('No valid questions array found in response');
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      
      // Fallback to generating default questions
      return this.generateFallbackQuestions();
    }
  }

  validateAndCleanQuestions(questionsData) {
    const validTags = ['Introduction', 'Background', 'Technical', 'Problem Solving', 'Behavioral'];
    
    return questionsData
      .filter(q => q && q.text && typeof q.text === 'string' && q.text.trim())
      .map(question => ({
        text: question.text.trim(),
        timeLimit: this.validateTimeLimit(question.timeLimit),
        allowRetry: Boolean(question.allowRetry),
        tags: this.validateTags(question.tags || [], validTags)
      }))
      .slice(0, 5); // Limit to 5 questions
  }

  validateTimeLimit(timeLimit) {
    const time = parseInt(timeLimit);
    if (isNaN(time) || time < 30) return 120;
    if (time > 300) return 300;
    return time;
  }

  validateTags(tags, validTags) {
    if (!Array.isArray(tags)) return ['Background'];
    
    const filtered = tags.filter(tag => 
      typeof tag === 'string' && validTags.includes(tag)
    );
    
    return filtered.length > 0 ? filtered : ['Background'];
  }

  generateFallbackQuestions() {
    return [
      {
        text: "Tell me about yourself and your professional background.",
        timeLimit: 120,
        allowRetry: false,
        tags: ['Introduction', 'Background']
      },
      {
        text: "What interests you most about this role and why do you think you'd be a good fit?",
        timeLimit: 90,
        allowRetry: false,
        tags: ['Behavioral']
      },
      {
        text: "Describe a challenging project you worked on. What was your approach and what was the outcome?",
        timeLimit: 180,
        allowRetry: true,
        tags: ['Problem Solving', 'Technical']
      },
      {
        text: "How do you stay current with industry trends and continue learning in your field?",
        timeLimit: 120,
        allowRetry: false,
        tags: ['Background', 'Technical']
      },
      {
        text: "Where do you see yourself in your career in the next few years?",
        timeLimit: 90,
        allowRetry: false,
        tags: ['Behavioral']
      }
    ];
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
    if (error.message.includes('parse') || error.message.includes('JSON')) {
      return 'json_parsing';
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
      'json_parsing': 'AI response could not be parsed as JSON. Using fallback questions.',
      'unknown': 'Please check the logs for more details'
    };
    
    return suggestions[step] || suggestions.unknown;
  }

  // Test connection method
  async testConnection() {
    try {
      console.log('Testing Ollama connection for interview questions service...');
      
      const response = await this.generateWithOllama('Generate one interview question for a Software Engineer position. Return as JSON: [{"text": "question", "timeLimit": 120, "allowRetry": false, "tags": ["Technical"]}]');
      
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
      console.log('Running health check for InterviewQuestionsAIService...');
      
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

module.exports = InterviewQuestionsAIService;
