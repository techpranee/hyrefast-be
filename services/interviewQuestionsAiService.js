const { Ollama } = require("ollama");

class InterviewQuestionsAIService {
  constructor() {
    this.ollamaHost = process.env.AI_GENERATE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'gemma3:latest';
    
    this.client = new Ollama({ 
      host: this.ollamaHost 
    });
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
      
      const response = await this.client.generate({
        model: this.ollamaModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 1500,
          top_p: 0.9,
          repeat_penalty: 1.1,
        }
      });

      const generatedText = response.response || response.message?.content || '';
      
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
        error: error.message || 'Failed to generate interview questions'
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

  async checkHealth() {
    try {
      const testResponse = await this.client.generate({
        model: this.ollamaModel,
        prompt: "Generate one interview question for a Software Engineer position. Return as JSON: {\"text\": \"question\", \"timeLimit\": 120, \"allowRetry\": false, \"tags\": [\"Technical\"]}",
        stream: false,
        options: { num_predict: 150 }
      });

      return {
        status: 'healthy',
        model: this.ollamaModel,
        host: this.ollamaHost,
        responseTime: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        model: this.ollamaModel,
        host: this.ollamaHost,
        error: error.message
      };
    }
  }
}

module.exports = InterviewQuestionsAIService;
