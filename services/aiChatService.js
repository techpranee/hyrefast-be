const axios = require('axios');

class AIChatService {
  constructor() {
    this.aiGenerateUrl = process.env.AI_GENERATE_URL || 'https://ollama2.havenify.ai/api/generate';
  }

  /**
   * Generate AI analysis for interview responses
   * @param {Object} interviewData - Interview data to analyze
   * @returns {Promise<Object>} AI analysis result
   */
  async analyzeInterviewResponse(interviewData) {
    try {
      const { question, response, jobContext } = interviewData;
      
      const prompt = `
        Analyze this interview response for a ${jobContext.position || 'technical'} position:
        
        Question: "${question}"
        Response: "${response}"
        
        Provide analysis in the following format:
        {
          "overall_score": <score_0_to_100>,
          "technical_accuracy": <score_0_to_100>,
          "communication_clarity": <score_0_to_100>,
          "problem_solving": <score_0_to_100>,
          "relevance": <score_0_to_100>,
          "strengths": ["strength1", "strength2"],
          "areas_for_improvement": ["area1", "area2"],
          "detailed_feedback": "Detailed explanation of the response quality",
          "recommended_follow_up": "Suggested follow-up questions"
        }
      `;

      const response_ai = await axios.post(this.aiGenerateUrl, {
        model: 'llama3.1:8b',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1500
        }
      });

      const analysisText = response_ai.data.response || response_ai.data.text;
      let analysis;

      try {
        // Try to parse as JSON
        analysis = JSON.parse(analysisText);
      } catch (parseError) {
        // If JSON parsing fails, extract key information
        analysis = this.extractAnalysisFromText(analysisText);
      }

      return {
        success: true,
        analysis: analysis,
        rawResponse: analysisText,
        metadata: {
          model: 'llama3.1:8b',
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      return {
        success: false,
        error: error.message,
        analysis: null
      };
    }
  }

  /**
   * Generate job description using AI
   * @param {Object} jobData - Job requirements and details
   * @returns {Promise<Object>} Generated job description
   */
  async generateJobDescription(jobData) {
    try {
      const { title, skills, experience, company, benefits } = jobData;
      
      const prompt = `
        Generate a professional job description for:
        
        Position: ${title}
        Required Skills: ${skills ? skills.join(', ') : 'Not specified'}
        Experience Level: ${experience || 'Not specified'}
        Company: ${company || 'Our company'}
        Benefits: ${benefits ? benefits.join(', ') : 'Competitive package'}
        
        Create a comprehensive job description including:
        - Job title and summary
        - Key responsibilities
        - Required qualifications
        - Preferred qualifications
        - Benefits and compensation
        - Company culture information
        
        Format as a professional job posting.
      `;

      const response = await axios.post(this.aiGenerateUrl, {
        model: 'llama3.1:8b',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.8,
          top_p: 0.9,
          max_tokens: 2000
        }
      });

      const jobDescription = response.data.response || response.data.text;

      return {
        success: true,
        jobDescription: jobDescription.trim(),
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'llama3.1:8b'
        }
      };
    } catch (error) {
      console.error('Job description generation error:', error);
      return {
        success: false,
        error: error.message,
        jobDescription: null
      };
    }
  }

  /**
   * Multi-model analysis for comprehensive evaluation
   * @param {Object} sessionData - Complete interview session data
   * @returns {Promise<Object>} Comprehensive analysis
   */
  async multiModelAnalysis(sessionData) {
    try {
      const { responses, jobPosting, candidateInfo } = sessionData;
      const analyses = [];

      // Analyze each response
      for (const response of responses) {
        const analysis = await this.analyzeInterviewResponse({
          question: response.question,
          response: response.answer,
          jobContext: jobPosting
        });

        if (analysis.success) {
          analyses.push({
            questionId: response.id,
            question: response.question,
            analysis: analysis.analysis
          });
        }
      }

      // Calculate overall scores
      const overallScore = this.calculateOverallScore(analyses);
      const recommendation = this.generateRecommendation(overallScore, analyses);

      return {
        success: true,
        individualAnalyses: analyses,
        overallScore: overallScore,
        recommendation: recommendation,
        candidateProfile: {
          strengths: this.extractTopStrengths(analyses),
          improvementAreas: this.extractImprovementAreas(analyses),
          technicalRating: overallScore.technical_accuracy,
          communicationRating: overallScore.communication_clarity
        },
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Multi-model analysis error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract analysis from plain text when JSON parsing fails
   * @param {string} text - AI response text
   * @returns {Object} Extracted analysis
   */
  extractAnalysisFromText(text) {
    const defaultAnalysis = {
      overall_score: 70,
      technical_accuracy: 70,
      communication_clarity: 70,
      problem_solving: 70,
      relevance: 70,
      strengths: ['Response provided'],
      areas_for_improvement: ['Could be more detailed'],
      detailed_feedback: text,
      recommended_follow_up: 'Could you elaborate on your approach?'
    };

    // Try to extract scores using regex
    const scoreRegex = /(\w+).*?(\d+)/g;
    let match;
    
    while ((match = scoreRegex.exec(text)) !== null) {
      const field = match[1].toLowerCase();
      const score = parseInt(match[2]);
      
      if (field.includes('overall') || field.includes('total')) {
        defaultAnalysis.overall_score = score;
      } else if (field.includes('technical')) {
        defaultAnalysis.technical_accuracy = score;
      } else if (field.includes('communication')) {
        defaultAnalysis.communication_clarity = score;
      }
    }

    return defaultAnalysis;
  }

  /**
   * Calculate overall score from individual analyses
   * @param {Array} analyses - Array of individual response analyses
   * @returns {Object} Overall scores
   */
  calculateOverallScore(analyses) {
    if (analyses.length === 0) {
      return {
        overall_score: 0,
        technical_accuracy: 0,
        communication_clarity: 0,
        problem_solving: 0,
        relevance: 0
      };
    }

    const totals = analyses.reduce((acc, analysis) => {
      const scores = analysis.analysis;
      acc.overall_score += scores.overall_score || 0;
      acc.technical_accuracy += scores.technical_accuracy || 0;
      acc.communication_clarity += scores.communication_clarity || 0;
      acc.problem_solving += scores.problem_solving || 0;
      acc.relevance += scores.relevance || 0;
      return acc;
    }, {
      overall_score: 0,
      technical_accuracy: 0,
      communication_clarity: 0,
      problem_solving: 0,
      relevance: 0
    });

    const count = analyses.length;
    return {
      overall_score: Math.round(totals.overall_score / count),
      technical_accuracy: Math.round(totals.technical_accuracy / count),
      communication_clarity: Math.round(totals.communication_clarity / count),
      problem_solving: Math.round(totals.problem_solving / count),
      relevance: Math.round(totals.relevance / count)
    };
  }

  /**
   * Generate recommendation based on scores
   * @param {Object} overallScore - Overall scores
   * @param {Array} analyses - Individual analyses
   * @returns {string} Recommendation text
   */
  generateRecommendation(overallScore, analyses) {
    const score = overallScore.overall_score;
    
    if (score >= 85) {
      return 'Highly recommended candidate with excellent performance across all areas.';
    } else if (score >= 70) {
      return 'Good candidate with solid performance. Some areas may benefit from further development.';
    } else if (score >= 50) {
      return 'Average candidate. Consider for further rounds or additional training opportunities.';
    } else {
      return 'Below average performance. May not be suitable for this position at this time.';
    }
  }

  /**
   * Extract top strengths from analyses
   * @param {Array} analyses - Individual analyses
   * @returns {Array} Top strengths
   */
  extractTopStrengths(analyses) {
    const allStrengths = analyses.flatMap(a => a.analysis.strengths || []);
    const strengthCounts = {};
    
    allStrengths.forEach(strength => {
      strengthCounts[strength] = (strengthCounts[strength] || 0) + 1;
    });
    
    return Object.entries(strengthCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([strength]) => strength);
  }

  /**
   * Extract improvement areas from analyses
   * @param {Array} analyses - Individual analyses
   * @returns {Array} Improvement areas
   */
  extractImprovementAreas(analyses) {
    const allAreas = analyses.flatMap(a => a.analysis.areas_for_improvement || []);
    const areaCounts = {};
    
    allAreas.forEach(area => {
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    });
    
    return Object.entries(areaCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([area]) => area);
  }
}

module.exports = AIChatService;
