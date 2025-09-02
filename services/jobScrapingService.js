const axios = require('axios');
const extract = require('extract-zip');
const { Ollama } = require("ollama");

class JobScrapingService {
  constructor() {
    // Ollama configuration from environment or defaults
    this.ollamaHost = process.env.AI_GENERATE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:latest';
    
    // Initialize Ollama client with proper host
    try {
      this.client = new Ollama({ 
        host: this.ollamaHost 
      });
    } catch (error) {
      console.error('Failed to initialize Ollama client:', error);
      throw new Error('Ollama client initialization failed');
    }
  }

  async fetchWebpage(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 30000,
        maxContentLength: 10000000,
        maxRedirects: 5
      });

      if (response.status !== 200) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      return response.data;
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        throw new Error('Invalid URL or website not accessible');
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - website took too long to respond');
      }
      if (error.response?.status === 403) {
        throw new Error('Access forbidden - website blocked the request');
      }
      if (error.response?.status === 404) {
        throw new Error('Page not found');
      }
      throw new Error(`Failed to fetch webpage: ${error.message}`);
    }
  }

  generatePrompt(html) {
    return `You are an expert job posting data extraction AI. Extract structured job information from the provided HTML content.

HTML Content (first 5000 characters):
${html.substring(0, 5000)}

EXTRACTION RULES:
1. Extract only the main job posting content, ignore navigation, ads, and unrelated content
2. Clean up descriptions - remove HTML tags, extra whitespace, and formatting artifacts
3. Normalize employment types to standard options: full-time, part-time, contract, freelance, internship
4. Extract requirements as separate, meaningful items
5. If any field is not found or unclear, use null for that field
6. Return ONLY valid JSON, no additional text or explanations

Required JSON structure:
{
  "title": "Job title or null",
  "description": "Clean job description text or null",
  "location": "Job location or null", 
  "employment_type": "One of: full-time|part-time|contract|freelance|internship or null",
  "salary_range": "Salary information or null",
  "company_name": "Company name or null",
  "requirements": ["Requirement 1", "Requirement 2", "..."] or []
}

Focus on accuracy and completeness. Extract what you can confidently identify from the content.`;
  }

  async checkOllamaConnection() {
    try {
      // Test connection by listing models
      const models = await this.client.list();
      return {
        connected: true,
        models: models.models.map(m => m.name),
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

 async extractJobDataWithOllama(prompt) {
  try {
    console.log(`Connecting to Ollama at: ${this.ollamaHost}`);
    console.log(`Using model: ${this.ollamaModel}`);
    
    // Use direct axios call instead of Ollama client
    const response = await axios.post(`${this.ollamaHost}`, {
      model: this.ollamaModel,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 2000,
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
    console.log('Ollama response received',response);

    const generatedText = response.data.response || '';
    
    if (!generatedText) {
      throw new Error('Empty response from Ollama');
    }

   let extractedData = null;
      
      // Strategy 1: Try to find JSON block
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed JSON using regex match');
        } catch (parseError) {
          console.log('Failed to parse JSON from regex match:', parseError.message);
        }
      }

      // Strategy 2: Try to parse the entire response
      if (!extractedData) {
        try {
          extractedData = JSON.parse(generatedText);
          console.log('Successfully parsed entire response as JSON');
        } catch (parseError) {
          console.log('Failed to parse entire response as JSON:', parseError.message);
        }
      }

      // Strategy 3: Clean up response and try parsing
      if (!extractedData) {
        try {
          const cleanedResponse = generatedText
            .replace(/^[^{]*/, '') // Remove everything before first {
            .replace(/[^}]*$/, '') // Remove everything after last }
            .trim();
          
          if (cleanedResponse.startsWith('{') && cleanedResponse.endsWith('}')) {
            extractedData = JSON.parse(cleanedResponse);
            console.log('Successfully parsed cleaned response as JSON');
          }
        } catch (parseError) {
          console.log('Failed to parse cleaned response:', parseError.message);
        }
      }

      if (!extractedData) {
        console.error('Full Ollama response:', generatedText);
        throw new Error('Could not extract valid JSON from Ollama response');
      }

      return extractedData;
    
  } catch (error) {
    console.error('Ollama processing error:', error);
    throw error;
  }
}


  validateAndCleanData(extractedData) {
    if (!extractedData || typeof extractedData !== 'object') {
      return {
        title: null,
        description: null,
        location: null,
        employment_type: null,
        salary_range: null,
        company_name: null,
        requirements: []
      };
    }

    return {
      title: this.cleanString(extractedData.title) || null,
      description: this.cleanString(extractedData.description) || null,
      location: this.cleanString(extractedData.location) || null,
      employment_type: this.normalizeEmploymentType(extractedData.employment_type) || null,
      salary_range: this.cleanString(extractedData.salary_range) || null,
      company_name: this.cleanString(extractedData.company_name) || null,
      requirements: this.cleanRequirements(extractedData.requirements) || []
    };
  }

  cleanString(str) {
    if (!str || typeof str !== 'string') return null;
    return str.trim().replace(/\s+/g, ' ').replace(/^\"|\"$/g, '') || null;
  }

  normalizeEmploymentType(type) {
    if (!type || typeof type !== 'string') return null;
    
    const normalized = type.toLowerCase().trim();
    const typeMap = {
      'full-time': 'full-time',
      'full time': 'full-time',
      'fulltime': 'full-time',
      'permanent': 'full-time',
      'part-time': 'part-time',
      'part time': 'part-time',
      'parttime': 'part-time',
      'contract': 'contract',
      'contractor': 'contract',
      'freelance': 'freelance',
      'freelancer': 'freelance',
      'internship': 'internship',
      'intern': 'internship',
      'temporary': 'contract',
      'temp': 'contract'
    };

    return typeMap[normalized] || null;
  }

  cleanRequirements(requirements) {
    if (!Array.isArray(requirements)) return [];
    
    return requirements
      .map(req => this.cleanString(req))
      .filter(req => req && req.length > 2)
      .slice(0, 20);
  }

  async scrapeJobPosting(url) {
    try {
      // Step 1: Check Ollama connection first
    //   console.log('Checking Ollama connection...');
    //   const connectionCheck = await this.checkOllamaConnection();
    //   if (!connectionCheck.connected) {
    //     throw new Error(`Ollama is not running or not accessible: ${connectionCheck.error}`);
    //   }
    //   console.log(`Ollama connected successfully. Available models: ${connectionCheck.models.join(', ')}`);

      // Step 2: Fetch webpage content
      console.log(`Fetching webpage: ${url}`);
      const html = await this.fetchWebpage(url);

      if (!html || html.length < 100) {
        throw new Error('Retrieved webpage content is too short or empty');
      }
      console.log(`Webpage content fetched successfully. Length: ${html.length} characters`);

      // Step 3: Generate extraction prompt
      const prompt = this.generatePrompt(html);

      // Step 4: Extract data using Ollama
      console.log('Extracting job data with Ollama...');
      const extractedData = await this.extractJobDataWithOllama(prompt);

      console.log(extractedData,"extractedData")

      // Step 5: Validate and clean the data
      const cleanedData = this.validateAndCleanData(extractedData);
      
      console.log('Successfully extracted and cleaned job data:', cleanedData);
      
      return {
        success: true,
        data: cleanedData,
        extractedFields: this.getExtractedFieldsCount(cleanedData),
        processingTime: Date.now(),
        ollamaInfo: {
          host: this.ollamaHost,
          model: this.ollamaModel
        }
      };

    } catch (error) {
      console.error('Job scraping error:', error);
      return {
        success: false,
        error: error.message,
        details: {
          step: this.identifyFailureStep(error),
          suggestion: this.getSuggestion(error),
          ollamaInfo: {
            host: this.ollamaHost,
            model: this.ollamaModel
          }
        }
      };
    }
  }

  getExtractedFieldsCount(data) {
    let count = 0;
    if (data.title) count++;
    if (data.description) count++;
    if (data.location) count++;
    if (data.employment_type) count++;
    if (data.salary_range) count++;
    if (data.company_name) count++;
    if (data.requirements?.length > 0) count++;
    
    return {
      total: count,
      available: 7,
      percentage: Math.round((count / 7) * 100)
    };
  }

  identifyFailureStep(error) {
    if (error.message.includes('fetch') || error.message.includes('ENOTFOUND')) {
      return 'webpage_fetch';
    }
    if (error.message.includes('Ollama') || error.message.includes('connect') || error.message.includes('404')) {
      return 'ollama_connection';
    }
    if (error.message.includes('model')) {
      return 'model_availability';
    }
    if (error.message.includes('JSON') || error.message.includes('parse')) {
      return 'data_extraction';
    }
    return 'unknown';
  }

  getSuggestion(error) {
    const step = this.identifyFailureStep(error);
    const suggestions = {
      'webpage_fetch': 'Check if the URL is accessible and not behind authentication',
      'ollama_connection': `Ensure Ollama is running at ${this.ollamaHost}. Run 'ollama serve' to start it.`,
      'model_availability': `Pull the required model using: ollama pull ${this.ollamaModel}`,
      'data_extraction': 'The webpage might not contain structured job data',
      'unknown': 'Please check the logs for more details'
    };
    
    return suggestions[step] || suggestions.unknown;
  }

  // Health check method
  async checkHealth() {
    try {
      const connectionCheck = await this.checkOllamaConnection();
      
      if (!connectionCheck.connected) {
        return {
          status: 'unhealthy',
          model: this.ollamaModel,
          host: this.ollamaHost,
          error: connectionCheck.error,
          suggestion: 'Start Ollama service using: ollama serve'
        };
      }

      // Test with simple prompt
      const testResponse = await this.client.generate({
        model: this.ollamaModel,
        prompt: "Return only this JSON: {\"test\": \"success\"}",
        stream: false,
        options: { num_predict: 50 }
      });

      return {
        status: 'healthy',
        model: this.ollamaModel,
        host: this.ollamaHost,
        availableModels: connectionCheck.models,
        testResponse: testResponse.response?.substring(0, 100),
        responseTime: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        model: this.ollamaModel,
        host: this.ollamaHost,
        error: error.message,
        suggestion: this.getSuggestion(error)
      };
    }
  }
}

module.exports = JobScrapingService;
